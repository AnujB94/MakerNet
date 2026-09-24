import { NextResponse } from "next/server";
import { rotateSession } from "@/modules/identity/service";
import {
  sameOriginPost,
  setSessionCookie,
  siteUrl,
} from "@/modules/identity/web";

export async function POST(request: Request) {
  if (!sameOriginPost(request))
    return new Response("Forbidden", { status: 403 });
  const token = request.headers
    .get("cookie")
    ?.match(/(?:^|;\s*)makernet_session=([^;]+)/)?.[1];
  const replacement = token ? await rotateSession(token) : null;
  if (!replacement)
    return NextResponse.redirect(siteUrl(request, "/session-expired"), 303);
  const response = NextResponse.redirect(
    siteUrl(request, "/settings?renewed=1"),
    303,
  );
  setSessionCookie(response, replacement);
  return response;
}
