# MakerNet Product Architecture Review Log

This log records three review rounds, the tiered issues raised in each round, and the changes applied to `MakerNet-Product-Architecture.md`.

## Round 1

### Tier 1 Critical

1. Guide authorship was treated as proof that every author had every skill taught. **Resolved:** skill evidence is now contribution-specific, accepted by the contributor, and excluded by default for mentor and documenter roles.
2. Hazardous-guide policy required faculty approval in one section but mandated post-publication review in the locked decisions. **Resolved:** all sections now use the locked post-publication policy, a visible review state, revision-specific review, and emergency quarantine authority.
3. The MVP did not deliver the central evidence-backed discovery promise. **Resolved:** v0 now includes canonical skills, contribution-specific evidence, combined people and guide search, and mediated contact requests.
4. Open browsing conflicted with college-only, organization-only, and draft visibility. **Resolved:** the document now defines a visibility matrix and requires authorization before search, analytics, notifications, and media delivery.
5. Core workflows were missing from the data model. **Resolved:** the model now covers projects, help flows, certifications, subscriptions, notifications, moderation, contact requests, and quality signals.

### Tier 2 Material

1. Verification signals were conflated. **Resolved:** identity, guide-backed evidence, endorsements, staff review, and equipment clearance are distinct.
2. Guide, edit, invite, and moderation lifecycles were unclear. **Resolved:** explicit guide states, immutable revisions, invitations, review invalidation, and moderation cases were added.
3. Club officers and site moderators had ambiguous authority. **Resolved:** roles are separated and scoped, with an append-only privileged-action history.
4. Equipment certification lacked issuer, expiry, revocation, and evidence. **Resolved:** `EquipmentCertification` now models those fields.
5. Search ranking, event delivery, and media safety were underspecified. **Resolved:** ranking inputs, transactional outbox behavior, ACL checks, upload controls, and indexing behavior were added.
6. Privacy, account lifecycle, abuse prevention, and operations were absent. **Resolved:** dedicated rules now cover SSO lifecycle, field visibility, retention, blocking, rate limits, backups, monitoring, and incident ownership.

### Tier 3 Polish

1. Organization, club, skill, and tag terminology drifted. **Resolved:** `Organization` and canonical `Skill` are defined and used consistently.
2. The opening claim overstated the evidentiary value of guides. **Resolved:** it now distinguishes participation, contribution, and accepted skill evidence.
3. The architecture diagram misstated guide, skill, and equipment relationships. **Resolved:** the diagram now includes authorship and accurate equipment relations.
4. Acronyms and informal phrases reduced audience fit. **Resolved:** the document uses plain terms and defines the bill of materials on first use.

## Round 2

### Tier 1 Critical

1. Evidence was accepted before publication but then described as proposed again. **Resolved:** draft evidence candidates now move from proposed to accepted, then become active only when their revision is published.
2. Mutable guide-level authorship could rewrite historical attribution. **Resolved:** publication now creates immutable revision-attribution snapshots, and evidence references those snapshots.
3. Drafts and proposed edits had no storage model. **Resolved:** `GuideDraft` and `GuideEditProposal` now cover mutable authoring, review, and base revisions.
4. Publication and safety review were competing lifecycle states. **Resolved:** guide availability, draft status, revision publication, and revision safety are separate state machines with explicit visibility effects.
5. Guide stewardship was ambiguous. **Resolved:** `created_by` and scoped `GuideMaintainer` records now govern invitations, publication, visibility, archive, and transfer workflows.

### Tier 2 Material

1. Field-level profile visibility exceeded the model. **Resolved:** fixed profile fields have audience settings, and effective access uses the most restrictive source rule.
2. The core model combined distinct records and omitted equipment links and audit events. **Resolved:** help responses, notifications, reports, moderation cases, reactions, confirmations, equipment links, outbox events, and audit events now have separate records.
3. `PersonSkill` overlapped with evidence sources. **Resolved:** self-claims and evidence are authoritative records; `PersonSkillProjection` is a rebuildable read model.
4. Synchronous and asynchronous publication behavior conflicted. **Resolved:** the publish transaction writes the revision and outbox event; idempotent workers index, rebuild projections, and notify.
5. Uploads lacked a quarantine-to-promotion state. **Resolved:** files are nonservable until type, quota, and malware checks pass.
6. Departure, deletion, and immutable accountability records lacked precedence. **Resolved:** the document now includes a retention and departure matrix.
7. The MVP was broad and its exit criteria were subjective. **Resolved:** v0 is split into internal alpha and controlled pilot with a seeded skill set, numeric search goals, and a complete authorization matrix.

### Tier 3 Polish

1. Equipment-clearance permissions covered revocation but not issuance or renewal. **Resolved:** all three actions are assigned by equipment scope.
2. Taxonomy aliases were embedded in skills. **Resolved:** `SkillAlias` is a separate record with provenance and status.
3. Phase terminology and target-state journeys were unclear. **Resolved:** journeys now name their phase differences, and the delivery plan consistently uses v0, v1, and v2.
4. Concurrency and key constraints were implicit. **Resolved:** optimistic publication locks and representative uniqueness and cycle constraints are now stated.

## Round 3

### Tier 1 Critical

1. The diagram still referenced the retired guide-level authorship entity. **Resolved:** it now follows Guide -> GuideRevision -> GuideRevisionAuthorship -> SkillEvidence and includes organization and project relationships.
2. v0's controlled pilot and the phase named v1 Pilot collided. **Resolved:** the phases are now v0 MVP, v1 Feature Expansion, and v2 Campus Expansion.
3. A guide could become public after contributors accepted college-only credit. **Resolved:** revision credit snapshots an accepted audience; widening visibility requires renewed consent or a pseudonymous public byline.
4. Guide ownership, maintainer delegation, departure, and the locked proposed-edit workflow were incomplete. **Resolved:** initial ownership, scoped maintainer grants, last-maintainer protection, audited transfer, proposal review, and stale-proposal handling are explicit.

### Tier 2 Material

1. v0 equipment behavior conflicted with the v1 equipment directory. **Resolved:** v0 uses risk declarations and hazardous-activity metadata; canonical equipment selection, links, indexing, and clearances begin in v1.
2. Quarantine fallback and the current-revision pointer could disagree. **Resolved:** every read path now uses an effective-visible-revision resolver, and fallback requires an explicit reviewer safety decision.
3. Organization-only audiences lacked an organization ID. **Resolved:** audience records now contain both type and organization scope with a constraint.
4. Draft invitations and evidence candidates lacked explicit records. **Resolved:** `DraftContribution` and `DraftEvidenceCandidate` now hold their state and response times.
5. Project and showcase grouping, notification uniqueness, and media promotion were incomplete. **Resolved:** association entities, per-recipient delivery uniqueness, and an idempotent copy-and-verify media flow were added.
6. Hazard detection ignored guide text and attachment metadata. **Resolved:** deterministic checks cover all publishable text and attachment metadata, mismatches create cases, and overdue reviews escalate after one business day.
7. The search acceptance criterion combined incompatible thresholds. **Resolved:** at least 32 of 40 tasks must produce a defined useful result within 30 seconds, with median time reported separately.
8. Signed media URLs could outlive a visibility change. **Resolved:** restricted downloads use an authorization proxy; public URLs are short-lived and their bounded revocation delay is documented.

### Tier 3 Polish

1. Headings now use standard punctuation, stale release wording was replaced with explicit v0/v1 labels, and future role permissions are feature-gated.
2. Reaction types explicitly exclude solved confirmations, which remain a separate entity.
3. Revision-level safety wording now matches the separate guide and revision state models throughout.
