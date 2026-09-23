# ADR 001 Workspace and module boundaries

- **Status:** Accepted
- **Date:** 2026-09-24
- **Subsystem:** 0 Repository and Delivery Foundation

## Context

MakerNet is a single-college product. Its first release needs one coherent authorization and data model, with a separate worker process only when durable jobs are introduced. A repository split would complicate schema changes and release tracking before independent scaling is needed.

## Decision

Use one npm workspace with a Next.js web app, a worker package, database migration package, and reserved UI, contract, and configuration packages. Product modules begin in their named directories as subsystems ship. Database writes across modules must go through module services. Keep all migrations forward-only and commit a migration with its first consumer.

The web and worker may deploy as separate processes from the same commit. The initial worker package contains no job handlers; the outbox consumer will be added with the first feature that emits events.

## Consequences

One lockfile and release history cover the application. Build and CI run from the repository root. Empty reserved packages are structure, not shipped product features.

## Verification

Run `npm ci`, lint, typecheck, tests, migration validation, and a production build from a clean checkout. Verify the web health endpoint reports the deployed version and commit.
