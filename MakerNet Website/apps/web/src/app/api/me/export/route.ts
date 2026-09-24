import { NextResponse } from "next/server";
import { currentPrincipal } from "@/modules/identity/web";
import { prepareProfileExport } from "@/modules/profiles/service";

export async function GET() {
  const actor = await currentPrincipal();
  if (!actor) return new Response("Unauthorized", { status: 401 });
  const data = await prepareProfileExport(actor);
  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": 'attachment; filename="makernet-profile.json"',
    },
  });
}
