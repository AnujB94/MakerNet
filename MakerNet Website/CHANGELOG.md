# Changelog

## Unreleased

- Started Subsystem 0 repository and delivery foundation.
- Added a pinned npm workspace, blank Next.js app, environment checks, migration runner, local services, CI, and operational documentation.
- Moved the website workspace into `MakerNet Website` and deployed a clean checkout to local Docker staging with a separate database and generated credentials.
- Verified live migrations, readiness, desktop and mobile browser tests, and repeated staging health checks.
- Hosted CI passed on the foundation pull request and rejected deliberately broken test and migration pull requests at their intended steps. Protected `main` requires both CI jobs and an independent review.
- `v0.1.0` is pending independent review, merge, and tag.
