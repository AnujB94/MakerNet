# ADR 004: Restricted profile, guide, and evidence visibility

- **Status:** Accepted for local implementation
- **Date:** 2026-09-24
- **Subsystem:** 4 Profiles and 5 Guides

## Context

The internal alpha is college-only. Profile fields, contribution credit, guide revisions, and skill evidence have separate audience choices that must not accidentally widen one another. Older attribution must remain immutable.

## Decision

Compute each read from the intersection of the internal-alpha college ceiling and the applicable field, claim, evidence, guide, revision, and contributor audience. Enforce the decision before constructing the server response. Keep revisions and attribution snapshots immutable. A visibility widening request collects current revision contributor consent; it does not rewrite that revision's audience. A new revision may use the wider audience after consent. Accepted guide-backed skill evidence appears only while its effective revision and all audience conditions permit it. Projection rows are rebuildable from source records and are removed on profile deactivation, account departure, explicit eligibility expiry updates, membership end, and revision withdrawal. Future search reads must also check eligibility at query time for clock-driven expiry.

## Consequences

No anonymous profile or guide view, public publication, hazardous publication, media, notifications, or search delivery is enabled through Subsystem 5. The outbox records future work without sending it. Pseudonymous credit reveals the accepted byline and role without a person identifier or private note.

## Verification

Database tests cover profile audience filtering, organization membership loss, projection cleanup, pending and rejected contribution states, immutable attribution, pseudonymous credit, revision-specific visibility, ownership transfer, and withdrawal. Desktop and mobile browser tests exercise the guide-to-profile loop.
