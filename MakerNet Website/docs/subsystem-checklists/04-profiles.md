# Subsystem 4: Profiles and self-declared skills

- **Status:** Local implementation and verification complete; release acceptance pending.
- **Branch:** `feat/identity-access`
- **Target tag:** `v0.5.0` (not created)

## Acceptance criteria and implementation

- [x] Profile fields, field audiences, organization scopes, self-declared canonical skills, and rebuildable projection are stored with constraints.
- [x] Effective profile access intersects the college ceiling, field setting, claim/evidence setting, and current membership.
- [x] View, edit, privacy, preview, willingness, correction, deactivation, and own-data export preparation exist.
- [x] Empty, unavailable, and pseudonymous responses avoid disclosing restricted fields.
- [x] Projection is purged on account departure, profile deactivation, membership loss, and explicit eligibility expiry update; reactivation rebuilds it.
- [x] Database tests compare owner, organization member, college outsider, and anonymous responses and projected rows.
- [ ] College SSO and production database integration, hosted CI, staging acceptance, merge, and annotated release tag.

## Verification and deviations

Profiles remain college-only. The anonymous preview returns no profile. Runtime read paths check expiry even if the wall clock passes a previously set eligibility date; the future search subsystem must also filter current eligibility when reading its projection. No background search delivery is implemented in this milestone.
