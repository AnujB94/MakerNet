# Subsystem 1 completion checklist

- **Status:** In progress
- **Branch:** `feat/design-system-shell`
- **Target release:** `v0.2.0`

- [x] Architecture's industrial editorial direction reconciled with the blank foundation app
- [x] Desktop and phone examples saved in `docs/screenshots`
- [x] Color, spacing, typography, radius, elevation, motion, breakpoint, and focus tokens defined
- [x] Reusable buttons, links, fields, checkbox, dialog, menu disclosure, tabs, labels, alerts, skeleton, empty state, and form error built
- [x] Responsive shell includes brand, navigation, account location, content width, footer, and skip link
- [x] List, detail, editor, settings, and moderation template specimens documented
- [x] States and keyboard behavior documented in `docs/design-system.md`
- [x] Automated accessibility checks and desktop/phone keyboard browser tests pass
- [x] Production build, unit tests, migration-file check, live database verification, and dependency audit pass
- [ ] Manual screen-reader smoke test on the visible site
- [x] Clean-checkout local Docker staging candidate passes health, readiness, and browser checks
- [x] Hosted CI passes both required jobs on draft pull request #6
- [x] Protected Vercel preview builds and serves `/design-system`
- [ ] Configure and verify Vercel production runtime dependencies
- [ ] Merge and annotate `v0.2.0`

## Verification

- `npm run check`: formatting, lint, strict TypeScript, eight Vitest tests,
  migration-file validation, and production build passed.
- `npm run test:e2e`: eight Chromium tests passed across desktop and Pixel 7
  projects. Axe reported no WCAG 2.0/2.1 A or AA violations. Tests checked
  responsive overflow, skip link, tab arrows/Home/End, menu Escape, dialog
  Escape and focus return, inline form error linkage, and 44px targets.
- Desktop and phone workbench screenshots were inspected:
  [desktop](../screenshots/design-system-desktop.png),
  [phone](../screenshots/design-system-mobile.png).
- `npm run db:migrate` and `npm run db:verify`: one foundation migration
  verified against the existing Postgres ledger after normalizing Windows
  line endings. No schema change was made.
- `npm run audit:deps`: zero reported vulnerabilities.
- [Draft pull request #6](https://github.com/AnujB94/MakerNet/pull/6) passed
  hosted `verify` and `secrets` jobs.
- Clean clone of `3dc265e` built an isolated Docker staging stack on port
  3002 as `0.2.0-rc.1`. Its migration ledger verified one migration, all eight
  desktop and phone browser tests passed, and six health and readiness probe
  pairs passed over 50 seconds with the expected commit and version. The web
  image contains no generated environment files. The `v0.1.0` staging stack
  remained healthy on port 3001.
- Vercel project `makernet` preview
  `https://makernet-1r9di2ms2-anujb0904-7595s-projects.vercel.app` completed
  its Next.js build and served `/design-system` with HTTP 200 through the
  authenticated Vercel CLI. Vercel SSO deployment protection is enabled.
  Dynamic `/` and `/api/health` returned 500 because the required production
  service environment variables have not been supplied.

## Decisions and deviations

- The workbench is a dedicated `/design-system` route with specimen content.
  Only existing Home and Design system routes appear in navigation. The
  account location says Visitor until the identity subsystem supplies
  authenticated controls. The home page uses only foundation version and
  health information.
- System Georgia and Verdana stacks avoid remote font requests. Any future
  supplied brand fonts must be self-hosted within the two-family limit.
- The Windows checkout turned the foundation migration's final LF into CRLF,
  causing a local ledger mismatch. The migration runner now executes and hashes
  canonical LF text; a unit test covers both formats and `.gitattributes`
  requests LF checkouts. The database ledger and SQL schema were unchanged.
- The Windows native Computer Use helper and Browser Use inventory were
  unavailable, so an actual screen-reader pass was not possible. Automated
  accessibility and keyboard evidence does not replace that check. This gate
  remains open.
- Vercel receives only the web app directory, so its build uses
  `apps/web/vercel.json` and `npx next build`; the workspace's Docker-specific
  `postbuild` remains for local staging. Web TypeScript excludes co-located
  Vitest files during that host build while workspace tests still run them.
