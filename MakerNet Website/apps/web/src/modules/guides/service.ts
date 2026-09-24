import "server-only";
import { pool, one, transaction, type DatabaseClient } from "@/modules/db";
import {
  canReadAll,
  isEligible,
  type AccessRule,
  type Audience,
  type Principal,
} from "@/modules/identity/policy";
import { rebuildSkillProjection } from "@/modules/profiles/service";
import {
  emptyGuideContent,
  parseGuideContent,
  type GuideContent,
  type GuideType,
} from "./content";

export type GuideScope =
  | "manage_contributors"
  | "publish_revisions"
  | "change_visibility"
  | "archive"
  | "manage_maintainers";
export type GuideVisibility = Exclude<Audience, "public">;
export const allGuideScopes: GuideScope[] = [
  "manage_contributors",
  "publish_revisions",
  "change_visibility",
  "archive",
  "manage_maintainers",
];

type GuideRow = {
  id: string;
  creator_id: string;
  owner_type: string;
  owner_person_id: string | null;
  owner_organization_id: string | null;
  guide_type: GuideType;
  visibility: GuideVisibility;
  audience_organization_id: string | null;
  status: "active" | "archived" | "removed";
  current_revision_id: string | null;
  effective_revision_id: string | null;
  lock_version: number;
};
type DraftRow = {
  id: string;
  guide_id: string;
  base_revision_id: string | null;
  content: GuideContent;
  lock_version: number;
  status: "draft" | "ready" | "published" | "abandoned";
};
type RevisionRow = {
  id: string;
  guide_id: string;
  version: number;
  content: GuideContent;
  visibility: GuideVisibility;
  audience_organization_id: string | null;
  publication_status: string;
  safety_status: string;
  published_at: Date;
};

function active(actor: Principal | null): asserts actor is Principal {
  if (!isEligible(actor)) throw new Error("Forbidden");
}

async function guideById(
  db: DatabaseClient,
  id: string,
  lock = false,
): Promise<GuideRow> {
  const guide = await one<GuideRow>(
    db,
    `SELECT * FROM makernet.guide WHERE id = $1 ${lock ? "FOR UPDATE" : ""}`,
    [id],
  );
  if (!guide) throw new Error("Guide not found");
  return guide;
}

async function requireScope(
  db: DatabaseClient,
  actor: Principal | null,
  guideId: string,
  scope: GuideScope,
): Promise<void> {
  active(actor);
  const maintainer = await one<{ scopes: GuideScope[] }>(
    db,
    `SELECT scopes FROM makernet.guide_maintainer
    WHERE guide_id = $1 AND person_id = $2 AND status = 'active'`,
    [guideId, actor.id],
  );
  if (!maintainer?.scopes.includes(scope)) throw new Error("Forbidden");
}

async function audit(
  db: DatabaseClient,
  actorId: string,
  action: string,
  guideId: string,
  reason: string,
) {
  await db.query(
    `INSERT INTO makernet.audit_event(actor_id, action, target_type, target_id, scope, reason)
    VALUES ($1, $2, 'guide', $3, 'college', $4)`,
    [actorId, action, guideId, reason],
  );
}

function validateVisibility(
  actor: Principal,
  visibility: GuideVisibility,
  organizationId: string | null,
) {
  if (!["college", "organization", "private"].includes(visibility))
    throw new Error("Invalid guide visibility");
  if (
    visibility === "organization" &&
    (!organizationId || !actor.organizations.has(organizationId))
  )
    throw new Error("Current organization membership required");
  if (visibility !== "organization" && organizationId)
    throw new Error("Unexpected organization scope");
}

