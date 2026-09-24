import { NextResponse } from "next/server";
import {
  currentPrincipal,
  sameOriginPost,
  siteUrl,
} from "@/modules/identity/web";
import {
  canAdminister,
  type AccountState,
  type SiteRole,
} from "@/modules/identity/policy";
import {
  createOrganization,
  grantSiteRole,
  grantStaffReviewerScope,
  revokeRole,
  setAccountState,
  setOrganizationMembership,
} from "@/modules/identity/service";

export async function POST(request: Request) {
  if (!sameOriginPost(request))
    return new Response("Forbidden", { status: 403 });
  const actor = await currentPrincipal();
  if (!actor) return new Response("Unauthorized", { status: 401 });
  if (!canAdminister(actor)) return new Response("Forbidden", { status: 403 });
  const form = await request.formData();
  const value = (key: string) => String(form.get(key) ?? "");
  const operation = value("operation");
  try {
    if (operation === "state")
      await setAccountState(
        actor,
        value("personId"),
        value("state") as AccountState,
        value("reason"),
      );
    else if (operation === "grantRole") {
      if (value("role") === "staff_reviewer")
        await grantStaffReviewerScope(
          actor,
          value("personId"),
          value("skillId"),
          value("reason"),
        );
      else
        await grantSiteRole(
          actor,
          value("personId"),
          value("role") as "moderator" | "administrator",
          value("reason"),
        );
    } else if (operation === "revokeRole")
      await revokeRole(
        actor,
        value("personId"),
        value("role") as SiteRole,
        value("role") === "staff_reviewer" ? value("skillId") : null,
        value("reason"),
      );
    else if (operation === "createOrganization")
      await createOrganization(
        actor,
        value("name"),
        value("type") as "club" | "lab" | "department",
        value("reason"),
      );
    else if (operation === "grantMembership" || operation === "endMembership")
      await setOrganizationMembership(
        actor,
        value("personId"),
        value("organizationId"),
        value("membershipRole") as "member" | "officer",
        operation === "grantMembership",
        value("reason"),
      );
    else throw new Error("Unknown operation");
    return NextResponse.redirect(
      siteUrl(request, "/admin/access?result=saved"),
      303,
    );
  } catch {
    return NextResponse.redirect(
      siteUrl(request, "/admin/access?result=invalid"),
      303,
    );
  }
}
