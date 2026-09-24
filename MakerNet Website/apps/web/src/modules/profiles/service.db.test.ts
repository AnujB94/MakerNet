import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { pool } from "@/modules/db";
import { createSession, principalForToken } from "@/modules/identity/service";
import {
  addSkillClaim,
  deactivateProfile,
  getProfileView,
  previewProfile,
  setFieldVisibility,
  updateProfile,
} from "./service";

describe("profile privacy at the database boundary", () => {
  it("omits private and organization fields from responses and projections", async () => {
    const suffix = randomUUID();
    const ownerLogin = await createSession({
      issuer: "urn:makernet:test",
      subject: `owner-${suffix}`,
      email: `owner-${suffix}@example.test`,
      displayName: "Profile owner",
    });
    const memberLogin = await createSession({
      issuer: "urn:makernet:test",
      subject: `member-${suffix}`,
      email: `member-${suffix}@example.test`,
      displayName: "Club member",
    });
    const outsiderLogin = await createSession({
      issuer: "urn:makernet:test",
      subject: `outsider-${suffix}`,
      email: `outsider-${suffix}@example.test`,
      displayName: "College outsider",
    });
    const organization = await pool().query<{ id: string }>(
      `INSERT INTO makernet.organization(name, type)
      VALUES ($1, 'club') RETURNING id`,
      [`Privacy club ${suffix}`],
    );
    const orgId = organization.rows[0].id;
    for (const personId of [ownerLogin.personId, memberLogin.personId])
      await pool().query(
        `INSERT INTO makernet.organization_membership(person_id, organization_id, role, status)
        VALUES ($1, $2, 'member', 'active')`,
        [personId, orgId],
      );
    const owner = (await principalForToken(ownerLogin.token))!;
    const member = (await principalForToken(memberLogin.token))!;
    const outsider = (await principalForToken(outsiderLogin.token))!;
    await updateProfile(owner, {
      displayName: "Private Maker",
      biography: "Club-only biography",
      year: 2,
      department: "Secret department",
    });
    await setFieldVisibility(owner, "biography", "organization", orgId);
    await setFieldVisibility(owner, "department", "private", null);
    await setFieldVisibility(owner, "skill_claims", "organization", orgId);
    const skillId = "00000000-0000-4000-8000-000000000004";
    await addSkillClaim(
      owner,
      skillId,
      "Club-only experience",
      "college",
      null,
    );
    const own = (await getProfileView(owner, owner.id))!;
    expect(own.fields.department).toBe("Secret department");
    const club = (await getProfileView(member, owner.id))!;
    expect(club.fields.biography).toBe("Club-only biography");
    expect(club.fields).not.toHaveProperty("department");
    expect(club.claims?.[0]?.statement).toBe("Club-only experience");
    const college = (await getProfileView(outsider, owner.id))!;
    expect(JSON.stringify(college)).not.toContain("Club-only biography");
    expect(JSON.stringify(college)).not.toContain("Secret department");
    expect(JSON.stringify(college)).not.toContain("Club-only experience");
    expect(await getProfileView(null, owner.id)).toBeNull();
    expect(await previewProfile(owner, "anonymous", null)).toBeNull();
    const projection = await pool().query<{
      audience: string;
      audience_organization_id: string | null;
    }>(
      `
      SELECT audience, audience_organization_id FROM makernet.person_skill_projection
      WHERE person_id = $1 AND skill_id = $2`,
      [owner.id, skillId],
    );
    expect(projection.rows).toEqual([
      { audience: "organization", audience_organization_id: orgId },
    ]);
    await pool().query(
      `UPDATE makernet.organization_membership SET status = 'ended', ended_at = now()
      WHERE person_id = $1 AND organization_id = $2 AND status = 'active'`,
      [owner.id, orgId],
    );
    const membershipPurged = await pool().query(
      `SELECT 1 FROM makernet.person_skill_projection WHERE person_id = $1`,
      [owner.id],
    );
    expect(membershipPurged.rowCount).toBe(0);
    await setFieldVisibility(owner, "skill_claims", "private", null);
    const purged = await pool().query(
      `SELECT 1 FROM makernet.person_skill_projection WHERE person_id = $1`,
      [owner.id],
    );
    expect(purged.rowCount).toBe(0);
  });
});

describe("profile lifecycle", () => {
  it("restores its projection on reactivation and hides an expired member", async () => {
    const suffix = randomUUID();
    const login = await createSession({
      issuer: "urn:makernet:test",
      subject: `lifecycle-${suffix}`,
      email: `lifecycle-${suffix}@example.test`,
      displayName: "Lifecycle member",
    });
    const actor = (await principalForToken(login.token))!;
    const skillId = "00000000-0000-4000-8000-000000000004";
    await addSkillClaim(
      actor,
      skillId,
      "Can assemble paper models",
      "college",
      null,
    );
    await deactivateProfile(actor);
    const afterDeactivation = await pool().query(
      `SELECT 1 FROM makernet.person_skill_projection WHERE person_id = $1`,
      [actor.id],
    );
    expect(afterDeactivation.rowCount).toBe(0);
    await updateProfile(actor, {
      displayName: "Lifecycle member",
      biography: "Active again",
      year: 2,
      department: "Design",
    });
    const afterReactivation = await pool().query(
      `SELECT 1 FROM makernet.person_skill_projection WHERE person_id = $1 AND skill_id = $2`,
      [actor.id, skillId],
    );
    expect(afterReactivation.rowCount).toBe(1);
    await pool().query(
      `UPDATE makernet.person SET eligibility_ends_at = now() - interval '1 minute' WHERE id = $1`,
      [actor.id],
    );
    expect((await getProfileView(actor, actor.id))?.status).toBe("unavailable");
    const expiredProjection = await pool().query(
      `SELECT 1 FROM makernet.person_skill_projection WHERE person_id = $1`,
      [actor.id],
    );
    expect(expiredProjection.rowCount).toBe(0);
    expect(await principalForToken(login.token)).toBeNull();
  });
});