export async function createGuide(
  actor: Principal | null,
  type: GuideType,
  visibility: GuideVisibility,
  organizationId: string | null,
): Promise<{ guideId: string; draftId: string }> {
  active(actor);
  if (!["how_to", "build_log", "reference"].includes(type))
    throw new Error("Invalid guide type");
  validateVisibility(actor, visibility, organizationId);
  return transaction(async (db) => {
    const guide = await one<{ id: string }>(
      db,
      `INSERT INTO makernet.guide
      (creator_id, owner_type, owner_person_id, guide_type, visibility, audience_organization_id)
      VALUES ($1, 'person', $1, $2, $3, $4) RETURNING id`,
      [actor.id, type, visibility, organizationId],
    );
    await db.query(
      `INSERT INTO makernet.guide_maintainer
      (guide_id, person_id, scopes, is_owner, granted_by)
      VALUES ($1, $2, $3, true, $2)`,
      [guide!.id, actor.id, allGuideScopes],
    );
    const draft = await one<{ id: string }>(
      db,
      `INSERT INTO makernet.guide_draft
      (guide_id, content, updated_by) VALUES ($1, $2, $3) RETURNING id`,
      [guide!.id, emptyGuideContent, actor.id],
    );
    await db.query(
      `INSERT INTO makernet.draft_contribution
      (draft_id, person_id, role, contribution_note, credit_order, invitation_status,
       accepted_audience, accepted_organization_id, responded_at)
      VALUES ($1, $2, 'lead_author', 'Created the guide', 1, 'accepted', $3, $4, now())`,
      [draft!.id, actor.id, visibility, organizationId],
    );
    await audit(
      db,
      actor.id,
      "guide_create",
      guide!.id,
      "Member started text guide",
    );
    return { guideId: guide!.id, draftId: draft!.id };
  });
}

export async function getDraft(actor: Principal | null, draftId: string) {
  active(actor);
  const db = pool();
  const draft = await one<DraftRow>(
    db,
    `SELECT * FROM makernet.guide_draft WHERE id = $1`,
    [draftId],
  );
  if (!draft) return null;
  await requireScope(db, actor, draft.guide_id, "publish_revisions");
  const guide = await guideById(db, draft.guide_id);
  const contributions = await db.query<{
    id: string;
    person_id: string;
    display_name: string;
    role: string;
    contribution_note: string;
    credit_order: number;
    invitation_status: string;
    accepted_audience: string;
  }>(
    `SELECT c.id, c.person_id, p.display_name, c.role, c.contribution_note,
      c.credit_order, c.invitation_status, c.accepted_audience
    FROM makernet.draft_contribution c JOIN makernet.person p ON p.id = c.person_id
    WHERE c.draft_id = $1 ORDER BY c.credit_order`,
    [draftId],
  );
  return { ...draft, guide, contributions: contributions.rows };
}

export async function saveDraft(
  actor: Principal | null,
  draftId: string,
  contentInput: unknown,
  expectedLockVersion: number,
): Promise<number> {
  active(actor);
  const content = parseGuideContent(contentInput);
  return transaction(async (db) => {
    const draft = await one<DraftRow>(
      db,
      `SELECT * FROM makernet.guide_draft WHERE id = $1 FOR UPDATE`,
      [draftId],
    );
    if (!draft || !["draft", "ready"].includes(draft.status))
      throw new Error("Draft not editable");
    await requireScope(db, actor, draft.guide_id, "publish_revisions");
    if (draft.lock_version !== expectedLockVersion)
      throw new Error("Draft changed; reload before saving");
    const updated = await one<{ lock_version: number }>(
      db,
      `UPDATE makernet.guide_draft
      SET content = $2, lock_version = lock_version + 1, updated_at = now(), updated_by = $3,
          status = 'draft' WHERE id = $1 RETURNING lock_version`,
      [draftId, content, actor.id],
    );
    return updated!.lock_version;
  });
}

export async function listMyGuides(actor: Principal | null) {
  active(actor);
  const result = await pool().query<{
    guide_id: string;
    draft_id: string | null;
    title: string;
    status: string;
    version: number | null;
  }>(
    `SELECT g.id AS guide_id, d.id AS draft_id,
      COALESCE(d.content->>'title', r.content->>'title', 'Untitled guide') AS title,
      g.status, r.version
    FROM makernet.guide g JOIN makernet.guide_maintainer m ON m.guide_id = g.id
    LEFT JOIN makernet.guide_draft d ON d.guide_id = g.id AND d.status IN ('draft', 'ready')
    LEFT JOIN makernet.guide_revision r ON r.id = g.current_revision_id
    WHERE m.person_id = $1 AND m.status = 'active' ORDER BY g.updated_at DESC`,
    [actor.id],
  );
  return result.rows;
}

