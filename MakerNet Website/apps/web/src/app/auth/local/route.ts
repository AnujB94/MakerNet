import { NextResponse } from "next/server";
import { createSession } from "@/modules/identity/service";
import { developmentIdentity, safeReturnTo } from "@/modules/identity/provider";
import {
  sameOriginPost,
  setSessionCookie,
  siteUrl,
} from "@/modules/identity/web";

export async function POST(request: Request) {
  if (!sameOriginPost(request))
    return new Response("Forbidden", { status: 403 });
  const form = await request.formData();
  try {
    const claims = developmentIdentity(
      String(form.get("handle") ?? ""),
      new URL(request.url),
    );
    const { token } = await createSession(claims);
    const response = NextResponse.redirect(
      siteUrl(request, safeReturnTo(String(form.get("returnTo") ?? "/"))),
      303,
    );
    setSessionCookie(response, token);
    return response;
  } catch {
    return NextResponse.redirect(
      siteUrl(request, "/sign-in?error=invalid"),
      303,
    );
  }
}
