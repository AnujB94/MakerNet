import Link from "next/link";
import { serverEnvironment } from "@/config/env";
import { safeReturnTo } from "@/modules/identity/provider";

export const dynamic = "force-dynamic";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string; error?: string; sent?: string }>;
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
        Enter your email. We will send a private, one-time link that signs you
        in without a password.
      </p>
      {query.sent && (
        <p className="alert success" role="status">
          Check your inbox. If the address can receive mail, its sign-in link
          will arrive shortly and expire after 15 minutes.
        </p>
      )}
      {query.error === "invalid" && (
        <p className="alert error" role="alert">
          Enter a complete email address, such as name@example.com.
        </p>
      )}
      {query.error === "delivery" && (
        <p className="alert error" role="alert">
          MakerNet could not send the email. Try again in a moment.
        </p>
      )}
      {query.error === "expired" && (
        <p className="alert warning" role="alert">
          That link expired or was already used. Request a new one below.
        </p>
      )}
      <form className="form-stack" action="/auth/email/request" method="post">
        <input type="hidden" name="returnTo" value={returnTo} />
        <label className="field">
          <span className="field-label">Email address</span>
          <input
            className="field-control"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            maxLength={254}
            required
          />
        </label>
        <button className="button button-primary" type="submit">
          Email me a sign-in link
        </button>
      </form>
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
      <p>
        <Link href="/">Return home</Link>
      </p>
    </div>
  );
}
