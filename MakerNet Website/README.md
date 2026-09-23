# MakerNet

MakerNet connects campus makers, skills, and practical guides. This folder contains the website workspace. The repository is following [the website execution plan](../MakerNet-Website-Execution-Plan.md) in subsystem order. Subsystem 0 is in verification; product workflows have not been implemented.

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

Open `http://127.0.0.1:3000`. `/api/health` reports liveness, version, and commit; `/api/ready` checks Postgres. Local object storage is at `http://127.0.0.1:9001` and captured email is at `http://127.0.0.1:8025`.

## Verification

```powershell
npm.cmd run format:check
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run db:check
npm.cmd run db:verify
npm.cmd run build
npm.cmd run test:e2e
```

`db:verify` needs Postgres. The other checks can run without Docker. See [local setup and recovery](docs/runbooks/local-setup.md), [staging deployment](docs/runbooks/staging-deployment.md), and the [Subsystem 0 checklist](docs/subsystem-checklists/00-foundation.md).

The browser command starts the production standalone build on a free port. Run `npm.cmd run build` first. It loads `apps/web/.env.local` for local verification or uses environment variables supplied by CI.

## Local staging

From a clean checkout, run `npm.cmd run staging:env`, then `docker compose --env-file infra/staging/.env.staging.local -f infra/staging/compose.yaml up -d --build --wait`. Run `npm.cmd run staging:verify` to check version, commit, health, and readiness six times over 50 seconds. Staging listens on `http://127.0.0.1:3001`; see the [deployment runbook](docs/runbooks/staging-deployment.md).

## Module ownership

`apps/web` serves pages and routes. `apps/worker` is reserved for durable background jobs. `packages/db` owns migrations. UI, contracts, and shared configuration packages are reserved for the first subsystems that need them. Product modules must enforce their own service policies; pages compose them through typed boundaries.
