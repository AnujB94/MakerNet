import "server-only";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { serverEnvironment } from "@/config/env";
import { principalForToken, SESSION_COOKIE } from "./service";

export async function currentPrincipal() {
  return principalForToken((await cookies()).get(SESSION_COOKIE)?.value);
}

export function sessionCookie(
  secure = serverEnvironment().appEnv !== "local" &&
    serverEnvironment().appEnv !== "test",
) {
  const env = serverEnvironment();
  const configuredSecure =
    env.appEnv === "production" ||
    (env.appOrigin ? new URL(env.appOrigin).protocol === "https:" : secure);
  return {
    httpOnly: true,
    secure: configuredSecure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  };
}

export function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(SESSION_COOKIE, token, sessionCookie());
  response.headers.set("Cache-Control", "no-store");
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", { ...sessionCookie(), maxAge: 0 });
  response.headers.set("Cache-Control", "no-store");
}

export function sameOriginPost(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const env = serverEnvironment();
  if (env.appOrigin) return origin === env.appOrigin;
  if (env.appEnv !== "local" && env.appEnv !== "test") return false;
  const host = request.headers.get("host");
  if (!host) return false;
  try {
    const url = new URL(origin);
    return (
      url.protocol === "http:" &&
      ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) &&
      url.host === host
    );
  } catch {
    return false;
  }
}

export function siteUrl(request: Request, path: string): URL {
  const env = serverEnvironment();
  if (env.appOrigin) return new URL(path, env.appOrigin);
  if (env.appEnv === "local" || env.appEnv === "test") {
    const origin = request.headers.get("origin");
    if (origin) return new URL(path, origin);
    const host = request.headers.get("host");
    if (host && /^(127\.0\.0\.1|localhost|\[::1\]):\d+$/.test(host))
      return new URL(path, `http://${host}`);
  }
  return new URL(path, request.url);
}
