import Link from "next/link";
import { serverEnvironment } from "@/config/env";
import { safeReturnTo } from "@/modules/identity/provider";

export const dynamic = "force-dynamic";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string; error?: string }>;
}) {
  const query = await searchParams;
  const returnTo = safeReturnTo(query.returnTo ?? "/");
  const env = serverEnvironment();
  const local = env.appEnv === "local" || env.appEnv === "test";
  return (
    <div className="container form-page">
      <p className="eyebrow">MakerNet / Identity</p>
      <h1>Sign in to the workshop</h1>
      <p>
        Use your college identity to publish, contribute, and manage your
        profile.
      </p>
      {query.error && (
        <p className="alert error" role="alert">
          Sign-in could not be completed. Check your account or try again.
        </p>
      )}
      {env.oidcIssuer && (
        <a
          className="button-link button-primary"
          href={`/auth/start?returnTo=${encodeURIComponent(returnTo)}`}
        >
          Continue with college SSO
        </a>
      )}
      {local && (
        <form className="form-stack" action="/auth/local" method="post">
          <h2>Development account</h2>
          <p className="field-hint">
            Local testing only. Enter a name to create a development identity.
          </p>
          <input type="hidden" name="returnTo" value={returnTo} />
          <label className="field">
            <span className="field-label">Account name</span>
            <input
              className="field-control"
              name="handle"
              required
              minLength={3}
              maxLength={32}
              autoComplete="username"
              pattern="[A-Za-z][A-Za-z0-9._-]{2,31}"
            />
          </label>
          <button className="button button-primary" type="submit">
            Sign in locally
          </button>
        </form>
      )}
      {!local && !env.oidcIssuer && (
        <p className="alert warning">
          College sign-in is awaiting configuration.
        </p>
      )}
      <p>
        <Link href="/">Return home</Link>
      </p>
    </div>
  );
}
