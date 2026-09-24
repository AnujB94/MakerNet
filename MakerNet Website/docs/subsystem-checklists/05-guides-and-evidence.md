# Subsystem 5: Guide publishing, attribution, and evidence

- **Status:** Implementation merged to `main`; production acceptance and release tag pending.
- **Merged:** Pull request #7 at `dc0f469`
- **Target tag:** `v0.6.0` (not created)

## Acceptance criteria and implementation

- [x] Guides, scoped maintainers, drafts, proposals, revisions, skills, contribution invitations, evidence candidates, immutable attribution, and evidence are persisted.
- [x] Last-owner protection, recipient-accepted stewardship transfer, departed-owner succession or archive, optimistic draft locks, and stale-proposal rejection are enforced.
- [x] Text guide editor covers type, goal, prerequisites, materials, steps, lessons, skills, visibility, and risk declaration.
- [x] Collaborators choose acceptance, audience limit, public byline, credit role, and evidence acceptance before publish.
- [x] One publication transaction snapshots attribution, activates consented evidence, advances revision pointers, records the outbox event, and rebuilds profile projection.
- [x] Detail, revision history, draft, proposal, invitation, archive, withdrawal, management, and consent screens exist.
- [x] Database tests cover stale publish, pending consent, pseudonymous credits, immutable attribution, proposal revision, evidence withdrawal, ownership transfer, last owner, visibility widening, and departure.
- [x] Desktop and phone browser flow includes guide creation, editing, publishing, and profile evidence with automated accessibility scans.
- [x] GitHub `verify` and `secrets` checks pass on draft pull request #7.
- [x] Clean candidate `bffedef` builds in isolated local Docker staging; local desktop/mobile guide browser checks pass.
- [x] Browser tests cover contributor invitation, consent, evidence acceptance, publication, and the resulting profile evidence on desktop and phone.
- [ ] Production email sign-in and database integration, merge, and annotated release tag.

## Verification and deviations

Guides are text-only and signed-in-only. During the temporary email-identity deviation, any verified email account satisfies the policy's `college` audience label. Public publication and hazardous guide publication are blocked until the later safety subsystem. Older revisions keep their original audience when a guide's audience widens; a new revision uses the new audience. Object storage, notifications, search indexing, and moderation queues are outside this milestone. The outbox event is persisted but later worker delivery is not claimed.

Screenshots: [desktop](../screenshots/guide-desktop.png), [phone](../screenshots/guide-mobile.png). Final local browser suite: 14 passed across desktop and phone, including the complete contributor-to-profile flow.
