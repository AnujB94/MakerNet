# Subsystem 2: Identity and access control

- **Status:** Local implementation and verification complete; release acceptance pending.
- **Branch:** `feat/identity-access`
- **Target tag:** `v0.3.0` (not created)

## Acceptance criteria and implementation

- [x] Passwordless email identity accepts any syntactically valid email, proves control through a 15-minute single-use link, rate-limits issuance, and keeps the loopback-only development identity.
- [x] Account key is issuer plus provider subject. Active, suspended, departed, and deleted states are persisted.
- [x] Opaque hashed sessions rotate, expire, revoke, and clear cookies on logout.
- [x] Organization memberships, officer scope, moderator, staff reviewer, and administrator grants are service-authorized and audited.
- [x] Central policy applies public, college, organization, and private audiences with account eligibility checks.
- [x] Sign-in, email verification, denial, expiry, account state, settings, and administration routes and screens exist.
- [x] Database tests cover identity continuity, session lifecycle, departure, officer limits, and privilege removal; browser tests cover local sign-in and protected routes.
- [x] Desktop and phone browser tests request a captured email, follow its sign-in link, reach a protected route, and reject link replay.
- [ ] Configure production SMTP and run live delivery, replay, account-state, and role-matrix acceptance.
- [ ] Live Vercel database readiness and manual screen-reader smoke test.
- [x] GitHub `verify` and `secrets` checks passed on merged pull request #7; the passwordless-email follow-up is implementation commit `26ba026`.
- [x] Clean candidate `bffedef` builds in isolated local Docker staging and passes migrations, health, readiness, and desktop/mobile smoke checks.
- [ ] Live email sign-in and Vercel runtime acceptance, merge, and annotated release tag.

## Verification and deviations

Local Postgres migration ledger verifies `0001`–`0010`. `npm run test:db` passes identity cases. The exact final automated run is recorded in the execution-plan status. No provider secrets are stored in Git. The local development adapter rejects non-loopback production use. At the user's direction, verified email temporarily replaces OIDC and permits any address that receives the link; this broadens the locked college-only eligibility rule and must be revisited when institutional SSO returns. Production Postgres, SMTP delivery, and deployment acceptance remain open.