export async function startRevisionDraft(
  actor: Principal | null,
  guideId: string,
): Promise<string> {
  active(actor);
  return transaction(async (db) => {
    const guide = await guideById(db, guideId, true);
    await requireScope(db, actor, guideId, "publish_revisions");
    if (guide.status !== "active" || !guide.current_revision_id)
      throw new Error("No published revision");
    const revision = await one<RevisionRow>(
      db,
      `SELECT * FROM makernet.guide_revision WHERE id = $1`,
      [guide.current_revision_id],
    );
    const draft = await one<{ id: string }>(
      db,
      `INSERT INTO makernet.guide_draft
      (guide_id, base_revision_id, content, updated_by) VALUES ($1, $2, $3, $4) RETURNING id`,
      [guideId, revision!.id, revision!.content, actor.id],
    );
    await db.query(
      `INSERT INTO makernet.draft_contribution
      (draft_id, person_id, role, contribution_note, credit_order, invitation_status,
       accepted_audience, accepted_organization_id, responded_at)
      VALUES ($1, $2, 'lead_author', 'Edited this revision', 1, 'accepted', $3, $4, now())`,
      [draft!.id, actor.id, guide.visibility, guide.audience_organization_id],
    );
    return draft!.id;
  });
}

export async function inviteContributor(
  actor: Principal | null,
  draftId: string,
  email: string,
  role: string,
  note: string,
  order: number,
): Promise<string> {
  active(actor);
  if (
    !["lead_author", "author", "contributor"].includes(role) ||
    note.length > 1000 ||
    !Number.isInteger(order) ||
    order < 2
  )
    throw new Error("Invalid contribution details");
  return transaction(async (db) => {
    const draft = await one<DraftRow>(
      db,
      `SELECT * FROM makernet.guide_draft WHERE id = $1 FOR UPDATE`,
      [draftId],
    );
    if (!draft || !["draft", "ready"].includes(draft.status))
      throw new Error("Draft unavailable");
    await requireScope(db, actor, draft.guide_id, "manage_contributors");
    const people = await db.query<{ id: string }>(
      `SELECT id FROM makernet.person
      WHERE lower(institution_email) = lower($1) AND state = 'active'
      AND (eligibility_ends_at IS NULL OR eligibility_ends_at > now())`,
      [email.trim()],
    );
    if (people.rowCount !== 1)
      throw new Error("Contributor account unavailable or ambiguous");
    const person = people.rows[0];
    const invitation = await one<{ id: string }>(
      db,
      `INSERT INTO makernet.draft_contribution
      (draft_id, person_id, role, contribution_note, credit_order)
      VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [draftId, person.id, role, note.trim(), order],
    );
    await audit(
      db,
      actor.id,
      "contributor_invite",
      draft.guide_id,
      "Contributor invited",
    );
    return invitation!.id;
  });
}

export async function addEvidenceCandidate(
  actor: Principal | null,
  contributionId: string,
  skillId: string,
): Promise<void> {
  active(actor);
  await transaction(async (db) => {
    const row = await one<{
      draft_id: string;
      guide_id: string;
      content: GuideContent;
    }>(
      db,
      `
      SELECT c.draft_id, d.guide_id, d.content FROM makernet.draft_contribution c
      JOIN makernet.guide_draft d ON d.id = c.draft_id WHERE c.id = $1 FOR UPDATE OF d`,
      [contributionId],
    );
    if (!row) throw new Error("Contribution not found");
    await requireScope(db, actor, row.guide_id, "manage_contributors");
    if (!row.content.skills.some((skill) => skill.id === skillId))
      throw new Error("Evidence skill must be linked to draft");
    const skill = await one<{ id: string }>(
      db,
      `SELECT id FROM makernet.skill WHERE id = $1 AND status = 'active'`,
      [skillId],
    );
    if (!skill) throw new Error("Skill not active");
    await db.query(
      `INSERT INTO makernet.draft_evidence_candidate(contribution_id, skill_id)
      VALUES ($1, $2)`,
      [contributionId, skillId],
    );
  });
}

export async function myInvitations(actor: Principal | null) {
  active(actor);
  const result = await pool().query<{
    id: string;
    draft_id: string;
    guide_id: string;
    title: string;
    role: string;
    contribution_note: string;
    invitation_status: string;
  }>(
    `
    SELECT c.id, c.draft_id, d.guide_id, COALESCE(d.content->>'title', 'Untitled guide') AS title,
      c.role, c.contribution_note, c.invitation_status
    FROM makernet.draft_contribution c JOIN makernet.guide_draft d ON d.id = c.draft_id
    WHERE c.person_id = $1 AND (c.invitation_status = 'pending' OR
      (c.invitation_status = 'accepted' AND EXISTS
        (SELECT 1 FROM makernet.draft_evidence_candidate e
         WHERE e.contribution_id = c.id AND e.status = 'pending')))
      AND d.status IN ('draft', 'ready') ORDER BY d.updated_at DESC`,
    [actor.id],
  );
  return result.rows;
}

export async function invitationDetail(
  actor: Principal | null,
  contributionId: string,
) {
  active(actor);
  const contribution = await one<{
    id: string;
    draft_id: string;
    person_id: string;
    role: string;
    contribution_note: string;
    invitation_status: string;
    accepted_audience: string | null;
    public_byline: string;
  }>(
    pool(),
    `
    SELECT * FROM makernet.draft_contribution WHERE id = $1 AND person_id = $2`,
    [contributionId, actor.id],
  );
  if (!contribution) return null;
  const candidates = await pool().query<{
    id: string;
    skill_id: string;
    skill_name: string;
    status: string;
  }>(
    `
    SELECT e.id, e.skill_id, s.name AS skill_name, e.status FROM makernet.draft_evidence_candidate e
    JOIN makernet.skill s ON s.id = e.skill_id WHERE e.contribution_id = $1 ORDER BY s.name`,
    [contributionId],
  );
  return { ...contribution, candidates: candidates.rows };
}

export async function respondInvitation(
  actor: Principal | null,
  contributionId: string,
  accept: boolean,
  audience: GuideVisibility,
  organizationId: string | null,
  byline: string,
): Promise<void> {
  active(actor);
  if (accept) validateVisibility(actor, audience, organizationId);
  if (byline.trim().length < 2 || byline.trim().length > 100)
    throw new Error("Invalid byline");
  await transaction(async (db) => {
    const row = await one<{ id: string; draft_id: string; guide_id: string }>(
      db,
      `
      SELECT c.id, c.draft_id, d.guide_id FROM makernet.draft_contribution c
      JOIN makernet.guide_draft d ON d.id = c.draft_id
      WHERE c.id = $1 AND c.person_id = $2 AND c.invitation_status = 'pending'
        AND d.status IN ('draft', 'ready') FOR UPDATE OF c`,
      [contributionId, actor.id],
    );
    if (!row) throw new Error("Invitation unavailable");
    await db.query(
      `UPDATE makernet.draft_contribution SET invitation_status = $2,
      accepted_audience = $3, accepted_organization_id = $4, public_byline = $5, responded_at = now()
      WHERE id = $1`,
      [
        contributionId,
        accept ? "accepted" : "declined",
        accept ? audience : null,
        accept ? organizationId : null,
        byline.trim(),
      ],
    );
    await audit(
      db,
      actor.id,
      accept ? "credit_accept" : "credit_decline",
      row.guide_id,
      "Contributor responded to revision credit",
    );
  });
}

export async function respondEvidence(
  actor: Principal | null,
  candidateId: string,
  accept: boolean,
): Promise<void> {
  active(actor);
  await transaction(async (db) => {
    const row = await one<{ id: string }>(
      db,
      `UPDATE makernet.draft_evidence_candidate e
      SET status = $3, responded_at = now()
      FROM makernet.draft_contribution c JOIN makernet.guide_draft d ON d.id = c.draft_id
      WHERE e.id = $1 AND e.contribution_id = c.id AND c.person_id = $2
        AND c.invitation_status = 'accepted' AND e.status = 'pending'
        AND d.status IN ('draft', 'ready') RETURNING e.id`,
      [candidateId, actor.id, accept ? "accepted" : "rejected"],
    );
    if (!row) throw new Error("Evidence candidate unavailable");
  });
}

export async function publishGuide(
  actor: Principal | null,
  draftId: string,
  expectedLockVersion: number,
  changelog: string,
): Promise<{ guideId: string; revisionId: string; version: number }> {
  active(actor);
  if (changelog.length > 1000) throw new Error("Changelog too long");
  return transaction(async (db) => {
    const draft = await one<DraftRow>(
      db,
      `SELECT * FROM makernet.guide_draft WHERE id = $1 FOR UPDATE`,
      [draftId],
    );
    if (!draft || !["draft", "ready"].includes(draft.status))
      throw new Error("Draft unavailable");
    const guide = await guideById(db, draft.guide_id, true);
    await requireScope(db, actor, guide.id, "publish_revisions");
    if (
      guide.status !== "active" ||
      guide.current_revision_id !== draft.base_revision_id ||
      draft.lock_version !== expectedLockVersion
    )
      throw new Error("Stale publication; reload the draft");
    const content = parseGuideContent(draft.content, true);
    const skillIds = [...new Set(content.skills.map((skill) => skill.id))];
    if (skillIds.length) {
      const skills = await db.query<{ id: string; name: string }>(
        `SELECT id, name FROM makernet.skill
        WHERE id = ANY($1::uuid[]) AND status = 'active'`,
        [skillIds],
      );
      if (skills.rowCount !== skillIds.length)
        throw new Error("Guide uses an inactive skill");
      if (
        skills.rows.some((skill) =>
          /\b(welding|laser cutting|cnc milling)\b/i.test(skill.name),
        )
      )
        throw new Error(
          "Hazardous skills cannot publish during internal alpha",
        );
    }
    const contributions = await db.query<{
      id: string;
      person_id: string;
      role: string;
      contribution_note: string;
      credit_order: number;
      invitation_status: string;
      accepted_audience: GuideVisibility | null;
      accepted_organization_id: string | null;
      public_byline: string;
      responded_at: Date | null;
      state: string;
      eligibility_ends_at: Date | null;
    }>(
      `
      SELECT c.*, p.state, p.eligibility_ends_at FROM makernet.draft_contribution c
      JOIN makernet.person p ON p.id = c.person_id WHERE c.draft_id = $1 ORDER BY c.credit_order`,
      [draftId],
    );
    if (contributions.rows.some((c) => c.invitation_status === "pending"))
      throw new Error("Resolve every invitation before publication");
    const accepted = contributions.rows.filter(
      (c) => c.invitation_status === "accepted",
    );
    if (
      !accepted.length ||
      accepted.some(
        (c) =>
          c.state !== "active" ||
          (c.eligibility_ends_at && c.eligibility_ends_at <= new Date()) ||
          !c.accepted_audience,
      )
    )
      throw new Error("Accepted contributors must remain eligible");
    if (
      accepted.some(
        (c) =>
          c.accepted_audience === "organization" &&
          c.accepted_organization_id !== guide.audience_organization_id &&
          guide.visibility === "organization",
      )
    )
      throw new Error("Contributor audience conflicts with guide organization");
    const prior = guide.current_revision_id
      ? await one<{ version: number }>(
          db,
          `SELECT version FROM makernet.guide_revision WHERE id = $1`,
          [guide.current_revision_id],
        )
      : null;
    const priorEvidencePeople = guide.current_revision_id
      ? await db.query<{ person_id: string }>(
          `
      SELECT DISTINCT e.person_id FROM makernet.skill_evidence e
      JOIN makernet.guide_revision_authorship a ON a.id = e.revision_authorship_id
      WHERE a.revision_id = $1 AND e.status = 'active'`,
          [guide.current_revision_id],
        )
      : null;
    const version = (prior?.version ?? 0) + 1;
    if (guide.current_revision_id)
      await db.query(
        `UPDATE makernet.guide_revision SET publication_status = 'superseded'
      WHERE id = $1 AND publication_status = 'current'`,
        [guide.current_revision_id],
      );
    const revision = await one<{ id: string }>(
      db,
      `INSERT INTO makernet.guide_revision
      (guide_id, version, content, changelog, editor_id, visibility, audience_organization_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [
        guide.id,
        version,
        content,
        changelog.trim(),
        actor.id,
        guide.visibility,
        guide.audience_organization_id,
      ],
    );
    const contributorIds: string[] = [];
    for (const contribution of accepted) {
      const credit = await one<{ id: string }>(
        db,
        `INSERT INTO makernet.guide_revision_authorship
        (revision_id, person_id, role, contribution_note, credit_order,
         accepted_audience, accepted_organization_id, public_byline, accepted_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
        [
          revision!.id,
          contribution.person_id,
          contribution.role,
          contribution.contribution_note,
          contribution.credit_order,
          contribution.accepted_audience,
          contribution.accepted_organization_id,
          contribution.public_byline,
          contribution.responded_at,
        ],
      );
      contributorIds.push(contribution.person_id);
      const candidates = await db.query<{ skill_id: string }>(
        `SELECT skill_id FROM makernet.draft_evidence_candidate
        WHERE contribution_id = $1 AND status = 'accepted'`,
        [contribution.id],
      );
      for (const candidate of candidates.rows) {
        if (!skillIds.includes(candidate.skill_id)) continue;
        await db.query(
          `INSERT INTO makernet.skill_evidence
          (person_id, skill_id, revision_authorship_id, accepted_at, audience, audience_organization_id)
          VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            contribution.person_id,
            candidate.skill_id,
            credit!.id,
            contribution.responded_at,
            contribution.accepted_audience,
            contribution.accepted_organization_id,
          ],
        );
      }
    }
    for (const skill of content.skills)
      await db.query(
        `INSERT INTO makernet.guide_skill
      (revision_id, skill_id, relationship) VALUES ($1, $2, $3)`,
        [revision!.id, skill.id, skill.relationship],
      );
    await db.query(
      `UPDATE makernet.guide SET current_revision_id = $2, effective_revision_id = $2,
      lock_version = lock_version + 1, updated_at = now() WHERE id = $1`,
      [guide.id, revision!.id],
    );
    await db.query(
      `UPDATE makernet.guide_draft SET status = 'published', updated_at = now() WHERE id = $1`,
      [draftId],
    );
    await db.query(
      `UPDATE makernet.guide_edit_proposal SET status = 'stale'
      WHERE guide_id = $1 AND status = 'pending' AND base_revision_id <> $2`,
      [guide.id, revision!.id],
    );
    for (const id of new Set([
      ...contributorIds,
      ...(priorEvidencePeople?.rows.map((row) => row.person_id) ?? []),
    ]))
      await rebuildSkillProjection(db, id);
    await db.query(
      `INSERT INTO makernet.outbox_event
      (aggregate_type, aggregate_id, aggregate_version, event_type, payload)
      VALUES ('guide', $1, $2, 'guide.published', $3)`,
      [guide.id, version, { revisionId: revision!.id }],
    );
    await audit(
      db,
      actor.id,
      "guide_publish",
      guide.id,
      `Published revision ${version}`,
    );
    return { guideId: guide.id, revisionId: revision!.id, version };
  });
}

