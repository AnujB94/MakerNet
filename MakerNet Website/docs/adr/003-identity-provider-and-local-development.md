# ADR 003: Temporary passwordless email identity

- **Status:** Accepted as a user-directed temporary deviation; college SSO deferred
- **Date:** 2026-09-24
- **Subsystem:** 2 Identity and access control

## Context

College OIDC client details are unavailable. The user directed MakerNet to remove OIDC for now and accept any valid email address. The application still needs to prove control of the submitted address and must not allow an address typed into a form to impersonate its owner.

## Decision

Use passwordless email links. Normalize and validate the submitted address, send a random link that expires after 15 minutes, store only its hash, and consume it atomically once. Rate-limit issuance per address and return a generic success for rate-limited requests. Key accounts by issuer `urn:makernet:verified-email` plus normalized email address. Do not derive administrator, moderator, officer, or staff reviewer status from the email address; those grants remain audited MakerNet records.

Retain the development identity shortcut only on loopback when `APP_ENV` is `local` or `test`. Sessions continue to use opaque random tokens, hashes at rest, rotation, idle and absolute expiry, and secure cookies when `APP_ORIGIN` is HTTPS.

## Consequences

Any person who can receive mail at a syntactically valid address can create an account. This temporarily broadens the architecture's college-only eligibility boundary: the existing `college` audience means an active signed-in MakerNet account until institutional eligibility is restored. Profiles and guides remain unavailable anonymously, and organization/private checks still apply.

Restoring college OIDC requires an explicit account-linking or migration plan because the OIDC issuer/subject will differ from the temporary email identity. Matching accounts by email alone is insufficient for an automatic security-sensitive merge.

Production needs TLS PostgreSQL access, working SMTP delivery, and a verified sender. No provider secret is stored in Git.

## Verification

Unit tests cover accepted and rejected email shapes. Database tests cover rate limits, atomic single-use consumption, session creation, and replay rejection. Desktop and phone browser tests request a captured message, follow its link, reach the protected settings page, and confirm the link cannot be reused. Live SMTP delivery remains a deployment acceptance check.
