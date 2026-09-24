import "server-only";
import { pool, one, transaction, type DatabaseClient } from "@/modules/db";
import {
  canReadAll,
  intersectAudience,
  isEligible,
  type AccessRule,
  type Audience,
  type Principal,
} from "@/modules/identity/policy";

export const profileFields = [
  "name",
  "photo",
  "biography",
  "year",
  "department",
  "organizations",
  "skill_claims",
  "evidence",
  "willingness_to_help",
] as const;
export type ProfileField = (typeof profileFields)[number];
export type ProfileAudience = Exclude<Audience, "public">;

export interface VisibilitySetting {
  field: ProfileField;
  audience: Audience;
  organizationId: string | null;
}

type ProfileRow = {
  person_id: string;
  display_name: string;
  biography: string;
  year: number | null;
  department: string;
  willing_to_help: boolean;
  status: "active" | "deactivated";
  account_state: string;
  eligibility_ends_at: Date | null;
};

function owns(actor: Principal | null, personId: string): actor is Principal {
  return isEligible(actor) && actor.id === personId;
}

function validateAudience(
  actor: Principal,
  audience: Audience,
  organizationId: string | null,
) {
  if (audience === "public")
    throw new Error("Public profiles are disabled during internal alpha");
  if (
    audience === "organization" &&
    (!organizationId || !actor.organizations.has(organizationId))
  )
    throw new Error("Choose a current organization membership");
  if (audience !== "organization" && organizationId)
    throw new Error("Organization scope requires organization audience");
}

async function profileSettings(personId: string): Promise<VisibilitySetting[]> {
  const result = await pool().query<{
    field_key: ProfileField;
    audience: Audience;
    audience_organization_id: string | null;
  }>(
    `
    SELECT field_key, audience, audience_organization_id FROM makernet.profile_field_visibility
    WHERE person_id = $1 ORDER BY field_key`,
    [personId],
  );
  return result.rows.map((row) => ({
    field: row.field_key,
    audience: row.audience,
    organizationId: row.audience_organization_id,
  }));
}

export async function ownProfileSettings(
  actor: Principal | null,
): Promise<VisibilitySetting[]> {
  if (!isEligible(actor)) throw new Error("Forbidden");
  return profileSettings(actor.id);
}

export async function previewProfile(
  actor: Principal | null,
  audience: "anonymous" | "college" | "organization",
  organizationId: string | null,
) {
  if (!isEligible(actor)) throw new Error("Forbidden");
  if (audience === "anonymous") return null;
  if (
    audience === "organization" &&
    (!organizationId || !actor.organizations.has(organizationId))
  )
    throw new Error("Choose your organization");
  const simulated: Principal = {
    id: "00000000-0000-4000-8000-000000000000",
    state: "active",
    eligibilityEndsAt: null,
    organizations: new Set(
      audience === "organization" ? [organizationId!] : [],
    ),
    officerOrganizations: new Set(),
    siteRoles: new Set(),
    staffSkillScopes: new Set(),
  };
  return getProfileView(simulated, actor.id);
}

async function membershipIds(
  db: DatabaseClient,
  personId: string,
): Promise<Set<string>> {
  const rows = await db.query<{ organization_id: string }>(
    `SELECT organization_id FROM makernet.organization_membership
    WHERE person_id = $1 AND status = 'active'`,
    [personId],
  );
  return new Set(rows.rows.map((row) => row.organization_id));
}

function visibleField(
  viewer: Principal | null,
  ownerId: string,
  ownerOrganizations: Set<string>,
  setting: VisibilitySetting,
): boolean {
  if (owns(viewer, ownerId)) return true;
  if (
    setting.audience === "organization" &&
    !ownerOrganizations.has(setting.organizationId!)
  )
    return false;
  return canReadAll(viewer, [
    { audience: "college" }, // Internal-alpha hard ceiling.
    { audience: setting.audience, organizationId: setting.organizationId },
  ]);
}

export interface ProfileView {
  id: string;
  status: "active" | "unavailable";
  fields: Partial<
    Record<
      ProfileField,
      string | number | boolean | { id: string; name: string }[] | null
    >
  >;
  claims?: {
    id: string;
    skillId: string;
    skillName: string;
    statement: string;
  }[];
  evidence?: {
    id: string;
    skillId: string;
    skillName: string;
    guideId: string;
    guideTitle: string;
  }[];
  completion?: number;
}

