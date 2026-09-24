# Subsystem 2: Identity and access control

- **Status:** Local implementation and verification complete; release acceptance pending.
- **Branch:** `feat/identity-access`
- **Target tag:** `v0.3.0` (not created)

## Acceptance criteria and implementation

- [x] Local loopback-only development identity and college OIDC adapter behind one service boundary; college OIDC uses authorization code, PKCE, state, nonce, and verified institution email.
- [x] Account key is issuer plus provider subject. Active, suspended, departed, and deleted states are persisted.
- [x] Opaque hashed sessions rotate, expire, revoke, and clear cookies on logout.
- [x] Organization memberships, officer scope, moderator, staff reviewer, and administrator grants are service-authorized and audited.
- [x] Central policy applies public, college, organization, and private audiences with account eligibility checks.
- [x] Sign-in, callback, denial, expiry, account state, settings, and administration routes and screens exist.
- [x] Database tests cover identity continuity, session lifecycle, departure, officer limits, and privilege removal; browser tests cover local sign-in and protected routes.
- [ ] Register the real college OIDC application and run the provider sign-in and role matrix with college IT supplied claims.
- [ ] Live Vercel database readiness and manual screen-reader smoke test.
- [ ] Hosted CI, staging acceptance from exact candidate commit, merge, and annotated release tag.

## Verification and deviations

Local Postgres migration ledger verifies `0001`–`0009`. `npm run test:db` passes identity cases. The exact final automated run is recorded in the execution-plan status. No provider secrets are stored in Git. The local development adapter rejects non-loopback production use; its test issuer does not assert campus eligibility. College claim mapping and deployment remain pending IT configuration. The user directed work on later subsystems before this release gate closes.
