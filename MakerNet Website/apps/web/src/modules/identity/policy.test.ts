import { describe, expect, it } from "vitest";
import {
  canAdminister,
  canManageOrganization,
  canModerate,
  canRead,
  canReadAll,
  type Principal,
} from "./policy";

const member: Principal = {
  id: "person-1",
  state: "active",
  eligibilityEndsAt: null,
  organizations: new Set(["club-a"]),
  officerOrganizations: new Set(),
  siteRoles: new Set(),
  staffSkillScopes: new Set(),
};

describe("central authorization policy", () => {
  it("applies the audience matrix before a service returns data", () => {
    expect(canRead(null, { audience: "public" })).toBe(true);
    expect(canRead(null, { audience: "college" })).toBe(false);
    expect(canRead(member, { audience: "college" })).toBe(true);
    expect(
      canRead(member, { audience: "organization", organizationId: "club-a" }),
    ).toBe(true);
    expect(
      canRead(member, { audience: "organization", organizationId: "club-b" }),
    ).toBe(false);
    expect(canRead(member, { audience: "private", personId: "person-1" })).toBe(
      true,
    );
    expect(canRead(member, { audience: "private", personId: "person-2" })).toBe(
      false,
    );
  });

  it("denies all protected access immediately after departure or suspension", () => {
    for (const state of ["suspended", "departed", "deleted"] as const) {
      const actor = {
        ...member,
        state,
        siteRoles: new Set(["administrator"] as const),
      };
      expect(canRead(actor, { audience: "college" })).toBe(false);
      expect(canAdminister(actor)).toBe(false);
      expect(canModerate(actor)).toBe(false);
    }
    expect(
      canRead(
        { ...member, eligibilityEndsAt: new Date(0) },
        { audience: "college" },
      ),
    ).toBe(false);
  });

  it("requires every visibility rule, including both organization scopes", () => {
    expect(
      canReadAll(member, [
        { audience: "college" },
        { audience: "organization", organizationId: "club-a" },
        { audience: "organization", organizationId: "club-b" },
      ]),
    ).toBe(false);
  });

  it("keeps site and organization privileges separate", () => {
    const officer = { ...member, officerOrganizations: new Set(["club-a"]) };
    expect(canManageOrganization(officer, "club-a")).toBe(true);
    expect(canManageOrganization(officer, "club-b")).toBe(false);
    expect(canModerate(officer)).toBe(false);
    const moderator = { ...member, siteRoles: new Set(["moderator"] as const) };
    expect(canModerate(moderator)).toBe(true);
    expect(canAdminister(moderator)).toBe(false);
  });
});