export async function getProfileView(
  viewer: Principal | null,
  personId: string,
): Promise<ProfileView | null> {
  if (!isEligible(viewer)) return null;
  const db = pool();
  const row = await one<ProfileRow>(
    db,
    `SELECT p.person_id, p.display_name, p.biography, p.year,
      p.department, p.willing_to_help, p.status, a.state AS account_state,
      a.eligibility_ends_at
    FROM makernet.person_profile p JOIN makernet.person a ON a.id = p.person_id
    WHERE p.person_id = $1`,
    [personId],
  );
  if (!row) return null;
  if (
    row.status !== "active" ||
    row.account_state !== "active" ||
    (row.eligibility_ends_at && row.eligibility_ends_at <= new Date())
  )
    return { id: personId, status: "unavailable", fields: {} };
  const settings = await profileSettings(personId);
  const byField = new Map(settings.map((setting) => [setting.field, setting]));
  const ownerOrganizations = await membershipIds(db, personId);
  const canShow = (field: ProfileField) => {
    const setting = byField.get(field);
    return Boolean(
      setting && visibleField(viewer, personId, ownerOrganizations, setting),
    );
  };
  const fields: ProfileView["fields"] = {};
  if (canShow("name")) fields.name = row.display_name;
  if (canShow("biography")) fields.biography = row.biography;
  if (canShow("year")) fields.year = row.year;
  if (canShow("department")) fields.department = row.department;
  if (canShow("willingness_to_help"))
    fields.willingness_to_help = row.willing_to_help;
  if (canShow("photo")) fields.photo = null; // Media is introduced in Subsystem 6.
  if (canShow("organizations")) {
    const organizations = await db.query<{ id: string; name: string }>(
      `
      SELECT o.id, o.name FROM makernet.organization_membership m
      JOIN makernet.organization o ON o.id = m.organization_id
      WHERE m.person_id = $1 AND m.status = 'active' ORDER BY o.name`,
      [personId],
    );
    fields.organizations = organizations.rows;
  }
  const view: ProfileView = { id: personId, status: "active", fields };
  if (canShow("skill_claims")) {
    const claims = await db.query<{
      id: string;
      skill_id: string;
      name: string;
      statement: string;
      audience: Audience;
      audience_organization_id: string | null;
    }>(
      `SELECT c.id, c.skill_id, s.name, c.statement, c.audience, c.audience_organization_id
      FROM makernet.person_skill_claim c JOIN makernet.skill s ON s.id = c.skill_id
      WHERE c.person_id = $1 AND c.status = 'active' AND s.status = 'active'
      ORDER BY s.name`,
      [personId],
    );
    view.claims = claims.rows
      .filter(
        (claim) =>
          owns(viewer, personId) ||
          ((claim.audience !== "organization" ||
            ownerOrganizations.has(claim.audience_organization_id!)) &&
            canReadAll(viewer, [
              { audience: "college" },
              {
                audience: claim.audience,
                organizationId: claim.audience_organization_id,
              },
            ])),
      )
      .map((claim) => ({
        id: claim.id,
        skillId: claim.skill_id,
        skillName: claim.name,
        statement: claim.statement,
      }));
  }
  if (canShow("evidence")) {
    const evidence = await db.query<{
      id: string;
      skill_id: string;
      skill_name: string;
      guide_id: string;
      guide_title: string;
      audience: Audience;
      audience_organization_id: string | null;
      revision_visibility: Audience;
      revision_organization_id: string | null;
      guide_visibility: Audience;
      guide_organization_id: string | null;
    }>(
      `SELECT e.id, e.skill_id, s.name AS skill_name, g.id AS guide_id,
        r.content->>'title' AS guide_title, e.audience, e.audience_organization_id,
        r.visibility AS revision_visibility, r.audience_organization_id AS revision_organization_id,
        g.visibility AS guide_visibility, g.audience_organization_id AS guide_organization_id
      FROM makernet.skill_evidence e
      JOIN makernet.guide_revision_authorship a ON a.id = e.revision_authorship_id
      JOIN makernet.guide_revision r ON r.id = a.revision_id
      JOIN makernet.guide g ON g.id = r.guide_id
      JOIN makernet.skill s ON s.id = e.skill_id
      WHERE e.person_id = $1 AND e.status = 'active' AND s.status = 'active'
        AND g.effective_revision_id = r.id AND g.status <> 'removed'
        AND r.publication_status = 'current' AND r.safety_status <> 'quarantined'
      ORDER BY r.published_at DESC`,
      [personId],
    );
    view.evidence = evidence.rows
      .filter((item) => {
        if (owns(viewer, personId)) return true;
        const orgs = [
          item.audience_organization_id,
          item.revision_organization_id,
          item.guide_organization_id,
        ].filter(Boolean);
        if (orgs.some((id) => !ownerOrganizations.has(id!))) return false;
        return canReadAll(viewer, [
          { audience: "college" },
          {
            audience: item.audience,
            organizationId: item.audience_organization_id,
          },
          {
            audience: item.revision_visibility,
            organizationId: item.revision_organization_id,
          },
          {
            audience: item.guide_visibility,
            organizationId: item.guide_organization_id,
          },
        ]);
      })
      .map((item) => ({
        id: item.id,
        skillId: item.skill_id,
        skillName: item.skill_name,
        guideId: item.guide_id,
        guideTitle: item.guide_title,
      }));
  }
  if (owns(viewer, personId)) {
    const filled = [
      row.display_name,
      row.biography,
      row.year,
      row.department,
      row.willing_to_help,
      view.claims?.length,
    ].filter(Boolean).length;
    view.completion = Math.round((filled / 6) * 100);
  }
  return view;
}

