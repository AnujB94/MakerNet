import { NextResponse } from "next/server";
import { collegeOidcProvider, safeReturnTo } from "@/modules/identity/provider";
import { siteUrl } from "@/modules/identity/web";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const authorization = await collegeOidcProvider.begin!(
      safeReturnTo(url.searchParams.get("returnTo")),
    );
    return NextResponse.redirect(authorization);
  } catch {
    return NextResponse.redirect(
      siteUrl(request, "/sign-in?error=unavailable"),
    );
  }
}
