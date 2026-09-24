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
- [x] GitHub `verify` and `secrets` checks pass on draft pull request #7.
- [x] Clean candidate `bffedef` builds in isolated local Docker staging; local desktop/mobile profile browser checks pass.
- [ ] Production email sign-in and database integration, merge, and annotated release tag.

## Verification and deviations

Profiles remain signed-in-only. During the temporary email-identity deviation, any verified email account satisfies the policy's `college` audience label. The anonymous preview returns no profile. Runtime read paths check expiry even if the wall clock passes a previously set eligibility date; the future search subsystem must also filter current eligibility when reading its projection. No background search delivery is implemented in this milestone.

Screenshots: [desktop](../screenshots/profile-desktop.png), [phone](../screenshots/profile-mobile.png).
