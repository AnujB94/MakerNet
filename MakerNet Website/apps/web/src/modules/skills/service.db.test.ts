import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { pool } from "@/modules/db";
import {
  addAlias,
  createSkill,
  deactivateSkill,
  listSkills,
  moveSkill,
  resolveSkillTerm,
} from "./service";
import type { Principal } from "@/modules/identity/policy";

const moderator: Principal = {
  id: "00000000-0000-4000-8000-000000000099",
  state: "active",
  eligibilityEndsAt: null,
  organizations: new Set(),
  officerOrganizations: new Set(),
  siteRoles: new Set(["moderator"]),
  staffSkillScopes: new Set(),
};

describe("skill taxonomy database invariants", () => {
  it("resolves every seeded canonical term and reviewed alias deterministically", async () => {
    const seeded = (await listSkills()).filter((skill) =>
      skill.id.startsWith("00000000-0000-4000-8000-"),
    );
    expect(seeded).toHaveLength(25);
    for (const skill of seeded)
      expect(
        (await resolveSkillTerm(` ${skill.name.toUpperCase()} `))?.id,
      ).toBe(skill.id);
    expect((await resolveSkillTerm("  additive   MANUFACTURING "))?.name).toBe(
      "3D printing",
    );
  });

  it("rejects unauthorized changes, cycles, collisions, and inactive resolution", async () => {
    const suffix = randomUUID().slice(0, 8);
    const member = { ...moderator, siteRoles: new Set<"moderator">() };
    await expect(
      createSkill(member, `Test root ${suffix}`, "Test", null),
    ).rejects.toThrow("Forbidden");
    // The moderator principal must correspond to an account for audit foreign keys.
    await pool().query(
      `INSERT INTO makernet.person(id, issuer, provider_subject, institution_email, display_name)
      VALUES ($1, 'urn:makernet:test', $2, $3, 'Moderator') ON CONFLICT (id) DO NOTHING`,
      [moderator.id, "moderator", "moderator@example.test"],
    );
    const root = await createSkill(
      moderator,
      `Test root ${suffix}`,
      "Test",
      null,
    );
    const child = await createSkill(
      moderator,
      `Test child ${suffix}`,
      "Test",
      root,
    );
    await expect(moveSkill(moderator, root, child)).rejects.toThrow(/cycle/);
    await expect(addAlias(moderator, root, "FDM printing")).rejects.toThrow();
    await addAlias(moderator, root, `Test alias ${suffix}`);
    expect((await resolveSkillTerm(`test alias ${suffix}`))?.id).toBe(root);
    await deactivateSkill(moderator, root);
    expect(await resolveSkillTerm(`Test root ${suffix}`)).toBeNull();
    expect(await resolveSkillTerm(`Test alias ${suffix}`)).toBeNull();
    await deactivateSkill(moderator, child);
  });
});
