# Subsystem 5: Guide publishing, attribution, and evidence

- **Status:** Local implementation and verification complete; release acceptance pending.
- **Branch:** `feat/identity-access`
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
- [ ] College SSO and production database integration, hosted CI, staging acceptance, merge, and annotated release tag.

## Verification and deviations

Guides are text-only and college-only. Public publication and hazardous guide publication are blocked until the later safety subsystem. Older revisions keep their original audience when a guide's audience widens; a new revision uses the new audience. Object storage, notifications, search indexing, and moderation queues are outside this milestone. The outbox event is persisted but later worker delivery is not claimed.
