# Changelog

## Unreleased — Subsystems 2–5 candidate

- Added college OIDC adapter, local-only development sign-in, account/session lifecycle, scoped roles, and audit views.
- Added canonical skill taxonomy, reviewed aliases, moderator operations, browser and picker.
- Added member profiles, field privacy, self-declared skills, audience preview, export preparation, and projection guards.
- Added text-only collaborative guides, revision history, accepted attribution, evidence consent, visibility changes, and stewardship transfer.
- Added migrations `0002`–`0009`, database integration tests, desktop/mobile browser coverage, and CI database testing. Production SSO, PostgreSQL, and release acceptance remain pending.

## 0.2.0 - 2026-09-24

- Merged pull request #6 for the industrial editorial design system and application shell; tagged `v0.2.0` at `10d2909`.
- Desktop/mobile automated accessibility and local staging checks passed. Manual screen-reader review and Vercel dynamic-route readiness remain open.

## 0.1.0 - 2026-09-24

- Started Subsystem 0 repository and delivery foundation.
- Added a pinned npm workspace, blank Next.js app, environment checks, migration runner, local services, CI, and operational documentation.
- Moved the website workspace into `MakerNet Website` and deployed a clean checkout to local Docker staging with a separate database and generated credentials.
- Verified live migrations, readiness, desktop and mobile browser tests, and repeated staging health checks.
- Hosted CI passed on the foundation pull request and rejected deliberately broken test and migration pull requests at their intended steps. Protected `main` requires both CI jobs. The user explicitly waived mandatory approving reviews for this foundation release.
- Completed the foundation release through protected `main` and the annotated `v0.1.0` tag.