async function visibleGuide(
  db: DatabaseClient,
  viewer: Principal | null,
  guide: GuideRow,
  revision: RevisionRow | null,
): Promise<boolean> {
  if (
    !isEligible(viewer) ||
    guide.status === "removed" ||
    !revision ||
    revision.publication_status === "withdrawn" ||
    revision.safety_status === "quarantined"
  )
    return false;
  const accepted = await db.query<{ person_id: string }>(
    `
    SELECT person_id FROM makernet.guide_maintainer WHERE guide_id = $1 AND status = 'active'
    UNION SELECT c.person_id FROM makernet.draft_contribution c
      JOIN makernet.guide_draft d ON d.id = c.draft_id
      WHERE d.guide_id = $1 AND c.invitation_status IN ('accepted','pending')`,
    [guide.id],
  );
  const collaborators = new Set(accepted.rows.map((row) => row.person_id));
  const rules: AccessRule[] = [
    { audience: "college" },
    {
      audience: guide.visibility,
      organizationId: guide.audience_organization_id,
      personId: guide.owner_person_id,
      collaborators,
    },
    {
      audience: revision.visibility,
      organizationId: revision.audience_organization_id,
      personId: guide.owner_person_id,
      collaborators,
    },
  ];
  return canReadAll(viewer, rules);
}

