import { NextResponse } from "next/server";
import {
  currentPrincipal,
  sameOriginPost,
  siteUrl,
} from "@/modules/identity/web";
import { canModerate } from "@/modules/identity/policy";
import {
  addAlias,
  createSkill,
  deactivateSkill,
  moveSkill,
  renameSkill,
} from "@/modules/skills/service";

export async function POST(request: Request) {
  if (!sameOriginPost(request))
    return new Response("Forbidden", { status: 403 });
  const actor = await currentPrincipal();
  if (!canModerate(actor)) return new Response("Forbidden", { status: 403 });
  const form = await request.formData();
  const operation = String(form.get("operation") ?? "");
  const id = String(form.get("id") ?? "");
  const name = String(form.get("name") ?? "");
  const parentId = String(form.get("parentId") ?? "") || null;
  try {
    if (operation === "create")
      await createSkill(
        actor,
        name,
        String(form.get("category") ?? ""),
        parentId,
      );
    else if (operation === "rename") await renameSkill(actor, id, name);
    else if (operation === "alias") await addAlias(actor, id, name);
    else if (operation === "move") await moveSkill(actor, id, parentId);
    else if (operation === "deactivate") await deactivateSkill(actor, id);
    else throw new Error("Unknown operation");
    return NextResponse.redirect(
      siteUrl(request, "/admin/skills?result=saved"),
      303,
    );
  } catch {
    return NextResponse.redirect(
      siteUrl(request, "/admin/skills?result=invalid"),
      303,
    );
  }
}
