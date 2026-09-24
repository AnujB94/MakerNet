# ADR 003: College OIDC and local development identity

- **Status:** Accepted for local implementation; production provider registration pending
- **Date:** 2026-09-24
- **Subsystem:** 2 Identity and access control

## Context

College SSO client details are not yet available. Identity must remain keyed to the provider identity, and a development flow must support local verification without weakening production access.

## Decision

Use OIDC authorization code with PKCE, state, nonce, discovery, and a verified institution email claim for the college adapter. Store the issuer and subject as the immutable account key. Do not derive administrator, moderator, officer, or staff reviewer status from email or provider groups. Those grants live in MakerNet tables and are audited. The local adapter is accessible only on loopback when `APP_ENV` is `local` or `test`; it cannot run as a staging or production login. Sessions use opaque random tokens, hashes at rest, rotation, idle and absolute expiry, and secure cookies when `APP_ORIGIN` is HTTPS.

## Consequences

IT must confirm issuer discovery, client registration, verified institution-email mapping, redirect URL, and eligibility claims before a live SSO acceptance test. Production also needs TLS Postgres access. Changing the provider issuer would create distinct identities and requires an explicit account migration; email alone never merges accounts.

## Verification

Identity database tests cover issuer/subject continuity, rotation, revocation, departed account access, and scoped officer permissions. Browser tests cover the local development login and protected routes. Live college sign-in remains open.