export interface GuideView {
  id: string;
  type: GuideType;
  status: string;
  revision: {
    id: string;
    version: number;
    content: GuideContent;
    publishedAt: Date;
    safetyStatus: string;
  };
  credits: { byline: string; personId?: string; role: string; note: string }[];
}

export async function getGuide(
  viewer: Principal | null,
  guideId: string,
  revisionId?: string,
): Promise<GuideView | null> {
  const db = pool();
  const guide = await one<GuideRow>(
    db,
    `SELECT * FROM makernet.guide WHERE id = $1`,
    [guideId],
  );
  if (!guide?.effective_revision_id) return null;
  const revision = await one<RevisionRow>(
    db,
    `SELECT * FROM makernet.guide_revision
    WHERE id = $1 AND guide_id = $2`,
    [revisionId ?? guide.effective_revision_id, guideId],
  );
  if (!(await visibleGuide(db, viewer, guide, revision))) return null;
  const credits = await db.query<{
    person_id: string;
    display_name: string;
    role: string;
    contribution_note: string;
    accepted_audience: GuideVisibility;
    accepted_organization_id: string | null;
    public_byline: string;
  }>(
    `
    SELECT a.*, p.display_name FROM makernet.guide_revision_authorship a
    JOIN makernet.person p ON p.id = a.person_id WHERE a.revision_id = $1 ORDER BY a.credit_order`,
    [revision!.id],
  );
  return {
    id: guide.id,
    type: guide.guide_type,
    status: guide.status,
    revision: {
      id: revision!.id,
      version: revision!.version,
      content: revision!.content,
      publishedAt: revision!.published_at,
      safetyStatus: revision!.safety_status,
    },
    credits: credits.rows.map((credit) => {
      const reveal = canReadAll(viewer, [
        { audience: "college" },
        {
          audience: credit.accepted_audience,
          organizationId: credit.accepted_organization_id,
          personId: credit.person_id,
        },
      ]);
      return {
        byline: reveal ? credit.display_name : credit.public_byline,
        ...(reveal ? { personId: credit.person_id } : {}),
        role: credit.role,
        note: reveal ? credit.contribution_note : "",
      };
    }),
  };
}

