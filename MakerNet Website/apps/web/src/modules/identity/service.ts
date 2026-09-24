import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { pool, transaction, one, type DatabaseClient } from "@/modules/db";
import {
  isEligible,
  type AccountState,
  type Principal,
  type SiteRole,
} from "./policy";

export const SESSION_COOKIE = "makernet_session";
export interface IdentityClaims {
  issuer: string;
  subject: string;
  email: string;
  displayName: string;
  eligibilityEndsAt?: Date | null;
}

type PersonRow = {
  id: string;
  state: AccountState;
  eligibility_ends_at: Date | null;
};

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function newToken(): string {
  return randomBytes(32).toString("base64url");
}

async function audit(
  db: DatabaseClient,
  actorId: string | null,
  action: string,
  targetType: string,
  targetId: string,
  scope: string,
  reason: string,
) {
  await db.query(
    `INSERT INTO makernet.audit_event(actor_id, action, target_type, target_id, scope, reason)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [actorId, action, targetType, targetId, scope, reason],
  );
}

async function loadPrincipal(
  db: DatabaseClient,
  person: PersonRow,
): Promise<Principal> {
  const memberships = await db.query<{ organization_id: string; role: string }>(
    `SELECT organization_id, role FROM makernet.organization_membership
     WHERE person_id = $1 AND status = 'active'`,
    [person.id],
  );
  const grants = await db.query<{
    role: SiteRole;
    scope_type: string;
    scope_id: string | null;
  }>(
    `SELECT role, scope_type, scope_id FROM makernet.role_grant
     WHERE person_id = $1 AND revoked_at IS NULL`,
    [person.id],
  );
  return {
    id: person.id,
    state: person.state,
    eligibilityEndsAt: person.eligibility_ends_at,
    organizations: new Set(memberships.rows.map((m) => m.organization_id)),
    officerOrganizations: new Set(
      memberships.rows
        .filter((m) => m.role === "officer")
        .map((m) => m.organization_id),
    ),
    siteRoles: new Set(
      grants.rows.filter((g) => g.scope_type === "site").map((g) => g.role),
    ),
    staffSkillScopes: new Set(
      grants.rows
        .filter((g) => g.scope_type === "skill" && g.scope_id)
        .map((g) => g.scope_id!),
    ),
  };
}

export async function principalForToken(
  token: string | undefined,
): Promise<Principal | null> {
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const db = pool();
  const person = await one<PersonRow>(
    db,
    `
    SELECT p.id, p.state, p.eligibility_ends_at
    FROM makernet.session s JOIN makernet.person p ON p.id = s.person_id
    WHERE s.token_hash = $1 AND s.revoked_at IS NULL
      AND s.expires_at > now() AND s.absolute_expires_at > now()`,
    [hashToken(token)],
  );
  if (!person) return null;
  const principal = await loadPrincipal(db, person);
  return isEligible(principal) ? principal : null;
}

async function createSessionRecord(
  db: DatabaseClient,
  claims: IdentityClaims,
): Promise<{ token: string; personId: string }> {
  if (!claims.issuer || !claims.subject || !claims.email || !claims.displayName)
    throw new Error("Incomplete identity claims");
  const token = newToken();
  const person = await one<PersonRow>(
    db,
    `
      INSERT INTO makernet.person(issuer, provider_subject, institution_email, display_name, eligibility_ends_at)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (issuer, provider_subject) DO UPDATE
      SET institution_email = EXCLUDED.institution_email,
          display_name = EXCLUDED.display_name,
          eligibility_ends_at = EXCLUDED.eligibility_ends_at,
          updated_at = now()
      RETURNING id, state, eligibility_ends_at`,
    [
      claims.issuer,
      claims.subject,
      claims.email,
      claims.displayName,
      claims.eligibilityEndsAt ?? null,
    ],
  );
  if (!person) throw new Error("Unable to create account");
  const principal = await loadPrincipal(db, person);
  if (!isEligible(principal)) throw new Error("Account is not eligible");
  await db.query(
    `
      INSERT INTO makernet.session(person_id, token_hash, expires_at, absolute_expires_at)
      VALUES ($1, $2, now() + interval '7 days', now() + interval '30 days')`,
    [person.id, hashToken(token)],
  );
  await audit(
    db,
    person.id,
    "sign_in",
    "person",
    person.id,
    "college",
    "Verified identity accepted",
  );
  return { token, personId: person.id };
}

export async function createSession(
  claims: IdentityClaims,
): Promise<{ token: string; personId: string }> {
  return transaction((db) => createSessionRecord(db, claims));
}

export async function issueEmailSignIn(
  email: string,
  returnTo: string,
): Promise<string | null> {
  const token = newToken();
  return transaction(async (db) => {
    await db.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [email]);
    await db.query(
      `DELETE FROM makernet.email_sign_in_token
       WHERE expires_at < now() - interval '1 day'`,
    );
    const recent = await one<{ minute_count: string; hour_count: string }>(
      db,
      `SELECT
        count(*) FILTER (WHERE created_at > now() - interval '1 minute') AS minute_count,
        count(*) FILTER (WHERE created_at > now() - interval '1 hour') AS hour_count
       FROM makernet.email_sign_in_token WHERE email = $1`,
      [email],
    );
    if (Number(recent?.minute_count) >= 1 || Number(recent?.hour_count) >= 5)
      return null;
    await db.query(
      `INSERT INTO makernet.email_sign_in_token
       (token_hash, email, return_to, expires_at)
       VALUES ($1, $2, $3, now() + interval '15 minutes')`,
      [hashToken(token), email, returnTo],
    );
    return token;
  });
}

export async function invalidateEmailSignIn(token: string): Promise<void> {
  await pool().query(
    `UPDATE makernet.email_sign_in_token SET consumed_at = now()
     WHERE token_hash = $1 AND consumed_at IS NULL`,
    [hashToken(token)],
  );
}

export async function completeEmailSignIn(
  token: string,
): Promise<{ token: string; personId: string; returnTo: string }> {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token))
    throw new Error("Invalid sign-in token");
  return transaction(async (db) => {
    const request = await one<{ email: string; return_to: string }>(
      db,
      `UPDATE makernet.email_sign_in_token SET consumed_at = now()
       WHERE token_hash = $1 AND consumed_at IS NULL AND expires_at > now()
       RETURNING email, return_to`,
      [hashToken(token)],
    );
    if (!request) throw new Error("Sign-in link expired or already used");
    const local = request.email.slice(0, request.email.indexOf("@"));
    const session = await createSessionRecord(db, {
      issuer: "urn:makernet:verified-email",
      subject: request.email,
      email: request.email,
      displayName: local.slice(0, 100),
    });
    return { ...session, returnTo: request.return_to };
  });
}

export async function rotateSession(token: string): Promise<string | null> {
  const replacement = newToken();
  return transaction(async (db) => {
    const row = await one<{ id: string; person_id: string }>(
      db,
      `
      UPDATE makernet.session s SET token_hash = $2, rotated_at = now(),
        expires_at = LEAST(now() + interval '7 days', absolute_expires_at)
      FROM makernet.person p
      WHERE s.token_hash = $1 AND p.id = s.person_id AND p.state = 'active'
        AND (p.eligibility_ends_at IS NULL OR p.eligibility_ends_at > now())
        AND s.revoked_at IS NULL AND s.expires_at > now() AND s.absolute_expires_at > now()
      RETURNING s.id, s.person_id`,
      [hashToken(token), hashToken(replacement)],
    );
    if (!row) return null;
    await audit(
      db,
      row.person_id,
      "session_rotate",
      "session",
      row.id,
      "private",
      "Session renewed",
    );
    return replacement;
  });
}

export async function revokeSession(
  token: string,
  actorId: string | null = null,
): Promise<void> {
  await transaction(async (db) => {
    const session = await one<{ id: string; person_id: string }>(
      db,
      `
      UPDATE makernet.session SET revoked_at = now()
      WHERE token_hash = $1 AND revoked_at IS NULL RETURNING id, person_id`,
      [hashToken(token)],
    );
    if (session)
      await audit(
        db,
        actorId ?? session.person_id,
        "session_revoke",
        "session",
        session.id,
        "private",
        "Logout or account action",
      );
  });
}

export async function setAccountState(
  actor: Principal,
  personId: string,
  state: AccountState,
  reason: string,
): Promise<void> {
  if (!isEligible(actor) || !actor.siteRoles.has("administrator"))
    throw new Error("Forbidden");
  if (!reason.trim()) throw new Error("Reason required");
  await transaction(async (db) => {
    const row = await one<{ id: string }>(
      db,
      `UPDATE makernet.person SET state = $2, updated_at = now()
      WHERE id = $1 RETURNING id`,
      [personId, state],
    );
    if (!row) throw new Error("Account not found");
    if (state !== "active") {
      await db.query(
        `UPDATE makernet.session SET revoked_at = now() WHERE person_id = $1 AND revoked_at IS NULL`,
        [personId],
      );
      await db.query(
        `UPDATE makernet.organization_membership SET status = 'ended', ended_at = now()
        WHERE person_id = $1 AND status = 'active'`,
        [personId],
      );
      await db.query(
        `UPDATE makernet.role_grant SET revoked_at = now()
        WHERE person_id = $1 AND revoked_at IS NULL`,
        [personId],
      );
    }
    await audit(
      db,
      actor.id,
      "account_state",
      "person",
      personId,
      "site",
      reason.trim(),
    );
  });
}

export async function grantSiteRole(
  actor: Principal,
  personId: string,
  role: "moderator" | "administrator",
  reason: string,
): Promise<void> {
  if (!isEligible(actor) || !actor.siteRoles.has("administrator"))
    throw new Error("Forbidden");
  if (!reason.trim()) throw new Error("Reason required");
  await transaction(async (db) => {
    const target = await one<PersonRow>(
      db,
      `SELECT id, state, eligibility_ends_at FROM makernet.person WHERE id = $1 FOR UPDATE`,
      [personId],
    );
    if (!target || !isEligible(await loadPrincipal(db, target)))
      throw new Error("Target not eligible");
    await db.query(
      `INSERT INTO makernet.role_grant(person_id, role, scope_type, granted_by)
      VALUES ($1, $2, 'site', $3) ON CONFLICT DO NOTHING`,
      [personId, role, actor.id],
    );
    await audit(
      db,
      actor.id,
      "role_grant",
      "person",
      personId,
      "site",
      reason.trim(),
    );
  });
}

export async function grantStaffReviewerScope(
  actor: Principal,
  personId: string,
  skillId: string,
  reason: string,
): Promise<void> {
  if (!isEligible(actor) || !actor.siteRoles.has("administrator"))
    throw new Error("Forbidden");
  if (!reason.trim()) throw new Error("Reason required");
  await transaction(async (db) => {
    const [person, skill] = await Promise.all([
      one<PersonRow>(
        db,
        `SELECT id, state, eligibility_ends_at FROM makernet.person WHERE id = $1`,
        [personId],
      ),
      one<{ id: string }>(
        db,
        `SELECT id FROM makernet.skill WHERE id = $1 AND status = 'active'`,
        [skillId],
      ),
    ]);
    if (!person || !isEligible(await loadPrincipal(db, person)) || !skill)
      throw new Error("Invalid target or skill");
    await db.query(
      `INSERT INTO makernet.role_grant(person_id, role, scope_type, scope_id, granted_by)
      VALUES ($1, 'staff_reviewer', 'skill', $2, $3) ON CONFLICT DO NOTHING`,
      [personId, skillId, actor.id],
    );
    await audit(
      db,
      actor.id,
      "role_grant",
      "person",
      personId,
      `skill:${skillId}`,
      reason.trim(),
    );
  });
}

export async function revokeRole(
  actor: Principal,
  personId: string,
  role: SiteRole,
  scopeId: string | null,
  reason: string,
): Promise<void> {
  if (!isEligible(actor) || !actor.siteRoles.has("administrator"))
    throw new Error("Forbidden");
  if (!reason.trim()) throw new Error("Reason required");
  await transaction(async (db) => {
    const changed = await db.query(
      `UPDATE makernet.role_grant SET revoked_at = now()
      WHERE person_id = $1 AND role = $2 AND scope_id IS NOT DISTINCT FROM $3::uuid
        AND revoked_at IS NULL`,
      [personId, role, scopeId],
    );
    if (!changed.rowCount) throw new Error("Role not found");
    await audit(
      db,
      actor.id,
      "role_revoke",
      "person",
      personId,
      scopeId ? `skill:${scopeId}` : "site",
      reason.trim(),
    );
  });
}

export async function createOrganization(
  actor: Principal,
  name: string,
  type: "club" | "lab" | "department",
  reason: string,
): Promise<string> {
  if (!isEligible(actor) || !actor.siteRoles.has("administrator"))
    throw new Error("Forbidden");
  if (
    name.trim().length < 2 ||
    name.trim().length > 120 ||
    !["club", "lab", "department"].includes(type) ||
    !reason.trim()
  )
    throw new Error("Invalid organization");
  return transaction(async (db) => {
    const organization = await one<{ id: string }>(
      db,
      `INSERT INTO makernet.organization(name, type)
      VALUES ($1, $2) RETURNING id`,
      [name.trim(), type],
    );
    await audit(
      db,
      actor.id,
      "organization_create",
      "organization",
      organization!.id,
      "site",
      reason.trim(),
    );
    return organization!.id;
  });
}

export async function setOrganizationMembership(
  actor: Principal,
  personId: string,
  organizationId: string,
  role: "member" | "officer",
  activeMembership: boolean,
  reason: string,
): Promise<void> {
  if (!isEligible(actor) || !reason.trim())
    throw new Error("Forbidden or missing reason");
  const admin = actor.siteRoles.has("administrator");
  if (
    !admin &&
    (!actor.officerOrganizations.has(organizationId) || role !== "member")
  )
    throw new Error("Forbidden");
  await transaction(async (db) => {
    const person = await one<PersonRow>(
      db,
      `SELECT id, state, eligibility_ends_at FROM makernet.person
      WHERE id = $1 FOR UPDATE`,
      [personId],
    );
    if (
      activeMembership &&
      (!person || !isEligible(await loadPrincipal(db, person)))
    )
      throw new Error("Target not eligible");
    const existing = await one<{ role: string }>(
      db,
      `SELECT role FROM makernet.organization_membership
      WHERE person_id = $1 AND organization_id = $2 AND status = 'active' FOR UPDATE`,
      [personId, organizationId],
    );
    if (!admin && existing?.role === "officer")
      throw new Error("Only administrators may change an officer");
    if (activeMembership) {
      await db.query(
        `UPDATE makernet.organization_membership SET status = 'ended', ended_at = now()
        WHERE person_id = $1 AND organization_id = $2 AND status = 'active'`,
        [personId, organizationId],
      );
      await db.query(
        `INSERT INTO makernet.organization_membership(person_id, organization_id, role, status)
        VALUES ($1, $2, $3, 'active')`,
        [personId, organizationId, role],
      );
    } else {
      await db.query(
        `UPDATE makernet.organization_membership SET status = 'ended', ended_at = now()
        WHERE person_id = $1 AND organization_id = $2 AND status = 'active'`,
        [personId, organizationId],
      );
    }
    await audit(
      db,
      actor.id,
      activeMembership ? "membership_grant" : "membership_end",
      "person",
      personId,
      `organization:${organizationId}`,
      reason.trim(),
    );
  });
}

export async function listAccounts(actor: Principal) {
  if (!isEligible(actor) || !actor.siteRoles.has("administrator"))
    throw new Error("Forbidden");
  const result = await pool().query<{
    id: string;
    display_name: string;
    institution_email: string;
    state: AccountState;
  }>(`
    SELECT id, display_name, institution_email, state FROM makernet.person
    ORDER BY created_at DESC LIMIT 100`);
  return result.rows;
}

export async function listOrganizations(actor: Principal) {
  if (!isEligible(actor) || !actor.siteRoles.has("administrator"))
    throw new Error("Forbidden");
  const result = await pool().query<{
    id: string;
    name: string;
    type: string;
  }>(`
    SELECT id, name, type FROM makernet.organization ORDER BY name`);
  return result.rows;
}

export async function auditHistory(actor: Principal, limit = 50) {
  if (!isEligible(actor) || !actor.siteRoles.has("administrator"))
    throw new Error("Forbidden");
  const result = await pool().query<{
    id: number;
    actor_id: string | null;
    action: string;
    target_type: string;
    target_id: string;
    scope: string;
    reason: string;
    occurred_at: Date;
  }>(`SELECT * FROM makernet.audit_event ORDER BY id DESC LIMIT $1`, [
    Math.min(Math.max(limit, 1), 100),
  ]);
  return result.rows;
}

export async function ownOrganizations(
  actor: Principal | null,
): Promise<{ id: string; name: string; role: string }[]> {
  if (!isEligible(actor)) throw new Error("Forbidden");
  const result = await pool().query<{ id: string; name: string; role: string }>(
    `
    SELECT o.id, o.name, m.role FROM makernet.organization_membership m
    JOIN makernet.organization o ON o.id = m.organization_id
    WHERE m.person_id = $1 AND m.status = 'active' ORDER BY o.name`,
    [actor.id],
  );
  return result.rows;
}
