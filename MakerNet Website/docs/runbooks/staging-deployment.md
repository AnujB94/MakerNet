# Staging deployment contract

**Status:** Local Docker staging is the agreed target for Subsystem 0 verification.

The staging host must run the image built from `MakerNet Website/infra/staging/Dockerfile`, using `MakerNet Website` as the build context, with production-like environment variables and a reachable Postgres database. Configuration is injected by the host secret store; no credentials belong in the repository or image.

Deployment order:

1. Record candidate commit, version, configuration revision, and migration list.
2. Back up staging Postgres before a risky migration.
3. Run `npm run db:migrate` using the candidate image and staging `DATABASE_URL`.
4. Start the image with `APP_ENV=staging` and all required configuration.
5. Probe `/api/health` for version and commit, then `/api/ready` for Postgres readiness.
6. Run the browser smoke test against staging and record the result.
7. Roll back the image to the prior tagged commit if health or acceptance fails. Forward-only migrations require a compatible prior image or a forward repair migration.

For local Docker staging, use a clean checkout of the candidate commit. From its `MakerNet Website` folder, run `npm run staging:env`, then `docker compose --env-file infra/staging/.env.staging.local -f infra/staging/compose.yaml up -d --build --wait`. The generated environment file is ignored by Git and contains random local credentials. Run `npm run staging:verify` to probe health, readiness, version, and commit six times over 50 seconds. The web endpoint is `http://127.0.0.1:3001` on the host. Record the candidate commit and probe result in the foundation checklist.
