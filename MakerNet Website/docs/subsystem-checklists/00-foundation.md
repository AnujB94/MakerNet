# Subsystem 0 completion checklist

- **Status:** Verification
- **Staging candidate:** `7828a37` on `feat/foundation-setup`
- **Tag:** Pending

- [x] Architecture and deployment contract recorded in ADR 001 and ADR 002
- [x] npm workspace, runtime versions, Next.js app, and migration runner added
- [x] Local Postgres, object storage, and captured email configuration added
- [x] Environment validation, JSON logging, health, and readiness routes added
- [x] CI, issue, pull request, ADR, runbook, and checklist templates added
- [x] Clean dependency install and lockfile verified
- [x] Formatting, lint, typecheck, unit, browser, dependency audit, migration-file validation, and production build checks pass locally
- [x] Local Compose configuration parses
- [x] Docker service startup and empty-database migration verified
- [x] Deliberately broken test and SQL migration rejected locally, with rollback verified
- [x] Hosted CI demonstrated to fail on a broken test and broken migration
- [x] Clean checkout deployed to local Docker staging; version, readiness, browser, and uptime checked
- [x] Foundation PR passes hosted verification and secret scanning
- [x] Protected `main` requires both CI jobs and one independent approving review
- [ ] Independent review, merge to `main`, and annotated `v0.1.0` tag completed

## Verification evidence

- `npm ci`: passed from the pinned lockfile.
- `npm run format:check`, `npm run lint`, `npm run typecheck`: passed.
- `npm test`: seven tests passed across configuration, request correlation, and migration integrity.
- `npm run db:check`: one ordered migration validated. `docker compose -f infra/local/compose.yaml config --quiet`: passed.
- `npm run build`: Next.js 16.3.6 standalone build passed and produced `/`, `/api/health`, and `/api/ready`.
- `npm run test:e2e`: two production-build Chromium tests passed at desktop and mobile viewports; both screenshots were inspected.
- `npm run audit:deps`: zero reported vulnerabilities.
- Missing required startup configuration caused a startup failure, as required.
- Local Postgres, MinIO, and Mailpit started healthy. `0001_foundation.sql` applied to Postgres; `db:verify` reported one migration and the browser tests confirmed `/api/ready`.
- A deliberately failing Vitest assertion returned exit code 1. A syntactically invalid `0002` SQL migration returned exit code 1; after removing it, `db:verify` still reported exactly one applied migration.
- A fresh clone of `7828a37` built the local Docker staging image. The staging migration exited 0, the database ledger verified one migration, and the web container became healthy. Desktop and mobile browser tests passed against `http://127.0.0.1:3001`; reviewed screenshots are in `docs/screenshots`.
- Six staging health and readiness probes over 50 seconds returned `0.1.0-rc.1` and commit `7828a37a7a2a9b72b93477a57a395086e3ee735d`. Generated environment files were absent from the build image.
- The user explicitly authorized pushing the internal documents and website to private `https://github.com/AnujB94/MakerNet`. [Foundation PR #2](https://github.com/AnujB94/MakerNet/pull/2) passed both hosted CI jobs. [Broken-test PR #3](https://github.com/AnujB94/MakerNet/pull/3) failed at `npm test`; [invalid-migration PR #4](https://github.com/AnujB94/MakerNet/pull/4) failed at `db:migrate`. Both temporary PRs were closed and their branches deleted.
- `main` protection requires `verify`, `secrets`, one independent approving review, current status, linear history, and conversation resolution, including for administrators. Review, merge, and tag remain open.

## Release boundary

Subsystem 1 starts only after the open foundation gate items pass. The blank web app, `/api/health`, `/api/ready`, and npm workspace are the available interface.
