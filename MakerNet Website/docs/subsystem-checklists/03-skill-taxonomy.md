# Subsystem 3: Skill taxonomy

- **Status:** Local implementation and verification complete; release acceptance pending.
- **Branch:** `feat/identity-access`
- **Target tag:** `v0.4.0` (not created)

## Acceptance criteria and implementation

- [x] Canonical skills, parent relationships, aliases, normalization, shared-term uniqueness, and cycle prevention are enforced in schema and service.
- [x] Twenty-five canonical skills and reviewed aliases are seeded deterministically.
- [x] Scoped moderators can create, rename, move, alias, deactivate, and preview merges; unauthorized callers fail in the service.
- [x] Taxonomy browser, detail route, and keyboard usable picker operate at desktop and phone widths.
- [x] Database tests cover deterministic resolution, collisions, inactive entries, cycles, and mutation permissions.
- [x] Picker is integrated with the guide and profile forms without adding search delivery.
- [x] GitHub `verify` and `secrets` checks pass on draft pull request #7.
- [x] Clean candidate `bffedef` builds in isolated local Docker staging and passes migration and readiness checks.
- [ ] Merge and annotated release tag after identity and live runtime gates close.

## Verification and deviations

The seeded taxonomy is checked through the database tests and browser scans. Skill records created by tests are deactivated on cleanup. No public member or guide data is exposed through the taxonomy route. The user directed later subsystem work before this release gate closes.

Screenshots: [desktop](../screenshots/skills-desktop.png), [phone](../screenshots/skills-mobile.png).
