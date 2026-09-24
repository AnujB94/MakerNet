import { NextResponse } from "next/server";
import {
  currentPrincipal,
  sameOriginPost,
  siteUrl,
} from "@/modules/identity/web";
import {
  addSkillClaim,
  deactivateProfile,
  removeSkillClaim,
  setFieldVisibility,
  setWillingness,
  updateProfile,
  type ProfileField,
} from "@/modules/profiles/service";
import type { Audience } from "@/modules/identity/policy";

export async function POST(request: Request) {
  if (!sameOriginPost(request))
    return new Response("Forbidden", { status: 403 });
  const actor = await currentPrincipal();
  if (!actor) return new Response("Unauthorized", { status: 401 });
  const form = await request.formData();
  const operation = String(form.get("operation") ?? "");
  const audience = String(form.get("audience") ?? "college") as Audience;
  const orgId = String(form.get("organizationId") ?? "") || null;
  let destination = "/members/me";
  try {
    if (operation === "edit") {
      destination = "/members/me/edit";
      const rawYear = String(form.get("year") ?? "");
      await updateProfile(actor, {
        displayName: String(form.get("displayName") ?? ""),
        biography: String(form.get("biography") ?? ""),
        year: rawYear ? Number(rawYear) : null,
        department: String(form.get("department") ?? ""),
      });
    } else if (operation === "help") {
      destination = "/members/me/help";
      await setWillingness(actor, form.get("willing") === "on");
    } else if (operation === "visibility") {
      destination = "/members/me/privacy";
      await setFieldVisibility(
        actor,
        String(form.get("field") ?? "") as ProfileField,
        audience,
        audience === "organization" ? orgId : null,
      );
    } else if (operation === "addSkill") {
      destination = "/members/me/skills";
      await addSkillClaim(
        actor,
        String(form.get("skillId") ?? ""),
        String(form.get("statement") ?? ""),
        audience,
        audience === "organization" ? orgId : null,
      );
    } else if (operation === "removeSkill") {
      destination = "/members/me/skills";
      await removeSkillClaim(actor, String(form.get("claimId") ?? ""));
    } else if (operation === "deactivate") {
      destination = "/members/me/privacy";
      await deactivateProfile(actor);
    } else throw new Error("Unknown profile operation");
    return NextResponse.redirect(siteUrl(request, "/members/me?saved=1"), 303);
  } catch {
    return NextResponse.redirect(
      siteUrl(request, `${destination}?error=invalid`),
      303,
    );
  }
}