export async function updateProfile(
  actor: Principal | null,
  input: {
    displayName: string;
    biography: string;
    year: number | null;
    department: string;
  },
): Promise<void> {
  if (!isEligible(actor)) throw new Error("Forbidden");
  const displayName = input.displayName.trim();
  const department = input.department.trim();
  if (
    displayName.length < 2 ||
    displayName.length > 100 ||
    input.biography.length > 4000 ||
    department.length > 120 ||
    (input.year !== null &&
      (!Number.isInteger(input.year) || input.year < 1 || input.year > 8))
  )
    throw new Error("Invalid profile fields");
  await transaction(async (db) => {
    const row = await one<{ person_id: string }>(
      db,
      `UPDATE makernet.person_profile SET
      display_name = $2, biography = $3, year = $4, department = $5,
      status = 'active', updated_at = now()
      WHERE person_id = $1 RETURNING person_id`,
      [actor.id, displayName, input.biography.trim(), input.year, department],
    );
    if (!row) throw new Error("Profile not found");
    await rebuildSkillProjection(db, actor.id);
    await db.query(
      `INSERT INTO makernet.audit_event(actor_id, action, target_type, target_id, scope, reason)
      VALUES ($1::uuid, 'profile_update', 'person', $1::text, 'private', 'Member corrected profile')`,
      [actor.id],
    );
  });
}

export async function setWillingness(
  actor: Principal | null,
  willing: boolean,
): Promise<void> {
  if (!isEligible(actor)) throw new Error("Forbidden");
  await pool().query(
    `UPDATE makernet.person_profile SET willing_to_help = $2, updated_at = now()
    WHERE person_id = $1 AND status = 'active'`,
    [actor.id, willing],
  );
}

export async function setFieldVisibility(
  actor: Principal | null,
  field: ProfileField,
  audience: Audience,
  organizationId: string | null,
): Promise<void> {
  if (!isEligible(actor)) throw new Error("Forbidden");
  if (!profileFields.includes(field)) throw new Error("Unknown field");
  validateAudience(actor, audience, organizationId);
  await transaction(async (db) => {
    await db.query(
      `UPDATE makernet.profile_field_visibility
      SET audience = $3, audience_organization_id = $4, updated_at = now()
      WHERE person_id = $1 AND field_key = $2`,
      [actor.id, field, audience, organizationId],
    );
    if (field === "skill_claims" || field === "evidence")
      await rebuildSkillProjection(db, actor.id);
    await db.query(
      `INSERT INTO makernet.audit_event(actor_id, action, target_type, target_id, scope, reason)
      VALUES ($1::uuid, 'profile_visibility', 'person', $1::text, 'private', $2)`,
      [actor.id, `Field ${field} set to ${audience}`],
    );
  });
}

