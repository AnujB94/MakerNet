import "server-only";
import { pool, one, transaction, type DatabaseClient } from "@/modules/db";
import { canRead, isEligible, type Principal } from "@/modules/identity/policy";
import { rebuildSkillProjection } from "@/modules/profiles/service";
import { parseGuideContent } from "./content";
import {
  allGuideScopes,
  type GuideScope,
  type GuideVisibility,
} from "./service";

async function requireScope(
  db: DatabaseClient,
  actor: Principal | null,
  guideId: string,
  scope: GuideScope,
) {
  if (!isEligible(actor)) throw new Error("Forbidden");
  const row = await one<{ scopes: GuideScope[] }>(
    db,
    `SELECT scopes FROM makernet.guide_maintainer
    WHERE guide_id = $1 AND person_id = $2 AND status = 'active'`,
    [guideId, actor.id],
  );
  if (!row?.scopes.includes(scope)) throw new Error("Forbidden");
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

export async function canManageGuide(
  actor: Principal | null,
  guideId: string,
  scope: GuideScope,
): Promise<boolean> {
  if (!isEligible(actor)) return false;
  try {
    await requireScope(pool(), actor, guideId, scope);
    return true;
  } catch {
    return false;
  }
}

export async function guideManagement(
  actor: Principal | null,
  guideId: string,
) {
  if (!isEligible(actor)) throw new Error("Forbidden");
  const access = await one<{ scopes: GuideScope[] }>(
    pool(),
    `SELECT scopes FROM makernet.guide_maintainer
     WHERE guide_id = $1 AND person_id = $2 AND status = 'active'`,
    [guideId, actor.id],
  );
  if (!access) throw new Error("Forbidden");
  const guide = await one<{
    id: string;
    owner_type: string;
    owner_person_id: string | null;
    owner_organization_id: string | null;
    visibility: GuideVisibility;
    audience_organization_id: string | null;
    status: string;
    current_revision_id: string | null;
    effective_revision_id: string | null;
  }>(
    pool(),
    `
    SELECT * FROM makernet.guide WHERE id = $1`,
    [guideId],
  );
  if (!guide) throw new Error("Guide not found");
  const maintainers = await pool().query<{
    person_id: string;
    display_name: string;
    scopes: GuideScope[];
    is_owner: boolean;
    status: string;
  }>(
    `SELECT m.person_id, p.display_name, m.scopes, m.is_owner, m.status
    FROM makernet.guide_maintainer m JOIN makernet.person p ON p.id = m.person_id
    WHERE m.guide_id = $1 ORDER BY m.granted_at`,
    [guideId],
  );
  return {
    ...guide,
    maintainers: maintainers.rows,
    actorScopes: access.scopes,
  };
}

export async function myGuideRequests(actor: Principal | null) {
  if (!isEligible(actor)) throw new Error("Forbidden");
  const db = pool();
  const transfers = await db.query<{
    id: string;
    guide_id: string;
    target_organization_id: string | null;
  }>(
    `
    SELECT id, guide_id, target_organization_id FROM makernet.guide_ownership_transfer
    WHERE status = 'pending' AND (target_person_id = $1 OR target_organization_id = ANY($2::uuid[]))
    ORDER BY created_at`,
    [actor.id, [...actor.officerOrganizations]],
  );
  const consents = await db.query<{
    change_id: string;
    guide_id: string;
    new_visibility: string;
  }>(
    `
    SELECT c.change_id, v.guide_id, v.new_visibility
    FROM makernet.guide_visibility_consent c
    JOIN makernet.guide_visibility_change v ON v.id = c.change_id
    WHERE c.person_id = $1 AND c.accepted_at IS NULL AND v.status = 'pending'
    ORDER BY v.created_at`,
    [actor.id],
  );
  return { transfers: transfers.rows, consents: consents.rows };
}

export async function proposeEdit(
  actor: Principal | null,
  guideId: string,
  input: unknown,
): Promise<string> {
  if (!isEligible(actor)) throw new Error("Forbidden");
  const content = parseGuideContent(input);
  return transaction(async (db) => {
    const guide = await one<{
      current_revision_id: string | null;
      visibility: GuideVisibility;
      audience_organization_id: string | null;
      status: string;
    }>(db, `SELECT * FROM makernet.guide WHERE id = $1 FOR UPDATE`, [guideId]);
    if (
      !guide?.current_revision_id ||
      guide.status !== "active" ||
      !canRead(actor, {
        audience: guide.visibility,
        organizationId: guide.audience_organization_id,
      })
    )
      throw new Error("Guide unavailable");
    const row = await one<{ id: string }>(
      db,
      `INSERT INTO makernet.guide_edit_proposal
      (guide_id, base_revision_id, proposer_id, content) VALUES ($1, $2, $3, $4) RETURNING id`,
      [guideId, guide.current_revision_id, actor.id, content],
    );
    return row!.id;
  });
}

export async function listProposals(actor: Principal | null, guideId: string) {
  await requireScope(pool(), actor, guideId, "publish_revisions");
  const result = await pool().query<{
    id: string;
    proposer_id: string;
    status: string;
    content: unknown;
    created_at: Date;
  }>(
    `
    SELECT id, proposer_id, status, content, created_at FROM makernet.guide_edit_proposal
    WHERE guide_id = $1 ORDER BY created_at DESC`,
    [guideId],
  );
  return result.rows;
}

export async function reviewProposal(
  actor: Principal | null,
  proposalId: string,
  accept: boolean,
  reason: string,
): Promise<string | null> {
  if (!isEligible(actor) || !reason.trim())
    throw new Error("Forbidden or missing reason");
  return transaction(async (db) => {
    const proposal = await one<{
      guide_id: string;
      base_revision_id: string;
      proposer_id: string;
      content: unknown;
      status: string;
    }>(
      db,
      `SELECT * FROM makernet.guide_edit_proposal WHERE id = $1 FOR UPDATE`,
      [proposalId],
    );
    if (!proposal || proposal.status !== "pending")
      throw new Error("Proposal unavailable");
    await requireScope(db, actor, proposal.guide_id, "publish_revisions");
    const guide = await one<{
      current_revision_id: string | null;
      visibility: GuideVisibility;
      audience_organization_id: string | null;
    }>(db, `SELECT * FROM makernet.guide WHERE id = $1 FOR UPDATE`, [
      proposal.guide_id,
    ]);
    if (guide?.current_revision_id !== proposal.base_revision_id) {
      await db.query(
        `UPDATE makernet.guide_edit_proposal SET status = 'stale', reviewer_id = $2,
        decision = 'Base revision changed', reviewed_at = now() WHERE id = $1`,
        [proposalId, actor.id],
      );
      return null;
    }
    if (!accept) {
      await db.query(
        `UPDATE makernet.guide_edit_proposal SET status = 'rejected', reviewer_id = $2,
        decision = $3, reviewed_at = now() WHERE id = $1`,
        [proposalId, actor.id, reason.trim()],
      );
      await audit(
        db,
        actor.id,
        "proposal_reject",
        proposal.guide_id,
        reason.trim(),
      );
      return null;
    }
    const draft = await one<{ id: string }>(
      db,
      `INSERT INTO makernet.guide_draft
      (guide_id, base_revision_id, content, updated_by) VALUES ($1, $2, $3, $4) RETURNING id`,
      [
        proposal.guide_id,
        proposal.base_revision_id,
        proposal.content,
        actor.id,
      ],
    );
    await db.query(
      `INSERT INTO makernet.draft_contribution
      (draft_id, person_id, role, contribution_note, credit_order, invitation_status,
       accepted_audience, accepted_organization_id, responded_at)
      VALUES ($1, $2, 'lead_author', 'Reviewed proposed edit', 1, 'accepted', $3, $4, now())`,
      [draft!.id, actor.id, guide!.visibility, guide!.audience_organization_id],
    );
    await db.query(
      `INSERT INTO makernet.draft_contribution
      (draft_id, person_id, role, contribution_note, credit_order)
      VALUES ($1, $2, 'author', 'Proposed this edit', 2)`,
      [draft!.id, proposal.proposer_id],
    );
    await db.query(
      `UPDATE makernet.guide_edit_proposal SET status = 'accepted', reviewer_id = $2,
      decision = $3, reviewed_at = now() WHERE id = $1`,
      [proposalId, actor.id, reason.trim()],
    );
    await audit(
      db,
      actor.id,
      "proposal_accept",
      proposal.guide_id,
      reason.trim(),
    );
    return draft!.id;
  });
}

export async function addMaintainer(
  actor: Principal | null,
  guideId: string,
  personId: string,
  scopes: GuideScope[],
): Promise<void> {
  if (
    !isEligible(actor) ||
    scopes.length === 0 ||
    scopes.some((scope) => !allGuideScopes.includes(scope))
  )
    throw new Error("Invalid scopes");
  await transaction(async (db) => {
    await requireScope(db, actor, guideId, "manage_maintainers");
    const person = await one<{ id: string }>(
      db,
      `SELECT id FROM makernet.person WHERE id = $1 AND state = 'active'`,
      [personId],
    );
    if (!person) throw new Error("Maintainer not active");
    await db.query(
      `INSERT INTO makernet.guide_maintainer(guide_id, person_id, scopes, granted_by)
      VALUES ($1, $2, $3, $4) ON CONFLICT (guide_id, person_id) DO UPDATE
      SET scopes = EXCLUDED.scopes, status = 'active', revoked_at = NULL,
          granted_by = EXCLUDED.granted_by, granted_at = now()`,
      [guideId, personId, scopes, actor.id],
    );
    await audit(
      db,
      actor.id,
      "maintainer_grant",
      guideId,
      `Granted scopes to ${personId}`,
    );
  });
}

export async function revokeMaintainer(
  actor: Principal | null,
  guideId: string,
  personId: string,
): Promise<void> {
  if (!isEligible(actor)) throw new Error("Forbidden");
  await transaction(async (db) => {
    await requireScope(db, actor, guideId, "manage_maintainers");
    const row = await one<{ person_id: string }>(
      db,
      `UPDATE makernet.guide_maintainer
      SET status = 'revoked', revoked_at = now() WHERE guide_id = $1 AND person_id = $2
        AND status = 'active' RETURNING person_id`,
      [guideId, personId],
    );
    if (!row) throw new Error("Maintainer not found");
    await audit(
      db,
      actor.id,
      "maintainer_revoke",
      guideId,
      `Revoked ${personId}`,
    );
  });
}

export async function requestOwnershipTransfer(
  actor: Principal | null,
  guideId: string,
  targetPersonId: string | null,
  targetOrganizationId: string | null,
): Promise<string> {
  if (
    !isEligible(actor) ||
    Boolean(targetPersonId) === Boolean(targetOrganizationId)
  )
    throw new Error("Invalid transfer target");
  return transaction(async (db) => {
    await requireScope(db, actor, guideId, "manage_maintainers");
    const row = await one<{ id: string }>(
      db,
      `INSERT INTO makernet.guide_ownership_transfer
      (guide_id, initiated_by, target_person_id, target_organization_id)
      VALUES ($1, $2, $3, $4) RETURNING id`,
      [guideId, actor.id, targetPersonId, targetOrganizationId],
    );
    await audit(
      db,
      actor.id,
      "ownership_transfer_request",
      guideId,
      "Awaiting recipient acceptance",
    );
    return row!.id;
  });
}

export async function acceptOwnershipTransfer(
  actor: Principal | null,
  transferId: string,
): Promise<void> {
  if (!isEligible(actor)) throw new Error("Forbidden");
  await transaction(async (db) => {
    const transfer = await one<{
      guide_id: string;
      target_person_id: string | null;
      target_organization_id: string | null;
      status: string;
    }>(
      db,
      `SELECT * FROM makernet.guide_ownership_transfer
      WHERE id = $1 FOR UPDATE`,
      [transferId],
    );
    if (!transfer || transfer.status !== "pending")
      throw new Error("Transfer unavailable");
    if (
      transfer.target_person_id !== actor.id &&
      !(
        transfer.target_organization_id &&
        actor.officerOrganizations.has(transfer.target_organization_id)
      )
    )
      throw new Error("Only recipient or organization officer can accept");
    await db.query(`SELECT id FROM makernet.guide WHERE id = $1 FOR UPDATE`, [
      transfer.guide_id,
    ]);
    await db.query(
      `INSERT INTO makernet.guide_maintainer(guide_id, person_id, scopes, is_owner, granted_by)
      VALUES ($1, $2, $3, true, $2) ON CONFLICT (guide_id, person_id) DO UPDATE
      SET scopes = EXCLUDED.scopes, is_owner = true, status = 'active', revoked_at = NULL`,
      [transfer.guide_id, actor.id, allGuideScopes],
    );
    await db.query(
      `UPDATE makernet.guide_maintainer SET is_owner = false
      WHERE guide_id = $1 AND person_id <> $2 AND is_owner = true`,
      [transfer.guide_id, actor.id],
    );
    await db.query(
      `UPDATE makernet.guide SET owner_type = $2, owner_person_id = $3,
      owner_organization_id = $4, updated_at = now() WHERE id = $1`,
      [
        transfer.guide_id,
        transfer.target_organization_id ? "organization" : "person",
        transfer.target_person_id,
        transfer.target_organization_id,
      ],
    );
    await db.query(
      `UPDATE makernet.guide_ownership_transfer SET status = 'accepted', decided_at = now() WHERE id = $1`,
      [transferId],
    );
    await audit(
      db,
      actor.id,
      "ownership_transfer_accept",
      transfer.guide_id,
      "Recipient accepted stewardship",
    );
  });
}

function widening(
  oldVisibility: GuideVisibility,
  newVisibility: GuideVisibility,
  oldOrg: string | null,
  newOrg: string | null,
) {
  if (oldVisibility === "private") return newVisibility !== "private";
  if (oldVisibility === "organization")
    return (
      newVisibility === "college" ||
      (newVisibility === "organization" && oldOrg !== newOrg)
    );
  return false;
}

export async function requestVisibilityChange(
  actor: Principal | null,
  guideId: string,
  visibility: GuideVisibility,
  organizationId: string | null,
): Promise<string> {
  if (!isEligible(actor)) throw new Error("Forbidden");
  if (
    visibility === "organization" &&
    (!organizationId || !actor.organizations.has(organizationId))
  )
    throw new Error("Current organization membership required");
  if (visibility !== "organization" && organizationId)
    throw new Error("Unexpected organization scope");
  return transaction(async (db) => {
    await requireScope(db, actor, guideId, "change_visibility");
    const guide = await one<{
      visibility: GuideVisibility;
      audience_organization_id: string | null;
      current_revision_id: string | null;
    }>(db, `SELECT * FROM makernet.guide WHERE id = $1 FOR UPDATE`, [guideId]);
    if (!guide) throw new Error("Guide not found");
    const needsConsent = widening(
      guide.visibility,
      visibility,
      guide.audience_organization_id,
      organizationId,
    );
    const change = await one<{ id: string }>(
      db,
      `INSERT INTO makernet.guide_visibility_change
      (guide_id, requested_by, new_visibility, new_organization_id)
      VALUES ($1, $2, $3, $4) RETURNING id`,
      [guideId, actor.id, visibility, organizationId],
    );
    if (needsConsent && guide.current_revision_id) {
      await db.query(
        `INSERT INTO makernet.guide_visibility_consent(change_id, person_id)
        SELECT $1, person_id FROM makernet.guide_revision_authorship
        WHERE revision_id = $2`,
        [change!.id, guide.current_revision_id],
      );
    } else {
      await applyVisibilityChange(
        db,
        change!.id,
        guideId,
        visibility,
        organizationId,
      );
    }
    await audit(
      db,
      actor.id,
      "guide_visibility_request",
      guideId,
      needsConsent ? "Contributor consent requested" : "Visibility narrowed",
    );
    return change!.id;
  });
}

async function applyVisibilityChange(
  db: DatabaseClient,
  changeId: string,
  guideId: string,
  visibility: GuideVisibility,
  organizationId: string | null,
) {
  await db.query(
    `UPDATE makernet.guide SET visibility = $2, audience_organization_id = $3,
    updated_at = now(), lock_version = lock_version + 1 WHERE id = $1`,
    [guideId, visibility, organizationId],
  );
  const people = await db.query<{ person_id: string }>(
    `
    SELECT DISTINCT e.person_id FROM makernet.skill_evidence e
    JOIN makernet.guide_revision_authorship a ON a.id = e.revision_authorship_id
    JOIN makernet.guide g ON g.current_revision_id = a.revision_id
    WHERE g.id = $1 AND e.status = 'active'`,
    [guideId],
  );
  for (const id of new Set(people.rows.map((row) => row.person_id)))
    await rebuildSkillProjection(db, id);
  const version = await one<{ lock_version: number }>(
    db,
    `SELECT lock_version FROM makernet.guide WHERE id = $1`,
    [guideId],
  );
  await db.query(
    `INSERT INTO makernet.outbox_event
    (aggregate_type, aggregate_id, aggregate_version, event_type, payload)
    VALUES ('guide', $1, $2, 'guide.visibility_changed', $3)`,
    [guideId, version!.lock_version, { visibility }],
  );
  await db.query(
    `UPDATE makernet.guide_visibility_change SET status = 'applied', applied_at = now()
    WHERE id = $1`,
    [changeId],
  );
}

export async function acceptVisibilityChange(
  actor: Principal | null,
  changeId: string,
): Promise<void> {
  if (!isEligible(actor)) throw new Error("Forbidden");
  await transaction(async (db) => {
    const change = await one<{
      guide_id: string;
      new_visibility: GuideVisibility;
      new_organization_id: string | null;
      status: string;
    }>(
      db,
      `SELECT * FROM makernet.guide_visibility_change
      WHERE id = $1 FOR UPDATE`,
      [changeId],
    );
    if (!change || change.status !== "pending")
      throw new Error("Change unavailable");
    const consent = await one<{ person_id: string }>(
      db,
      `UPDATE makernet.guide_visibility_consent
      SET accepted_at = now() WHERE change_id = $1 AND person_id = $2 AND accepted_at IS NULL
      RETURNING person_id`,
      [changeId, actor.id],
    );
    if (!consent)
      throw new Error("Consent not requested from this contributor");
    const pending = await db.query(
      `SELECT 1 FROM makernet.guide_visibility_consent
      WHERE change_id = $1 AND accepted_at IS NULL`,
      [changeId],
    );
    if (pending.rowCount === 0)
      await applyVisibilityChange(
        db,
        changeId,
        change.guide_id,
        change.new_visibility,
        change.new_organization_id,
      );
    await audit(
      db,
      actor.id,
      "guide_visibility_consent",
      change.guide_id,
      "Contributor accepted wider audience",
    );
  });
}
