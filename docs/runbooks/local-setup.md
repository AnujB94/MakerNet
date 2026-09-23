# Local setup and recovery

1. Install Node 24.18.0, npm 11.16.0, Git, and Docker Desktop with the daemon running.
2. Run `npm ci` from the repository root.
3. Copy `.env.example` to `apps/web/.env.local`. The sample credentials are for local emulators only.
4. Start local services with `docker compose -f infra/local/compose.yaml up -d`.
5. Run `npm run db:check`, `npm run db:migrate`, and `npm run db:verify`.
6. Run `npm run dev` and open `http://127.0.0.1:3000`.
7. Check `http://127.0.0.1:3000/api/health` for liveness and version, then `/api/ready` for database readiness.

If the web process refuses to start, verify every required key in `apps/web/.env.local`. The error identifies the missing key and does not print its value. If `/api/ready` returns 503, check Docker Desktop and Postgres health before restarting the web process.

Do not erase Docker volumes to recover a failed migration. Inspect the migration ledger and SQL checksum, restore from a backup if a migration changed data, and create a forward repair migration.
