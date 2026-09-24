import { NextResponse } from "next/server";
import { collegeOidcProvider } from "@/modules/identity/provider";
import { createSession } from "@/modules/identity/service";
import { setSessionCookie, siteUrl } from "@/modules/identity/web";

export async function GET(request: Request) {
  try {
    const callback = siteUrl(
      request,
      `${new URL(request.url).pathname}${new URL(request.url).search}`,
    );
    const { identity, returnTo } =
      await collegeOidcProvider.complete!(callback);
    const { token } = await createSession(identity);
    const response = NextResponse.redirect(siteUrl(request, returnTo));
    setSessionCookie(response, token);
    return response;
  } catch {
    return NextResponse.redirect(siteUrl(request, "/access-denied"));
  }
}