export async function addSkillClaim(
  actor: Principal | null,
  skillId: string,
  statement: string,
  audience: Audience,
  organizationId: string | null,
): Promise<void> {
  if (!isEligible(actor)) throw new Error("Forbidden");
  if (statement.length > 1000) throw new Error("Statement too long");
  validateAudience(actor, audience, organizationId);
  await transaction(async (db) => {
    const skill = await one<{ id: string }>(
      db,
      `SELECT id FROM makernet.skill WHERE id = $1 AND status = 'active'`,
      [skillId],
    );
    if (!skill) throw new Error("Skill is not active");
    await db.query(
      `INSERT INTO makernet.person_skill_claim(person_id, skill_id, statement, audience, audience_organization_id)
      VALUES ($1, $2, $3, $4, $5)`,
      [actor.id, skillId, statement.trim(), audience, organizationId],
    );
    await rebuildSkillProjection(db, actor.id);
  });
}

export async function removeSkillClaim(
  actor: Principal | null,
  claimId: string,
): Promise<void> {
  if (!isEligible(actor)) throw new Error("Forbidden");
  await transaction(async (db) => {
    const claim = await one<{ id: string }>(
      db,
      `UPDATE makernet.person_skill_claim
      SET status = 'inactive', updated_at = now() WHERE id = $1 AND person_id = $2
      RETURNING id`,
      [claimId, actor.id],
    );
    if (!claim) throw new Error("Claim not found");
    await rebuildSkillProjection(db, actor.id);
  });
}

