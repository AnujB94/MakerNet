# Production credentials and Vercel deployment

MakerNet through Subsystem 5 needs two external services: PostgreSQL and SMTP email. College OIDC is deferred. Object storage is optional until the media subsystem.

Never paste database passwords or SMTP keys into chat, source files, GitHub issues, or screenshots. Store them in Vercel environment variables.

## 1. Create and connect PostgreSQL

The shortest Vercel path is a managed Postgres provider such as Neon:

1. Open the MakerNet project in Vercel.
2. Open **Storage**, choose a PostgreSQL integration, and create a database in the closest region.
3. Connect it to the MakerNet project for **Production** and **Preview**.
4. In **Settings → Environment Variables**, confirm the integration supplied `DATABASE_URL`. If it used another name, create `DATABASE_URL` with the provider's pooled TLS connection string.
5. Keep the direct or unpooled connection string available only for migrations if the provider recommends it. Do not commit either connection string.

The database user must be able to create the `makernet` schema, tables, indexes, and functions. Runtime and migration users can be separated later; the current runner uses `DATABASE_URL` for both.

## 2. Configure outbound email

Use any SMTP provider that permits the chosen sender. For Resend:

1. Create a Resend account and verify a domain you control.
2. Create an API key for MakerNet.
3. Add `SMTP_URL` in Vercel with value `smtps://resend:YOUR_API_KEY@smtp.resend.com:465`.
4. Add `EMAIL_FROM` with a sender on the verified domain, for example `MakerNet <sign-in@example.edu>`.

If the SMTP username, password, or API key contains URL-reserved characters, percent-encode that component before placing it in `SMTP_URL`.

## 3. Add the remaining Vercel variables

Add these to the Production environment:

| Variable       | Value                                                                               |
| -------------- | ----------------------------------------------------------------------------------- |
| `APP_ENV`      | `production`                                                                        |
| `APP_ORIGIN`   | Final HTTPS origin without a trailing slash, such as `https://makernet.example.edu` |
| `DATABASE_URL` | Managed PostgreSQL TLS connection string                                            |
| `SMTP_URL`     | SMTP or SMTPS connection URL                                                        |
| `EMAIL_FROM`   | Verified display name and sender                                                    |
| `APP_VERSION`  | Candidate version, such as `0.6.0-rc.2`                                             |
| `BUILD_COMMIT` | Exact Git commit being deployed                                                     |

`APP_ORIGIN` must exactly match the address users open because it controls same-origin form checks, email links, and secure session cookies. Use a stable production domain or Vercel alias. A random preview URL needs its own matching preview value.

## 4. Link and migrate from the CLI

From `MakerNet Website/apps/web`, link the intended Vercel project if it is not already linked:

```powershell
vercel link
```

From `MakerNet Website`, apply all ten forward-only migrations using the project's production environment:

```powershell
vercel env run --environment production --cwd apps/web -- npm.cmd --prefix ../.. run db:migrate
vercel env run --environment production --cwd apps/web -- npm.cmd --prefix ../.. run db:verify
```

If the installed Vercel CLI does not support `env run`, use `vercel env pull` to an ignored temporary file, load it only in the current shell, run the two npm commands, and delete the temporary file immediately. Do not use the local `.env.example` credentials against production.

## 5. Deploy and accept

Deploy the exact candidate:

```powershell
vercel --prod --cwd apps/web
```

Then verify:

1. `/api/health` returns the expected version and commit.
2. `/api/ready` returns ready and proves the application can reach PostgreSQL.
3. A valid email receives a MakerNet message and its link signs in exactly once.
4. Reusing the same link is rejected.
5. Logout, session expiry, suspended-account denial, and role scoping work.
6. Profile privacy and guide attribution/evidence work on desktop and phone.
7. A manual screen-reader pass covers headings, field labels and errors, focus, alerts, and the sign-in result.

The GitHub-connected Vercel project currently reports `invalid_function_name` because its generated function path contains the space in `MakerNet Website`. The directly linked `apps/web` project packages successfully. Use that direct project for this deployment. The repository folder can be renamed in a later isolated delivery change if GitHub auto-deploy is required.
