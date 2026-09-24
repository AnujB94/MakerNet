# Local setup and recovery

1. Install Node 24.18.0, npm 11.16.0, Git, and Docker Desktop with the daemon running.
2. Enter `MakerNet Website` and run `npm ci` from that folder.
3. Copy `.env.example` to `apps/web/.env.local`. The sample credentials are for local emulators only.
4. Start local services with `docker compose -f infra/local/compose.yaml up -d`.
5. Run `npm run db:check`, `npm run db:migrate`, and `npm run db:verify`.
6. Run `npm run dev` and open `http://127.0.0.1:3000`.
7. Check `http://127.0.0.1:3000/api/health` for liveness and version, then `/api/ready` for database readiness.
8. Use **Sign in** on loopback to create a local development member. To test administrative actions, run `npm run identity:bootstrap-admin -- --email <local-member-email>` after that member signs in.

Passwordless email sign-in is available in every environment. Enter any syntactically valid email, then open the captured message in Mailpit and follow its 15-minute, single-use link. Receiving the message proves control of the address. The local development-account shortcut remains loopback-only and is unavailable in staging or production. Production needs TLS PostgreSQL access, an SMTP provider, and a verified sender address. Put those values in the deployment secret store, never in this folder or chat. See [production credentials and Vercel deployment](production-credentials.md).

For database integration tests, export the nonsecret local values from `.env.example` into the shell, set `APP_ENV=test`, then run `npm run test:db`. These tests add isolated records to the local Postgres database. Run `npm run db:verify` to check the ten migration checksums. The production build and browser suite use the local `.env.local` file.

If the web process refuses to start, verify every required key in `apps/web/.env.local`. The error identifies the missing key and does not print its value. If `/api/ready` returns 503, check Docker Desktop and Postgres health before restarting the web process.

Do not erase Docker volumes to recover a failed migration. Inspect the migration ledger and SQL checksum, restore from a backup if a migration changed data, and create a forward repair migration.
