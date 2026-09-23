# Subsystem 0 completion checklist

- **Status:** In progress
- **Tag and commit:** Pending

- [x] Architecture and deployment contract recorded in ADR 001 and ADR 002
- [x] npm workspace, runtime versions, Next.js app, and migration runner added
- [x] Local Postgres, object storage, and captured email configuration added
- [x] Environment validation, JSON logging, health, and readiness routes added
- [x] CI, issue, pull request, ADR, runbook, and checklist templates added
- [x] Clean dependency install and lockfile verified
- [x] Formatting, lint, typecheck, unit, browser, dependency audit, migration-file validation, and production build checks pass locally
- [x] Local Compose configuration parses
- [ ] Docker service startup and empty-database migration verified
- [ ] CI demonstrated to fail on a broken test and broken migration
- [ ] Clean checkout deployed to staging; version, readiness, and uptime checked
- [ ] Required reviews, protected `main`, and annotated `v0.1.0` tag completed

## Verification evidence

- `npm ci`: passed from the pinned lockfile.
- `npm run format:check`, `npm run lint`, `npm run typecheck`: passed.
- `npm test`: seven tests passed across configuration, request correlation, and migration integrity.
- `npm run db:check`: one ordered migration validated. `docker compose -f infra/local/compose.yaml config --quiet`: passed.
- `npm run build`: Next.js 16.3.6 standalone build passed and produced `/`, `/api/health`, and `/api/ready`.
- `npm run test:e2e`: two production-build Chromium tests passed at desktop and mobile viewports; both screenshots were inspected.
- `npm run audit:deps`: zero reported vulnerabilities.
- Missing required startup configuration caused a startup failure, as required.
- Docker Desktop's daemon reported `unable to start`; live database migration and readiness remain open.
- GitHub authentication is invalid, and no remote or staging target is configured. The user chose to leave the deployment gate pending.

## Release boundary

Subsystem 1 starts only after the open foundation gate items pass. The blank web app, `/api/health`, `/api/ready`, and npm workspace are the available interface.
