# MakerNet Website Execution Plan

**Source:** MakerNet Product Architecture  
**Delivery rule:** Complete, verify, integrate, and tag one subsystem before starting the next.  
**Target:** v0 MVP internal alpha followed by a controlled campus pilot.

## Execution Status as of September 24 2026

**Current state:** Subsystem 0 is released as `v0.1.0`. Subsystem 1 was merged to `main` through pull request #6 and tagged `v0.2.0` at `10d2909`. Its manual screen-reader check and live dynamic-route readiness on Vercel remain open; the tag records the merged implementation, not those external acceptance checks. The user explicitly asked to proceed through Subsystem 5 while production services are unavailable. This is a deviation from the one-gate-at-a-time release rule. Subsystems 2–5 are implemented locally on `feat/identity-access` and have **not** been accepted, merged, or tagged. No production readiness is claimed.

**Subsystems 2–5 local implementation:** Migrations `0002`–`0010` add identity, memberships, scoped roles, sessions, passwordless email tokens, audit/outbox, taxonomy, profiles and visibility, guides, immutable revisions, contribution consent, evidence, stewardship, and projection guards. The web application includes local-only development sign-in, passwordless email sign-in, central service authorization, account administration, skills and moderation, profile editing/privacy/export, and text-only guide creation, collaboration, publishing, revision history, and withdrawal. Email links expire after 15 minutes, are hashed at rest, consumed once, and rate-limited. Hazardous guides and public profile/guide exposure remain disabled. The UI was inspected at desktop and mobile widths. Database tests cover identity lifecycle and scoped privileges, deterministic taxonomy and mutation rules, profile filtering/projection, and guide publication, attribution, evidence, transfer, consent, and departure.

