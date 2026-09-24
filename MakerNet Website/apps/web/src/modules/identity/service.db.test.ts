import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { pool } from "@/modules/db";
import {
  createOrganization,
  createSession,
  completeEmailSignIn,
  grantSiteRole,
  issueEmailSignIn,
  principalForToken,
  revokeSession,
  rotateSession,
  setAccountState,
  setOrganizationMembership,
} from "./service";

describe("identity database boundary", () => {
  it("keys accounts by issuer and subject, rotates and revokes sessions", async () => {
    const subject = `test-${randomUUID()}`;
    const claims = {
      issuer: "urn:makernet:integration",
      subject,
      email: `${subject}@example.test`,
      displayName: "Test member",
    };
    const first = await createSession(claims);
    const second = await createSession({
      ...claims,
      displayName: "Updated member",
    });
    expect(second.personId).toBe(first.personId);
    expect((await principalForToken(first.token))?.id).toBe(first.personId);
    const rotated = await rotateSession(first.token);
    expect(rotated).toBeTruthy();
    expect(await principalForToken(first.token)).toBeNull();
    expect((await principalForToken(rotated!))?.id).toBe(first.personId);
    await revokeSession(rotated!);
    expect(await principalForToken(rotated!)).toBeNull();
    expect((await principalForToken(second.token))?.id).toBe(first.personId);
  });

  it("removes sessions, membership, and privilege on departure", async () => {
    const prefix = randomUUID();
    const adminSession = await createSession({
      issuer: "urn:makernet:integration",
      subject: `admin-${prefix}`,
      email: `admin-${prefix}@example.test`,
      displayName: "Admin",
    });
    const targetSession = await createSession({
      issuer: "urn:makernet:integration",
      subject: `target-${prefix}`,
      email: `target-${prefix}@example.test`,
      displayName: "Target",
    });
    const db = pool();
    await db.query(
      `INSERT INTO makernet.role_grant(person_id, role, scope_type) VALUES ($1, 'administrator', 'site')`,
      [adminSession.personId],
    );
    const admin = await principalForToken(adminSession.token);
    expect(admin?.siteRoles.has("administrator")).toBe(true);
    await grantSiteRole(
      admin!,
      targetSession.personId,
      "moderator",
      "Integration authorization check",
    );
    expect(
      (await principalForToken(targetSession.token))?.siteRoles.has(
        "moderator",
      ),
    ).toBe(true);
    const organization = await db.query<{ id: string }>(
      `INSERT INTO makernet.organization(name, type) VALUES ($1, 'club') RETURNING id`,
      [`Test club ${prefix}`],
    );
    await db.query(
      `INSERT INTO makernet.organization_membership(person_id, organization_id, role, status)
      VALUES ($1, $2, 'member', 'active')`,
      [targetSession.personId, organization.rows[0].id],
    );
    expect(
      (await principalForToken(targetSession.token))?.organizations.has(
        organization.rows[0].id,
      ),
    ).toBe(true);
    await setAccountState(
      admin!,
      targetSession.personId,
      "departed",
      "Integration departure check",
    );
    expect(await principalForToken(targetSession.token)).toBeNull();
    expect(await rotateSession(targetSession.token)).toBeNull();
    const memberships = await db.query(
      `SELECT 1 FROM makernet.organization_membership WHERE person_id = $1 AND status = 'active'`,
      [targetSession.personId],
    );
    const roles = await db.query(
      `SELECT 1 FROM makernet.role_grant WHERE person_id = $1 AND revoked_at IS NULL`,
      [targetSession.personId],
    );
    const audit = await db.query(
      `SELECT action FROM makernet.audit_event WHERE target_id = $1`,
      [targetSession.personId],
    );
    expect(memberships.rowCount).toBe(0);
    expect(roles.rowCount).toBe(0);
    expect(audit.rows.map((row: { action: string }) => row.action)).toContain(
      "account_state",
    );
  });

  it("keeps officer membership changes within one organization and blocks officer escalation", async () => {
    const suffix = randomUUID();
    const create = async (name: string) => {
      const session = await createSession({
        issuer: "urn:makernet:integration",
        subject: `${name}-${suffix}`,
        email: `${name}-${suffix}@example.test`,
        displayName: name,
      });
      return { ...session, actor: (await principalForToken(session.token))! };
    };
    const admin = await create("admin");
    const officer = await create("officer");
    const member = await create("member");
    await pool().query(
      `INSERT INTO makernet.role_grant(person_id, role, scope_type)
      VALUES ($1, 'administrator', 'site')`,
      [admin.personId],
    );
    const adminActor = (await principalForToken(admin.token))!;
    const orgId = await createOrganization(
      adminActor,
      `Test organization ${suffix}`,
      "club",
      "Integration setup",
    );
    await setOrganizationMembership(
      adminActor,
      officer.personId,
      orgId,
      "officer",
      true,
      "Officer assignment",
    );
    const officerActor = (await principalForToken(officer.token))!;
    await setOrganizationMembership(
      officerActor,
      member.personId,
      orgId,
      "member",
      true,
      "Membership assignment",
    );
    expect(
      (await principalForToken(member.token))?.organizations.has(orgId),
    ).toBe(true);
    await expect(
      setOrganizationMembership(
        officerActor,
        member.personId,
        orgId,
        "officer",
        true,
        "Attempted escalation",
      ),
    ).rejects.toThrow("Forbidden");
    await expect(
      grantSiteRole(
        officerActor,
        member.personId,
        "moderator",
        "Attempted escalation",
      ),
    ).rejects.toThrow("Forbidden");
    await setOrganizationMembership(
      officerActor,
      member.personId,
      orgId,
      "member",
      false,
      "Membership ended",
    );
    expect(
      (await principalForToken(member.token))?.organizations.has(orgId),
    ).toBe(false);
  });

  it("uses a short-lived email link once and rate limits repeated requests", async () => {
    const email = `email-${randomUUID()}@example.test`;
    const token = await issueEmailSignIn(email, "/members/me");
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(await issueEmailSignIn(email, "/")).toBeNull();
    const session = await completeEmailSignIn(token!);
    expect(session.returnTo).toBe("/members/me");
    expect((await principalForToken(session.token))?.id).toBe(session.personId);
    const person = await pool().query<{
      institution_email: string;
      issuer: string;
    }>(`SELECT institution_email, issuer FROM makernet.person WHERE id = $1`, [
      session.personId,
    ]);
    expect(person.rows[0]).toEqual({
      institution_email: email,
      issuer: "urn:makernet:verified-email",
    });
    await expect(completeEmailSignIn(token!)).rejects.toThrow(
      /expired or already used/,
    );
  });
});
