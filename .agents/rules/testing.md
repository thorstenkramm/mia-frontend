# Testing

Test observable behavior, state-machine transitions, authorization-driven visibility, accessibility semantics, and
security boundaries. Do not add tests that mirror constants or freeze incidental implementation details.

## Categories

**Component tests** cover authorization-driven visibility, field preservation, state rendering, and destructive
friction.

**Integration tests** exercise implemented OpenAPI contracts against a local backend or protocol fakes. Never against
paid providers.

**End-to-end tests** run in Playwright and cover the four named journeys plus critical auth and recovery paths. Use
isolated browser contexts and reusable fixtures for multi-role and cross-device scenarios.

**Accessibility tests** are not a separate afterthought — see the required coverage below.

**Security tests** follow the named negative-test suites in `SECURITY-PRIVACY-ACCEPTANCE.md`, including network
non-fetch assertions and secret teardown.

**Resilience tests** cover reload, Back and Forward, SSE reconnect, duplicate transport retry, offline return, stale
auth, tab return, BFCache restore, logout failure, and explicit revalidation.

**Localization tests** require complete catalogs and render each launch locale at Standard, Large, and Extra large.
The local bare `./run-all-tests.sh` gate samples only audited presentation reflow matrices at en-US, de-DE and fr-FR;
login/session reflow also retains pt-PT. All selected locales run all three text modes and spacing checks. These
character-length-informed proxies do not measure rendered width. Mixed security/presentation journeys, all security
and privacy assertions, every selected surface and actual browser zoom remain complete. Run `./run-all-tests.sh
--full-matrix` at epic/release boundaries to exercise the original complete presentation matrices. Standalone
Playwright defaults to full. CI selects the complete matrix. Nightly scheduling is deferred.

Per-story local verification uses `./run-all-tests.sh --affected-e2e <explicit spec paths> [--grep PATTERN]`:
all non-browser gate stages remain complete, and the selected Chromium tests run against the same build. Name the
affected files and any grep before running; zero selected browser tests fails. Shared changes require broader affected
coverage. The bare command retains its complete browser suite for deliberate full runs. Remote QA then runs the full
presentation matrix against the committed SHA.

## Playwright scope is fixed

Release-one automated E2E uses **Playwright's bundled Chromium**. A private Ubuntu runner performs complete-matrix
per-commit QA asynchronously after review; a passing job is attributed only to its exact revision. Full-matrix macOS
Chromium evidence for the exact revision is required before epic completion and before pushing to GitHub. Ubuntu QA
does not replace macOS or manual release evidence. A missing, failed, or canceled remote job is not a pass.

Do not add Playwright Firefox, Playwright WebKit, Edge-channel automation, Cypress, or Electron.

Chrome, Edge, and Safari support comes from repeatable Product Owner manual evidence on actual environments. Safari
evidence on macOS is mandatory for release. Firefox is unsupported and not proactively blocked.

The release record pins every OS, browser, Playwright, and assistive-technology version tested. A known applicable A or
AA failure in any supported environment blocks release.

## Required automated accessibility coverage

Automated tests must be deterministic, run against local controlled data and provider fakes, and record the command,
commit, versions, fixture, result, and artifact location. They must cover:

- Role, name, state, description, landmark, heading, title, current-route, and form associations.
- Keyboard order, bypass links, route focus, dialog containment, fallback focus, and focus-not-obscured geometry.
- **Direct 320 CSS pixels in all three text modes**, as reflow regression coverage.
- **Every release process and surface at 200% browser zoom.**
- WCAG text-spacing overrides, plus bundled-Chromium forced-colors and reduced-motion emulation.
- All seven locales, long translated labels, mixed-direction fixtures, and document-language changes.
- Streaming transitions, duplicate snapshots, reconnect epochs, terminal reconciliation, and announcement ledgers.
- Transcript scroll and stable-node behavior while focus and reading anchors stay in earlier content.
- Form errors, tooltips, disclosures, target geometry, copy denial, and paste into every credential control.
- The one-file upload queue: duplicate names, mixed formats, 200 files, unknown outcomes, and row focus.
- Safe Markdown, tables, code, math, mutation-XSS, malformed partials, and every-chunk-boundary fixtures.
- Recovery-code lifecycle and native-audio state rendering.

An automated accessibility scanner must run on representative stable states, but its output is only one evidence
artifact. Record its name, version, rules, exclusions, and reviewed false-positive decisions. **No blanket rule
suppression is permitted.**

## Security-critical test obligations

- Assert that a `GET` retry policy cannot be inherited by `POST`, `PATCH`, or `DELETE` through a generic API-client
  default.
- Force connection loss after request bytes reach the server for invitation acceptance, MFA replacement, deletion,
  upload, tutoring creation, and message submission. Assert exactly one dispatch and no retry-library replay.
- Assert no optimistic removal and no success copy for conflict, denial, `404`, timeout, and ambiguous failure.
- Test mixed-case, whitespace, control-character, percent-encoded, entity-encoded, nested, and Unicode-lookalike forms
  of `javascript:`, `data:`, `blob:`, `file:`, `http:`, and protocol-relative URLs. Assert inert text and no request.
- Test mutation-XSS, DOM clobbering, malformed tables, raw HTML, SVG and MathML input, CSS, event attributes, remote
  images, and payloads split at every character boundary.
- Inspect application DOM, accessibility tree, state, caches, errors, and clipboard for forbidden fixture fields the
  authorized surface does not need. Authorized API responses visible to their recipient are not disclosures.

## Test privacy and scope

- Use synthetic, non-production fixtures only. **Never call paid or production providers.**
- Do not commit fixture credentials or private reports. Synthetic values in private diagnostics do not require
  deliberate-failure scans or reporter suppression. Keep ordinary failure output useful.
- For each retained or new privacy check, identify the concrete path to harm and affected data or action; verify that
  its assertion detects the defect, name equivalent owners, and use the cheapest adequate layer. Browser tests are
  needed for actual DOM, zoom, focus, lifecycle and cross-tab behavior. A security label alone is not rationale.
- Test forbidden application storage, production logs, URLs, rendering, request overfetch and stale content at their
  owners. Do not mistake an authorized API response in developer tools for an exposure.
- The owned preview refuses occupied ports, checks the built assets and cleans up only owned descendants.

## Manual evidence

Manual scripts must be reproducible from a named fixture and contain numbered actions, expected focus, expected speech
or visual result, actual result, tester, date, exact environment, evidence link, and defect link.

Screenshots alone cannot prove keyboard order, accessible names, announcements, password-manager behavior, or
screen-reader reading. Screen recordings or timestamped notes must accompany dynamic behavior.

Manual evidence must contain no real passwords, MFA values, recovery codes, tokens, private content, or student data.
