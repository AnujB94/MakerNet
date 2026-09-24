import { NextResponse } from "next/server";
import { sendSignInEmail } from "@/modules/identity/email";
import { normalizeEmail, safeReturnTo } from "@/modules/identity/provider";
import {
  invalidateEmailSignIn,
  issueEmailSignIn,
} from "@/modules/identity/service";
import { sameOriginPost, siteUrl } from "@/modules/identity/web";

export async function POST(request: Request) {
  if (!sameOriginPost(request))
    return new Response("Forbidden", { status: 403 });
  const form = await request.formData();
  const email = normalizeEmail(String(form.get("email") ?? ""));
  const returnTo = safeReturnTo(String(form.get("returnTo") ?? "/"));
  if (!email)
    return NextResponse.redirect(
      siteUrl(
        request,
        `/sign-in?error=invalid&returnTo=${encodeURIComponent(returnTo)}`,
      ),
      303,
    );
  try {
    const token = await issueEmailSignIn(email, returnTo);
    if (token) {
      try {
        await sendSignInEmail(email, token, siteUrl(request, "/"));
      } catch (error) {
        await invalidateEmailSignIn(token);
        throw error;
      }
    }
    return NextResponse.redirect(siteUrl(request, "/sign-in?sent=1"), 303);
  } catch {
    return NextResponse.redirect(
      siteUrl(
        request,
        `/sign-in?error=delivery&returnTo=${encodeURIComponent(returnTo)}`,
      ),
      303,
    );
  }
}
