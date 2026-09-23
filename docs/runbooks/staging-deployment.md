# Staging deployment contract

**Status:** Prepared; target host and GitHub repository are not configured.

The staging host must run the image built from `infra/staging/Dockerfile` with production-like environment variables and a reachable Postgres database. Configuration is injected by the host secret store; no credentials belong in the repository or image.

Deployment order:

1. Record candidate commit, version, configuration revision, and migration list.
2. Back up staging Postgres before a risky migration.
3. Run `npm run db:migrate` using the candidate image and staging `DATABASE_URL`.
4. Start the image with `APP_ENV=staging` and all required configuration.
5. Probe `/api/health` for version and commit, then `/api/ready` for Postgres readiness.
6. Run the browser smoke test against staging and record the result.
7. Roll back the image to the prior tagged commit if health or acceptance fails. Forward-only migrations require a compatible prior image or a forward repair migration.

Once a host and repository are supplied, add a deployment workflow tied to the exact candidate commit and record its URL here. Do not mark Subsystem 0 complete until a clean checkout deploys and the live staging health and version checks pass.
