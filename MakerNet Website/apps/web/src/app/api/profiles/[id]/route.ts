import { NextResponse } from "next/server";
import { currentPrincipal } from "@/modules/identity/web";
import { getProfileView } from "@/modules/profiles/service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await currentPrincipal();
  if (!actor) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;
  const view = await getProfileView(actor, id);
  if (!view) return new Response("Not found", { status: 404 });
  return NextResponse.json(view, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
