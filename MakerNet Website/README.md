# MakerNet

MakerNet connects campus makers, skills, and practical guides. This folder contains the website workspace. The repository follows [the website execution plan](../MakerNet-Website-Execution-Plan.md). Subsystems 0 and 1 are tagged. Subsystems 2–5 have local implementations pending production database and email integration, deployment, and release acceptance.

## Requirements

- Node.js 24.18.0 and npm 11.16.0
- Docker Desktop with a running daemon for local Postgres, MinIO, and Mailpit

## Local start

```powershell
npm.cmd ci
Copy-Item .env.example apps/web/.env.local
docker compose -f infra/local/compose.yaml up -d
npm.cmd run db:migrate
npm.cmd run db:verify
npm.cmd run dev
```

Open `http://127.0.0.1:3000`. Any syntactically valid email can request a passwordless sign-in link; local messages are captured at `http://127.0.0.1:8025`. The development-account shortcut is available only from loopback in `APP_ENV=local` or `test`. `/api/health` reports liveness, version, and commit; `/api/ready` checks Postgres. Local object storage is at `http://127.0.0.1:9001` for the later media subsystem.

## Verification

```powershell
npm.cmd run format:check
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run db:check
npm.cmd run db:verify
npm.cmd run test:db
npm.cmd run build
npm.cmd run test:e2e
```

`db:verify` and `test:db` need Postgres and the variables in `.env.example` exported to the shell. The other checks can run without Docker. See [local setup and recovery](docs/runbooks/local-setup.md), [staging deployment](docs/runbooks/staging-deployment.md), and the [subsystem checklists](docs/subsystem-checklists/02-identity-and-access.md).

The browser command starts the production standalone build on a free port. Run `npm.cmd run build` first. It loads `apps/web/.env.local` for local verification or uses environment variables supplied by CI.

## Local staging

From a clean checkout, run `npm.cmd run staging:env`, then `docker compose --env-file infra/staging/.env.staging.local -f infra/staging/compose.yaml up -d --build --wait`. Run `npm.cmd run staging:verify` to check version, commit, health, and readiness six times over 50 seconds. Staging listens on `http://127.0.0.1:3001`; see the [deployment runbook](docs/runbooks/staging-deployment.md).

## Module ownership

`apps/web` serves pages and routes. `apps/worker` is reserved for durable background jobs. `packages/db` owns migrations. Identity, skills, profiles, and guides live in `apps/web/src/modules`. Product modules enforce service policies; pages compose them through typed boundaries. The outbox stores events for later delivery, but no notification or search worker is active yet.
