export type AccountState = "active" | "suspended" | "departed" | "deleted";
export type Audience = "public" | "college" | "organization" | "private";
export type SiteRole = "moderator" | "staff_reviewer" | "administrator";

export interface Principal {
  id: string;
  state: AccountState;
  eligibilityEndsAt: Date | null;
  organizations: ReadonlySet<string>;
  officerOrganizations: ReadonlySet<string>;
  siteRoles: ReadonlySet<SiteRole>;
  staffSkillScopes: ReadonlySet<string>;
}

export interface AccessRule {
  audience: Audience;
  organizationId?: string | null;
  personId?: string | null;
  collaborators?: ReadonlySet<string>;
}

export function isEligible(
  principal: Principal | null,
  now = new Date(),
): principal is Principal {
  return Boolean(
    principal &&
    principal.state === "active" &&
    (!principal.eligibilityEndsAt || principal.eligibilityEndsAt > now),
  );
}

export function canRead(
  principal: Principal | null,
  rule: AccessRule,
  now = new Date(),
): boolean {
  if (rule.audience === "public") return true;
  if (!isEligible(principal, now)) return false;
  if (rule.audience === "college") return true;
  if (rule.audience === "organization")
    return Boolean(
      rule.organizationId && principal.organizations.has(rule.organizationId),
    );
  return Boolean(
    (rule.personId && principal.id === rule.personId) ||
    rule.collaborators?.has(principal.id),
  );
}

export function canModerate(principal: Principal | null): boolean {
  return (
    isEligible(principal) &&
    (principal.siteRoles.has("moderator") ||
      principal.siteRoles.has("administrator"))
  );
}

export function canAdminister(principal: Principal | null): boolean {
  return isEligible(principal) && principal.siteRoles.has("administrator");
}

export function canManageOrganization(
  principal: Principal | null,
  organizationId: string,
): boolean {
  return (
    isEligible(principal) && principal.officerOrganizations.has(organizationId)
  );
}

export function mostRestrictive(...rules: AccessRule[]): AccessRule[] {
  // Keeping each predicate prevents two different organization scopes from being
  // incorrectly reduced to a single wider audience.
  return rules;
}

export function canReadAll(
  principal: Principal | null,
  rules: AccessRule[],
): boolean {
  return rules.every((rule) => canRead(principal, rule));
}

export function intersectAudience(rules: AccessRule[]): AccessRule {
  if (rules.some((rule) => rule.audience === "private"))
    return { audience: "private" };
  const organizations = new Set(
    rules
      .filter((rule) => rule.audience === "organization")
      .map((rule) => rule.organizationId),
  );
  if (
    organizations.size > 1 ||
    organizations.has(null) ||
    organizations.has(undefined)
  )
    return { audience: "private" };
  if (organizations.size === 1)
    return { audience: "organization", organizationId: [...organizations][0] };
  if (rules.some((rule) => rule.audience === "college"))
    return { audience: "college" };
  return { audience: "public" };
}