export async function listGuideRevisions(
  viewer: Principal | null,
  guideId: string,
) {
  const db = pool();
  const guide = await one<GuideRow>(
    db,
    `SELECT * FROM makernet.guide WHERE id = $1`,
    [guideId],
  );
  if (!guide?.effective_revision_id || !isEligible(viewer)) return [];
  const revisions = await db.query<RevisionRow>(
    `SELECT * FROM makernet.guide_revision
    WHERE guide_id = $1 ORDER BY version DESC`,
    [guideId],
  );
  const result: {
    id: string;
    version: number;
    title: string;
    publishedAt: Date;
    status: string;
  }[] = [];
  for (const revision of revisions.rows)
    if (await visibleGuide(db, viewer, guide, revision))
      result.push({
        id: revision.id,
        version: revision.version,
        title: revision.content.title,
        publishedAt: revision.published_at,
        status: revision.publication_status,
      });
  return result;
}

export async function archiveGuide(
  actor: Principal | null,
  guideId: string,
): Promise<void> {
  active(actor);
  await transaction(async (db) => {
    await requireScope(db, actor, guideId, "archive");
    await db.query(
      `UPDATE makernet.guide SET status = 'archived', updated_at = now() WHERE id = $1`,
      [guideId],
    );
    await audit(
      db,
      actor.id,
      "guide_archive",
      guideId,
      "Maintainer archived guide",
    );
  });
}