export async function rebuildSkillProjection(
  db: DatabaseClient,
  personId: string,
): Promise<void> {
  await db.query(
    `DELETE FROM makernet.person_skill_projection WHERE person_id = $1`,
    [personId],
  );
  const profile = await one<{
    status: string;
    account_state: string;
    eligibility_ends_at: Date | null;
  }>(
    db,
    `SELECT p.status, a.state AS account_state, a.eligibility_ends_at
    FROM makernet.person_profile p JOIN makernet.person a ON a.id = p.person_id WHERE p.person_id = $1`,
    [personId],
  );
  if (
    !profile ||
    profile.status !== "active" ||
    profile.account_state !== "active" ||
    (profile.eligibility_ends_at && profile.eligibility_ends_at <= new Date())
  )
    return;
  const ownerOrganizations = await membershipIds(db, personId);
  const field = await one<{
    audience: Audience;
    audience_organization_id: string | null;
  }>(
    db,
    `
    SELECT audience, audience_organization_id FROM makernet.profile_field_visibility
    WHERE person_id = $1 AND field_key = 'skill_claims'`,
    [personId],
  );
  if (!field) return;
  const claims = await db.query<{
    skill_id: string;
    audience: Audience;
    audience_organization_id: string | null;
    updated_at: Date;
  }>(
    `
    SELECT c.skill_id, c.audience, c.audience_organization_id, c.updated_at
    FROM makernet.person_skill_claim c JOIN makernet.skill s ON s.id = c.skill_id
    WHERE c.person_id = $1 AND c.status = 'active' AND s.status = 'active'`,
    [personId],
  );
  for (const claim of claims.rows) {
    const rule = intersectAudience([
      { audience: "college" },
      {
        audience: field.audience,
        organizationId: field.audience_organization_id,
      },
      {
        audience: claim.audience,
        organizationId: claim.audience_organization_id,
      },
    ] as AccessRule[]);
    if (
      rule.audience === "private" ||
      (rule.audience === "organization" &&
        !ownerOrganizations.has(rule.organizationId!))
    )
      continue;
    await db.query(
      `INSERT INTO makernet.person_skill_projection
      (person_id, skill_id, audience, audience_organization_id, self_claim_count, latest_at)
      VALUES ($1, $2, $3, $4, 1, $5)`,
      [
        personId,
        claim.skill_id,
        rule.audience,
        rule.organizationId ?? null,
        claim.updated_at,
      ],
    );
  }
  const evidenceField = await one<{
    audience: Audience;
    audience_organization_id: string | null;
  }>(
    db,
    `
    SELECT audience, audience_organization_id FROM makernet.profile_field_visibility
    WHERE person_id = $1 AND field_key = 'evidence'`,
    [personId],
  );
  if (!evidenceField) return;
  const evidence = await db.query<{
    skill_id: string;
    audience: Audience;
    audience_organization_id: string | null;
    revision_visibility: Audience;
    revision_organization_id: string | null;
    guide_visibility: Audience;
    guide_organization_id: string | null;
    activated_at: Date;
  }>(
    `
    SELECT e.skill_id, e.audience, e.audience_organization_id,
      r.visibility AS revision_visibility, r.audience_organization_id AS revision_organization_id,
      g.visibility AS guide_visibility, g.audience_organization_id AS guide_organization_id, e.activated_at
    FROM makernet.skill_evidence e
    JOIN makernet.guide_revision_authorship a ON a.id = e.revision_authorship_id
    JOIN makernet.guide_revision r ON r.id = a.revision_id
    JOIN makernet.guide g ON g.id = r.guide_id
    JOIN makernet.skill s ON s.id = e.skill_id
    WHERE e.person_id = $1 AND e.status = 'active' AND s.status = 'active'
      AND g.effective_revision_id = r.id AND g.status <> 'removed'
      AND r.publication_status = 'current' AND r.safety_status <> 'quarantined'`,
    [personId],
  );
  for (const item of evidence.rows) {
    const rule = intersectAudience([
      { audience: "college" },
      {
        audience: evidenceField.audience,
        organizationId: evidenceField.audience_organization_id,
      },
      {
        audience: item.audience,
        organizationId: item.audience_organization_id,
      },
      {
        audience: item.revision_visibility,
        organizationId: item.revision_organization_id,
      },
      {
        audience: item.guide_visibility,
        organizationId: item.guide_organization_id,
      },
    ]);
    if (
      rule.audience === "private" ||
      (rule.audience === "organization" &&
        !ownerOrganizations.has(rule.organizationId!))
    )
      continue;
    await db.query(
      `INSERT INTO makernet.person_skill_projection
      (person_id, skill_id, audience, audience_organization_id, evidence_count, latest_at)
      VALUES ($1, $2, $3, $4, 1, $5)
      ON CONFLICT (person_id, skill_id, audience, audience_organization_id)
      DO UPDATE SET evidence_count = makernet.person_skill_projection.evidence_count + 1,
        latest_at = GREATEST(makernet.person_skill_projection.latest_at, EXCLUDED.latest_at),
        rebuilt_at = now()`,
      [
        personId,
        item.skill_id,
        rule.audience,
        rule.organizationId ?? null,
        item.activated_at,
      ],
    );
  }
}

export async function deactivateProfile(
  actor: Principal | null,
): Promise<void> {
  if (!isEligible(actor)) throw new Error("Forbidden");
  await transaction(async (db) => {
    await db.query(
      `UPDATE makernet.person_profile SET status = 'deactivated', updated_at = now()
      WHERE person_id = $1`,
      [actor.id],
    );
    await rebuildSkillProjection(db, actor.id);
    await db.query(
      `INSERT INTO makernet.audit_event(actor_id, action, target_type, target_id, scope, reason)
      VALUES ($1::uuid, 'profile_deactivate', 'person', $1::text, 'private', 'Member deactivated profile')`,
      [actor.id],
    );
  });
}

export async function prepareProfileExport(actor: Principal | null) {
  if (!isEligible(actor)) throw new Error("Forbidden");
  const profile = await one<ProfileRow>(
    pool(),
    `SELECT p.*, a.state AS account_state
    FROM makernet.person_profile p JOIN makernet.person a ON a.id = p.person_id
    WHERE p.person_id = $1`,
    [actor.id],
  );
  const visibility = await profileSettings(actor.id);
  const claims = await pool().query(
    `SELECT skill_id, statement, audience, audience_organization_id, status, created_at
    FROM makernet.person_skill_claim WHERE person_id = $1 ORDER BY created_at`,
    [actor.id],
  );
  return { profile, visibility, claims: claims.rows };
}
