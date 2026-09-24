import { NextResponse } from "next/server";
import { revokeSession } from "@/modules/identity/service";
import {
  clearSessionCookie,
  sameOriginPost,
  siteUrl,
} from "@/modules/identity/web";

export async function POST(request: Request) {
  if (!sameOriginPost(request))
    return new Response("Forbidden", { status: 403 });
  const token = request.headers
    .get("cookie")
    ?.match(/(?:^|;\s*)makernet_session=([^;]+)/)?.[1];
  if (token) await revokeSession(token);
  const response = NextResponse.redirect(siteUrl(request, "/"), 303);
  clearSessionCookie(response);
  return response;
}