export async function withdrawCurrentRevision(
  actor: Principal | null,
  guideId: string,
  reason: string,
): Promise<void> {
  active(actor);
  if (!reason.trim()) throw new Error("Reason required");
  await transaction(async (db) => {
    const guide = await guideById(db, guideId, true);
    await requireScope(db, actor, guideId, "archive");
    if (!guide.current_revision_id) throw new Error("No current revision");
    await db.query(
      `UPDATE makernet.guide_revision SET publication_status = 'withdrawn'
      WHERE id = $1`,
      [guide.current_revision_id],
    );
    await db.query(
      `UPDATE makernet.guide SET effective_revision_id = NULL,
      lock_version = lock_version + 1, updated_at = now() WHERE id = $1`,
      [guideId],
    );
    const people = await db.query<{ person_id: string }>(
      `UPDATE makernet.skill_evidence e
      SET status = 'withdrawn' FROM makernet.guide_revision_authorship a
      WHERE e.revision_authorship_id = a.id AND a.revision_id = $1 RETURNING e.person_id`,
      [guide.current_revision_id],
    );
    for (const id of new Set(people.rows.map((row) => row.person_id)))
      await rebuildSkillProjection(db, id);
    await db.query(
      `INSERT INTO makernet.outbox_event
      (aggregate_type, aggregate_id, aggregate_version, event_type, payload)
      VALUES ('guide', $1, $2, 'guide.withdrawn', $3)`,
      [
        guideId,
        guide.lock_version + 1,
        { revisionId: guide.current_revision_id },
      ],
    );
    await audit(db, actor.id, "guide_withdraw", guideId, reason.trim());
  });
}
