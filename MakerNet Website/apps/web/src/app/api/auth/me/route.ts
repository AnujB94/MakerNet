import { NextResponse } from "next/server";
import { pool, one } from "@/modules/db";
import { currentPrincipal } from "@/modules/identity/web";

export async function GET() {
  const principal = await currentPrincipal();
  if (!principal)
    return NextResponse.json(
      { signedIn: false },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  const person = await one<{ display_name: string }>(
    pool(),
    `SELECT display_name FROM makernet.person WHERE id = $1`,
    [principal.id],
  );
  return NextResponse.json(
    {
      signedIn: true,
      displayName: person?.display_name ?? "Member",
      moderator:
        principal.siteRoles.has("moderator") ||
        principal.siteRoles.has("administrator"),
      administrator: principal.siteRoles.has("administrator"),
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