**Candidate verification:** Candidate `bffedef48a41bf35f1140d926b0f6944020f11fe` was pushed to draft [pull request #7](https://github.com/AnujB94/MakerNet/pull/7). The full browser-flow follow-up is `11178772567c406d2a966374eaf7752efec7d54f`; GitHub `verify` and `secrets` jobs passed on both commits. Local formatting, lint, TypeScript, 15 unit tests, production build, nine migration-file checks, 10 database integration tests, dependency audit with zero vulnerabilities, and 14 desktop/mobile browser tests passed. The browser suite includes a full contributor invitation → consent → evidence → publication → profile flow and automated axe checks. All nine migrations and 10 database tests passed again on an empty local Postgres database; the existing local database was upgraded from the Subsystem 1 migration ledger. A fresh worktree of `bffedef` built isolated Docker staging `0.6.0-rc.1` on port 3003, applied and verified nine migrations, passed six health/readiness probe pairs over 50 seconds, and passed eight desktop/mobile foundation and design-system browser smoke tests. Generated credentials were absent from the web image.

**Passwordless-email update verification:** Implementation commit `26ba026` replaced OIDC on a clean follow-up branch from merged `main`. Formatting, lint, strict TypeScript, 27 unit tests, ten migration-file checks, the upgraded ten-migration ledger, 11 database integration tests, production build, dependency audit with zero vulnerabilities, and 16 desktop/mobile browser tests passed locally. Browser coverage requests a message from Mailpit, follows the delivered link, reaches a protected route, and rejects replay on both viewports. The first database-test invocation exposed that the npm script did not load the documented local environment file; the runner was corrected and all 11 cases then passed. The GitHub-connected Vercel check still fails at packaging with the previously recorded `invalid_function_name` folder-space error. Production PostgreSQL, SMTP delivery through the directly linked Vercel project, runtime acceptance, and the manual screen-reader check remain open.

**Vercel previews:** The direct `makernet` preview at `https://makernet-8677t64ia-anujb0904-7595s-projects.vercel.app` built and deployed; its `/design-system` route returned HTTP 200 through the authenticated CLI. Dynamic `/api/health` returned 500 because production runtime configuration is not supplied. The separate GitHub-connected `makernet2026` preview check failed after a successful build: Vercel reported `invalid_function_name` because a generated serverless function name included the space in `MakerNet Website`. This is a Vercel packaging configuration issue for that project's root path; the direct project successfully packages the same app directory. The GitHub `verify` and `secrets` checks are green; the Vercel check remains red. Do not promote or merge this draft as a release while live dependencies and accessibility acceptance are missing.

**Identity deviation:** On September 24 2026, the user directed removal of OIDC for now and allowed any valid email. MakerNet therefore proves address control through a passwordless email link and keys the temporary identity to normalized email. This explicitly broadens the locked college-only eligibility boundary: until institutional SSO returns, any active verified-email account satisfies the existing `college` audience policy label. Organization, private, account-state, role, attribution, safety, and public-visibility rules remain enforced. Restoring OIDC requires a deliberate account-linking or migration design; accounts must not be merged from an email match alone.

**External inputs required for release acceptance:** Configure TLS PostgreSQL runtime and migration access plus SMTP delivery and a verified sender directly in Vercel; no credentials belong in this repository or chat. Object storage is optional until Subsystem 6. Run a live email delivery and replay test, account-state and role matrix, live database readiness, and manual screen-reader smoke test. Until these pass, the dynamic Vercel site is not accepted as a functioning release. The exact setup is documented in `MakerNet Website/docs/runbooks/production-credentials.md`; local Docker staging and automated checks are recorded in the subsystem checklists below.

### Historical implementation and verification record

**Completed subsystem:** 0 Repository and Delivery Foundation, released as `v0.1.0`. The original architecture, review log, and this plan were committed as baseline `40135ad` on `main`. Foundation implementation was squash-merged through pull request #2 as `4e31370`; `7828a37` was the clean-checkout local staging candidate. Subsystem 1 is active on `feat/design-system-shell`.

**Implemented:** The website workspace now lives in `MakerNet Website`, with repository-level GitHub files and the three source documents remaining at the root. The workspace includes pinned Node and package versions; blank Next.js application; startup environment validation; structured logging and correlation IDs; liveness and Postgres readiness routes; forward-only migration runner with ordered files and checksums; local Postgres, MinIO, and Mailpit; a separate local Docker staging stack and standalone image; CI workflow; ADRs, runbooks, templates, README, and changelog. The GitHub repository `AnujB94/MakerNet` is public at the user's request and configured as `origin`.

**Local verification:** A clean `npm ci` completed after the folder move. Formatting, lint, strict TypeScript, seven unit tests, migration-file validation, production build, two Chromium browser tests at desktop and mobile viewports, Compose configuration parsing, and `npm audit --audit-level=high` passed. All three local Docker services became healthy; the foundation SQL migration applied and verified against Postgres, and browser tests confirmed `/api/ready`. Deliberately broken test and SQL migration inputs each produced a failing exit code; the failed SQL transaction rolled back and the original migration still verified. A fresh local clone of `7828a37` built and started a separate staging stack, verified its migration ledger, and passed desktop and mobile browser tests plus six health and readiness probes over 50 seconds with the expected version and commit. Its generated credentials were absent from the image. Browser screenshots were inspected. Startup rejected missing configuration as designed. The architecture and review documents were left unchanged.

**Hosted verification:** With the user's explicit authorization, the architecture documents and website were pushed to `AnujB94/MakerNet`, which was subsequently made public at the user's request. Foundation pull request #2 passed both `verify` and `secrets` jobs. Temporary pull request #3 failed specifically at `npm test` after formatting, lint, and typecheck passed. Temporary pull request #4 failed specifically at `npm run db:migrate` after the earlier checks passed. Both negative pull requests were closed and their remote branches deleted. `main` requires the `verify` and `secrets` checks, current branch status, linear history, and conversation resolution; administrators are included. The user explicitly changed the required approval count from one to zero for this foundation release.

**Release closure:** Pull request #2 passed both protected-branch checks and was squash-merged to `main`. The foundation release record is included on `main`, and the annotated `v0.1.0` tag identifies release commit `5347677`. Final `main` CI passed both jobs; foundation issue #1 was closed. All Subsystem 0 completion gates are met.

**Subsystem 1 progress:** The architecture's industrial editorial direction now has desktop and phone examples, a token layer, responsive shell, component workbench, reusable control and feedback patterns, and list, detail, editor, settings, and moderation template specimens. The home route links only to foundation health and version data. Eight production browser tests pass across desktop and phone projects, including axe WCAG A/AA scans with zero reported violations, keyboard paths, error associations, touch targets, and overflow. Screenshots were inspected and saved. Formatting, lint, TypeScript, eight unit tests, migration-file validation, production build, live database migration verification, and dependency audit pass. The live database test exposed a Windows CRLF conversion of the foundation SQL; the migration runner now hashes and executes canonical LF content, with a regression test and `.gitattributes` protection. The existing database ledger was preserved.

**Subsystem 1 staging and CI:** Draft pull request #6 passed both required hosted `verify` and `secrets` jobs. A clean clone of candidate `3dc265e` built an isolated local Docker staging stack on port 3002 with version `0.2.0-rc.1`; its database ledger verified one migration, eight desktop/phone browser tests passed, six health and readiness probe pairs passed over 50 seconds, and the web image contained no generated environment files. Foundation staging remains healthy on port 3001.

**Vercel preview:** Project `makernet` has a ready preview deployment at `https://makernet-1r9di2ms2-anujb0904-7595s-projects.vercel.app`. Its dedicated `apps/web/vercel.json` runs `npx next build`, avoiding the local Docker-only postbuild script. The protected `/design-system` route was verified through Vercel's authenticated bypass. Vercel SSO deployment protection is active. Dynamic routes currently return 500 because no remote Postgres, object storage, or SMTP values have been configured; do not add placeholder values or promote this preview until the production service configuration is supplied and readiness passes.

**Subsystem 1 open gate:** Manual screen-reader verification could not run because this environment exposed neither a visible browser through Browser Use nor the Windows Computer Use native helper. Remote runtime dependencies must also be configured and verified on Vercel. The earlier draft pull request was subsequently merged and `v0.2.0` tagged. The user directed continued local work through Subsystem 5 despite these open external checks.

**Implementation decisions:** ESLint 9.39.5 is pinned because ESLint 10.11.0 failed with the current Next React lint rule. The production browser runner launches the standalone build on a free local port and stops its own server process, avoiding a Windows teardown stall. The user selected this machine's Docker Desktop as the Subsystem 0 staging host. Staging uses a separate database and generated, ignored credentials; the image is built from the `MakerNet Website` folder of a clean checkout.

## 1. Execution Model

MakerNet will be built as a sequence of complete vertical subsystems. A subsystem includes its database schema, domain rules, service layer, routes, interface, permissions, tests, operational signals, and documentation. Work on the next subsystem does not begin until the current subsystem passes its completion gate and receives a Git tag.

Each subsystem follows the same eight-step cycle:

1. **Define the contract.** Write the user stories, permissions, data ownership, API inputs and outputs, error cases, and acceptance criteria. Record material technical decisions in an Architecture Decision Record.
2. **Design the data.** Add forward-only migrations, constraints, seed data, and rollback or recovery notes.
3. **Implement domain rules.** Keep business logic inside the subsystem module rather than page components or route handlers.
4. **Expose the service boundary.** Add typed service functions and REST endpoints where a browser, worker, or future client needs them.
5. **Build the interface.** Implement desktop and mobile layouts plus loading, empty, error, success, disabled, hover, active, and keyboard-focus states.
6. **Verify in isolation.** Run unit, database integration, permission, accessibility, and browser tests for the subsystem.
7. **Connect completed subsystems.** Integrate only with already tagged subsystems. Add contract and end-to-end tests for every new connection.
8. **Close and tag.** Update documentation and the changelog, deploy to staging, complete acceptance testing, merge to `main`, and create the subsystem release tag.

If a completion gate fails, the subsystem remains active. Bugs discovered in an earlier subsystem receive a patch release before current work continues.

## 2. Recommended Repository Structure

Use one repository and one modular codebase. The web process and worker may deploy separately, but they share domain modules, database models, validation schemas, and release history.

```text
makernet/
  apps/
    web/                  Next.js website and server routes
    worker/               Search, media, email, and outbox jobs
  packages/
    db/                   Schema, migrations, seeds, and test helpers
    ui/                   Design tokens and reusable interface components
    config/               Shared TypeScript, lint, test, and environment config
    contracts/            Shared schemas and typed API contracts
  modules/
    identity/
    skills/
    profiles/
    guides/
    media/
    search/
    contact/
    moderation/
  tests/
    e2e/
    authorization/
    fixtures/
  docs/
    adr/
    runbooks/
    subsystem-checklists/
  infra/
    local/
    staging/
  .github/
    workflows/
    pull_request_template.md
```

Every module owns its schema-facing repository functions, domain services, policies, background handlers, interface components, and tests. Cross-module database writes go through public module services. Pages may compose module interfaces but do not bypass their policies.

## 3. Version Control and Release Discipline

### Branches

- Protect `main`; it must always build, migrate, and pass the complete automated suite.
- Use short-lived branches named `feat/<subsystem>-<issue>`, `fix/<subsystem>-<issue>`, or `chore/<area>-<issue>`.
- Keep only one subsystem epic in active development. Small branches may divide that subsystem, but they merge through reviewed pull requests before its release gate.
- Do not maintain long-running integration or development branches. Staging deploys from `main` or from the exact release candidate commit.

### Commits and pull requests

- Use Conventional Commit prefixes: `feat`, `fix`, `test`, `docs`, `refactor`, `chore`, and `perf`.
- Keep schema migrations in the same pull request as the code that first uses them.
- Require one reviewer for ordinary work and two reviewers for authentication, authorization, public visibility, moderation, media access, and destructive migrations.
- **Subsystem 0 deviation:** At the user's explicit request, GitHub requires zero approving reviews for this foundation release. The `verify` and `secrets` checks remain mandatory. Revisit the review count before later security-sensitive subsystems.
- Each pull request must identify its subsystem, linked issue, migration effect, permission effect, tests, screenshots for UI changes, and rollback notes.
- Squash a noisy implementation branch when merging, while preserving a clear release history.

### Tags and versions

Until the campus pilot is stable, each completed subsystem increments the minor version:

| Tag | Completion milestone |
| --- | --- |
| `v0.1.0` | Repository and delivery foundation |
| `v0.2.0` | Design system and application shell |
| `v0.3.0` | Identity and access control |
| `v0.4.0` | Skill taxonomy |
| `v0.5.0` | Profiles and self-declared skills |
| `v0.6.0` | Guide publishing, attribution, and guide-backed evidence |
| `v0.7.0` | Media pipeline |
| `v0.8.0` | Unified search and discovery |
| `v0.9.0` | Contact requests and notifications |
| `v0.10.0` | Moderation, safety review, and public visibility |
| `v0.11.0-alpha.1` | Internal alpha candidate |
| `v0.11.0-beta.1` | Controlled-pilot candidate |
| `v0.11.0` | Accepted v0 MVP |

Use patch releases for corrections to a completed subsystem. Use annotated tags and generate a changelog from merged pull requests. Production and staging deployments must record the exact tag, commit, migration set, and configuration version.

### Migration safety

- Use forward-only migrations in normal development.
- Apply expand, migrate, contract for destructive schema changes across separate releases.
- Never combine a destructive column removal with the first code change that stops using it.
- Back up staging or production data before a risky migration and rehearse restoration.
- Seed data must be deterministic and must never grant privileged roles outside a test environment.

## 4. Interface Direction

Use an **industrial editorial** direction: practical, calm, and precise, like a well-maintained workshop notebook. Pages should favor readable lists, strong headings, useful metadata, and direct actions over dashboard decoration.

- Use warm neutral surfaces, charcoal text, and one primary cobalt accent. Reserve amber, red, and green for warning, error, and success states.
- Use an 8-pixel spacing system, a restrained type scale, and no more than two self-hosted font families.
- Give each screen one primary action. Use cards only for distinct entities such as a guide, person, equipment item, or help request.
- Keep body copy between 65 and 75 characters per line. Use clear left alignment for text-heavy pages.
- Support keyboard use end to end, visible focus rings, 44-by-44-pixel touch targets, sufficient contrast, reduced motion, and semantic headings.
- Treat mobile screens as task-focused layouts. Replace wide tables with labeled rows, summaries, or drill-down views.
- Motion is limited to feedback and state transitions, normally under 300 milliseconds and restricted to opacity, transform, and filter.

The first design-system release must document tokens and components in a component workbench or dedicated development route. New visual patterns cannot be introduced inside later subsystem pages without first becoming an approved reusable component or documented exception.

## 5. Subsystem Sequence

### Subsystem 0 Repository and Delivery Foundation

**Purpose:** Create a reliable development environment before product code exists.

1. Initialize Git and add the protected `main` workflow.
2. Create the workspace structure and pin runtime and package-manager versions.
3. Configure strict TypeScript, formatting, linting, unit tests, browser tests, and dependency checks.
4. Add local services for Postgres, object-storage emulation, and captured email.
5. Create environment validation. The application must fail at startup when required configuration is missing.
6. Add continuous integration for install, lint, typecheck, tests, production build, migration validation, and secret scanning.
7. Create staging deployment, preview deployment, structured logging, health endpoints, and basic uptime monitoring.
8. Add pull-request, issue, ADR, runbook, and subsystem completion templates.

**Completion gate:** A blank application deploys from a clean checkout; CI blocks a deliberately broken test and migration; local setup works from the README; staging reports version and health; no secrets are committed.

**Release:** `v0.1.0`

### Subsystem 1 Design System and Application Shell

**Purpose:** Finish the visual and interaction foundation before feature screens multiply.

1. Approve the industrial editorial direction with desktop and mobile examples.
2. Define color, spacing, typography, radius, elevation, motion, breakpoint, and focus tokens.
3. Build buttons, links, inputs, selects, text areas, checkboxes, dialogs, menus, tabs, status labels, alerts, skeletons, empty states, and form errors.
4. Build the responsive site shell: header, primary navigation, account menu location, content width, footer, and skip link.
5. Create page templates for list, detail, editor, settings, and moderation views.
6. Document every component state and keyboard behavior.
7. Run automated accessibility checks and manual keyboard and screen-reader smoke tests.

**Completion gate:** All base components render every required state on phone and desktop widths; contrast and touch targets pass; keyboard navigation reaches every control; no feature-specific data or unfinished placeholder screen remains.

**Integration:** Connect the shell only to foundation health and version information.

**Release:** `v0.2.0`

### Subsystem 2 Identity and Access Control

**Purpose:** Establish trustworthy accounts and one reusable authorization boundary.

1. Implement a local development identity provider and production identity adapter behind one interface. The current adapter uses verified passwordless email for any valid address; college OpenID Connect or SAML is deferred by user direction.
2. Store identity by issuer and provider subject; add account states for active, suspended, departed, and deleted.
3. Implement session creation, rotation, revocation, expiry, logout, and secure cookie behavior.
4. Add organization membership and scoped roles for member, organization officer, moderator, staff reviewer, and administrator.
5. Implement the central policy service for public, college-only, organization-only, and private access.
6. Build sign-in, email-verification, access-denied, session-expired, account-state, and basic account settings screens.
7. Add audit events for sign-in, role changes, session revocation, and account lifecycle actions.
8. Create a complete authorization test matrix, including anonymous, ordinary member, organization member, officer, moderator, and administrator cases.

**Completion gate:** No route or service relies only on hidden interface controls for authorization; role and audience tests pass at the service and browser layers; suspended and departed accounts lose access and privileged roles immediately; audit events are queryable.

**Integration:** Replace the anonymous shell placeholder with the authenticated account menu and policy-aware navigation.

**Release:** `v0.3.0`

### Subsystem 3 Skill Taxonomy

**Purpose:** Create the canonical vocabulary used by profiles, guides, and search.

1. Implement `Skill` and `SkillAlias` with parent relationships, normalization, uniqueness constraints, and cycle prevention.
2. Seed the first 25 supported skills and reviewed aliases.
3. Build moderator services for create, rename, move, alias, deactivate, and merge-preview operations.
4. Build the skill picker and taxonomy browser with keyboard support and clear parent context.
5. Add public or authorized skill-detail routes containing only taxonomy data at this stage.
6. Test normalization, ambiguous aliases, inactive skills, cycles, and permission failures.

**Completion gate:** Every seeded term resolves deterministically to one active canonical skill; invalid cycles and duplicate aliases are rejected; only authorized moderators can mutate taxonomy data; picker performance and accessibility pass with the complete seed set.

**Integration:** Connect the taxonomy picker to the shell's development form and expose the read-only skill route.

**Release:** `v0.4.0`

### Subsystem 4 Profiles and Self-Declared Skills

**Purpose:** Deliver member profiles with explicit field-level privacy.

1. Implement profile fields, audience type, organization scope, self-declared skill claims, and the rebuildable skill projection.
2. Define the fixed public and college profile projections. Effective access uses the most restrictive applicable rule.
3. Build profile view, edit, privacy, and willingness-to-help screens.
4. Add self-declared skills through the completed taxonomy picker.
5. Build profile completion, empty, private-field, departed-member, and pseudonymous states.
6. Add services for correction, deactivation, export preparation, and search-projection rebuild, while leaving search delivery disabled.
7. Test field-level authorization across every audience and organization membership combination.

**Completion gate:** A member can create and edit a profile, add canonical skills, preview each audience, and verify exactly what anonymous, college, and organization viewers see. Unauthorized fields never appear in server responses, page source, logs, or cached projections.

**Integration:** Connect identity data and the skill taxonomy to profiles. Keep profiles college-only during the internal alpha stage.

**Release:** `v0.5.0`

### Subsystem 5 Guide Publishing Attribution and Evidence

**Purpose:** Complete the core MakerNet loop using text-only guides before adding uploads.

1. Implement guides, maintainers, drafts, immutable revisions, edit proposals, revision skills, draft contributions, evidence candidates, revision attribution, and skill evidence.
2. Implement maintainer scopes, last-maintainer protection, ownership transfer, optimistic publishing locks, and stale-proposal handling.
3. Build the text-first guide editor with guide type, goal, prerequisites, bill of materials, steps, lessons, skills, visibility, and risk declaration.
4. Build collaborator invitation, credit order, role, contribution note, evidence acceptance, maximum audience, and public-byline flows.
5. Publish in one transaction: create the immutable revision, snapshot accepted attribution, activate accepted evidence, advance revision pointers, and write the outbox event.
6. Build guide detail, revision history, draft list, proposal review, contributor response, archive, and withdrawal screens.
7. Rebuild the completed profile skill projection after evidence activation or withdrawal.
8. Test concurrent publication, pending contributors, rejected evidence, visibility widening, pseudonymous credits, withdrawal, and departed maintainers.

**Completion gate:** A team can draft, invite, accept credit, publish, view revision history, propose an edit, publish a second revision, and see accepted evidence on authorized profiles. Older attribution never changes. Text-only guides remain college-only and exclude hazardous publication at this stage.

**Integration:** Connect identity, authorization, skills, profiles, and the outbox. Add end-to-end tests for the entire guide-to-profile evidence loop.

**Release:** `v0.6.0`

### Subsystem 6 Media Pipeline

**Purpose:** Add safe guide images and attachments without weakening access control.

1. Implement media records and states for requested, uploaded, scanning, clean, rejected, and removed.
2. Upload directly to a nonservable quarantine location using short-lived credentials.
3. Validate declared and detected type, size, quota, and malware state.
4. Copy clean files to immutable served keys, verify the copy, mark them servable in a transaction, and clean quarantine objects asynchronously.
5. Generate previews in a sandbox and strip metadata where appropriate.
6. Proxy restricted downloads through current authorization checks; use short-lived signed URLs only for approved public files.
7. Build upload progress, processing, rejection, retry, removal, caption, and alternative-text interfaces.
8. Test unauthorized access, URL expiry, visibility changes, quarantine, duplicate worker delivery, corrupt files, and orphan cleanup.

**Completion gate:** No unscanned object is retrievable or previewed; changing guide visibility or quarantine state affects all restricted downloads immediately; retrying any media job is safe; captions and alternative text are usable from the keyboard.

**Integration:** Add media blocks to the completed guide editor and guide renderer. The text-only guide flow must continue to work unchanged.

**Release:** `v0.7.0`

### Subsystem 7 Unified Search and Discovery

**Purpose:** Make authorized profiles and guides discoverable through one search experience.

1. Define search documents and ranking inputs for people, guides, skills, and organizations.
2. Implement Postgres full-text search, trigram matching, aliases, taxonomy expansion, pagination, and deterministic tie-breaking.
3. Build audience-specific indexing from outbox events and a complete idempotent rebuild command.
4. Apply authorization before ranking and prevent restricted evidence from entering public documents.
5. Build the combined search page, result-type filters, evidence labels, skill pages, empty results, spelling suggestions, and keyboard navigation.
6. Record privacy-safe success, result-click, contact-intent, and zero-result events.
7. Create relevance fixtures and the 40 representative pilot tasks.
8. Test stale-index removal after withdrawal, quarantine, visibility change, departure, and evidence revocation.

**Completion gate:** The authorization matrix passes for pages, APIs, and indexes; all 40 benchmark tasks have reviewed expected results; a full reindex produces the same visible dataset as incremental indexing; restricted data never appears in public snippets or counts.

**Integration:** Connect profile, guide, skill, and organization projections. Do not add equipment results until the v1 equipment subsystem exists.

**Release:** `v0.8.0`

### Subsystem 8 Contact Requests and Notifications

**Purpose:** Let members safely contact willing helpers and receive reliable system events.

1. Implement contact-request states for pending, accepted, declined, expired, blocked, and cancelled.
2. Add willingness-to-help checks, recipient blocks, rate limits, abuse reporting, expiry, and message-length controls.
3. Implement outbox consumption, in-app notifications, email alerts, retry, dead-letter handling, and uniqueness by event, recipient, channel, and type.
4. Build the contact composer, confirmation, inbox, request detail, notification preferences, block list, and delivery-status views.
5. Keep email content minimal; links return to an authorized in-app view.
6. Test duplicate events, visibility changes after delivery, expired sessions, blocking races, muted channels, and inaccessible targets.

**Completion gate:** A willing member receives one in-app notification and at most one email per request, can accept or decline, and can block the sender. Duplicate workers do not duplicate delivery. Unauthorized or withdrawn profile evidence is not disclosed in notifications.

**Integration:** Add the contact action to completed profile and search views. Measure request creation, delivery, response, decline, block, and expiry.

**Release:** `v0.9.0`

### Subsystem 9 Moderation Safety Review and Public Visibility

**Purpose:** Finish the trust controls required before anonymous browsing or hazardous publication.

1. Implement reports, moderation cases, safety states, review ownership, actions, appeals, deadlines, and audit events.
2. Check structured risk declarations plus guide title, steps, bill of materials, skills, and attachment metadata during publication.
3. Implement under-review warnings, quarantine, removal, restoration, publication disablement, and explicit safe fallback to a prior revision.
4. Build the moderation queue, case view, evidence history, action form, overdue view, and emergency controls.
5. Add public profile and guide visibility only after renewed contributor audience consent.
6. Extend the effective-visible-revision resolver to search, direct links, notifications, evidence, APIs, and media.
7. Add abuse scenarios, authorization tests, audit verification, and an incident drill.

**Completion gate:** A moderator can trace and reverse permitted actions; quarantined content disappears from every ordinary read path; prior-revision fallback requires explicit approval; overdue cases escalate after one business day; public views expose only consented data. The complete public-access and hazardous-guide gates must pass before either feature flag is enabled.

**Integration:** Connect moderation to guides, media, profiles, search, notifications, and auditing. Enable public browsing and hazardous publication separately in staging before the controlled pilot.

**Release:** `v0.10.0`

### Subsystem 10 Operations and Pilot Release

**Purpose:** Prove that the connected system can be operated, recovered, and evaluated.

1. Finalize dashboards for errors, latency, job backlog, failed notifications, media scans, search indexing, moderation deadlines, and storage use.
2. Set backup and recovery objectives; run and document a full restore rehearsal.
3. Complete data export, deactivation, deletion, pseudonymization, and retention jobs.
4. Run dependency, configuration, upload, authorization, and privacy reviews.
5. Load-test search, guide publication, media processing, and notification bursts with representative pilot volume.
6. Seed at least 25 canonical skills with three useful guides or two willing helpers per skill.
7. Run the 40-task search study. At least 32 tasks must reach a defined useful result within 30 seconds, and the supported-skill zero-result rate must stay below 10 percent.
8. Complete support, moderation, incident, rollback, data correction, and account departure runbooks.
9. Release to internal alpha, fix defects with patch tags, then release a controlled-pilot candidate.

**Completion gate:** Restore, incident, quarantine, rollback, and account-departure drills pass; no open critical or high-severity issue remains; accessibility and authorization matrices pass; pilot metrics meet the architecture criteria; operators sign off on the runbooks.

**Releases:** `v0.11.0-alpha.1`, `v0.11.0-beta.1`, then `v0.11.0`

## 6. Definition of Done for Every Subsystem

A subsystem is complete only when all applicable items are true:

- User stories and non-goals are documented.
- Database migrations and constraints have been exercised from an empty database and from the preceding tag.
- Domain rules are tested independently of the interface.
- Authorization is enforced in service code and covered by negative tests.
- UI includes desktop and mobile layouts plus loading, empty, error, success, disabled, focus, and keyboard states.
- Accessibility checks and manual keyboard testing pass.
- Integration and browser tests cover every connection to earlier subsystems.
- Background jobs are idempotent and observable.
- Logs exclude private content and include correlation identifiers.
- Metrics, alerts, recovery notes, and operator actions are documented.
- Staging acceptance passes with production-like configuration.
- The subsystem checklist, ADRs, API notes, screenshots, and changelog are current.
- No critical or high-severity defect remains open.
- `main` is green and the annotated release tag has been created.

## 7. Work Board and Handoff Rules

Use one epic per subsystem. Each epic contains contract, schema, domain, API, UI, permissions, tests, documentation, staging, and release issues. The board has five states: **Backlog**, **Current subsystem**, **Verification**, **Release ready**, and **Done**.

Only one epic can occupy **Current subsystem**. An issue from a later subsystem may be clarified in Backlog, but implementation does not start. When a dependency is discovered, add it to the current subsystem or revise the boundary through an ADR; do not leave a hidden placeholder for later.

At the release handoff, record:

1. The tag and commit.
2. Migrations and configuration changes.
3. New permissions and privacy effects.
4. User-visible routes and workflows.
5. Test and accessibility results.
6. Known low-severity limitations.
7. Monitoring and rollback instructions.
8. The explicit interfaces the next subsystem may use.

## 8. First Actions

Execute these actions in order:

1. Approve this sequence and the v0 boundaries.
2. Initialize the repository and create the `v0.1.0` foundation epic.
3. Write ADR 001 for the workspace structure and modular-monolith boundary.
4. Write ADR 002 for the identity provider interface and authorization policy service.
5. Configure CI and staging before creating product modules.
6. Complete and tag Subsystem 0.
7. Begin Subsystem 1 only after the foundation completion gate passes.
