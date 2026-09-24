import { NextResponse } from "next/server";
import { completeEmailSignIn } from "@/modules/identity/service";
import { setSessionCookie, siteUrl } from "@/modules/identity/web";

export async function GET(request: Request) {
  try {
    const token = new URL(request.url).searchParams.get("token") ?? "";
    const session = await completeEmailSignIn(token);
    const response = NextResponse.redirect(siteUrl(request, session.returnTo));
    setSessionCookie(response, session.token);
    return response;
  } catch {
    return NextResponse.redirect(siteUrl(request, "/sign-in?error=expired"));
  }
}
