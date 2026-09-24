import "server-only";
import * as oidc from "openid-client";
import { serverEnvironment } from "@/config/env";
import { pool, transaction, one } from "@/modules/db";
import { hashToken, newToken, type IdentityClaims } from "./service";

export interface IdentityProvider {
  readonly kind: "development" | "oidc";
  begin?(returnTo: string): Promise<URL>;
  complete?(
    callbackUrl: URL,
  ): Promise<{ identity: IdentityClaims; returnTo: string }>;
}

let configuration: Promise<oidc.Configuration> | undefined;

function settings() {
  const env = serverEnvironment();
  if (
    !env.oidcIssuer ||
    !env.oidcClientId ||
    !env.oidcClientSecret ||
    !env.appOrigin ||
    !env.collegeEmailDomain
  )
    throw new Error("College OIDC configuration is incomplete");
  const issuer = new URL(env.oidcIssuer);
  const origin = new URL(env.appOrigin);
  if (
    env.appEnv !== "local" &&
    env.appEnv !== "test" &&
    (issuer.protocol !== "https:" || origin.protocol !== "https:")
  )
    throw new Error("College OIDC requires HTTPS");
  if (origin.pathname !== "/" || origin.search || origin.hash)
    throw new Error("APP_ORIGIN must be an origin");
  return {
    env,
    issuer,
    origin,
    redirectUri: new URL("/auth/callback", origin).href,
  };
}

async function client() {
  const { env, issuer } = settings();
  configuration ??= oidc.discovery(
    issuer,
    env.oidcClientId!,
    env.oidcClientSecret!,
  );
  return configuration;
}

export function safeReturnTo(value: string | null): string {
  return value && /^\/(?!\/)[^\\\r\n]*$/.test(value) ? value : "/";
}

export const collegeOidcProvider: IdentityProvider = {
  kind: "oidc",
  async begin(returnTo) {
    const config = await client();
    const { redirectUri } = settings();
    const state = newToken();
    const nonce = oidc.randomNonce();
    const verifier = oidc.randomPKCECodeVerifier();
    const challenge = await oidc.calculatePKCECodeChallenge(verifier);
    await pool().query(
      `
      INSERT INTO makernet.auth_flow(state_hash, code_verifier, nonce, return_to, expires_at)
      VALUES ($1, $2, $3, $4, now() + interval '10 minutes')`,
      [hashToken(state), verifier, nonce, safeReturnTo(returnTo)],
    );
    return oidc.buildAuthorizationUrl(config, {
      redirect_uri: redirectUri,
      scope: "openid email profile",
      response_type: "code",
      state,
      nonce,
      code_challenge: challenge,
      code_challenge_method: "S256",
    });
  },
  async complete(callbackUrl) {
    const config = await client();
    const { env, origin } = settings();
    if (callbackUrl.origin !== origin.origin)
      throw new Error("Invalid callback origin");
    const state = callbackUrl.searchParams.get("state");
    if (!state) throw new Error("Missing identity state");
    const flow = await transaction(async (db) =>
      one<{
        code_verifier: string;
        nonce: string;
        return_to: string;
      }>(
        db,
        `UPDATE makernet.auth_flow SET consumed_at = now()
      WHERE state_hash = $1 AND consumed_at IS NULL AND expires_at > now()
      RETURNING code_verifier, nonce, return_to`,
        [hashToken(state)],
      ),
    );
    if (!flow) throw new Error("Identity state expired or already used");
    const tokens = await oidc.authorizationCodeGrant(config, callbackUrl, {
      pkceCodeVerifier: flow.code_verifier,
      expectedNonce: flow.nonce,
      expectedState: state,
      idTokenExpected: true,
    });
    const claims = tokens.claims();
    if (!claims?.sub) throw new Error("Provider did not return a subject");
    const userInfo = await oidc.fetchUserInfo(
      config,
      tokens.access_token,
      claims.sub,
    );
    const email =
      typeof userInfo.email === "string"
        ? userInfo.email.trim().toLowerCase()
        : "";
    if (
      userInfo.email_verified !== true ||
      !email.endsWith(`@${env.collegeEmailDomain}`)
    )
      throw new Error("College email is not verified or eligible");
    const name = typeof userInfo.name === "string" ? userInfo.name.trim() : "";
    return {
      identity: {
        issuer: claims.iss,
        subject: claims.sub,
        email,
        displayName: name || email.split("@")[0],
      },
      returnTo: flow.return_to,
    };
  },
};

export function developmentIdentity(
  handle: string,
  requestUrl: URL,
): IdentityClaims {
  const env = serverEnvironment();
  if (env.appEnv !== "local" && env.appEnv !== "test")
    throw new Error("Development login disabled");
  if (!["localhost", "127.0.0.1", "[::1]"].includes(requestUrl.hostname))
    throw new Error("Development login requires loopback");
  const subject = handle.trim().toLowerCase();
  if (!/^[a-z][a-z0-9._-]{2,31}$/.test(subject))
    throw new Error("Invalid local account name");
  return {
    issuer: "urn:makernet:local-development",
    subject,
    email: `${subject}@local.makernet.invalid`,
    displayName: subject,
  };
}
