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

## Playwright scope is fixed

Release-one automated E2E runs use **only Playwright's bundled Chromium on developer macOS**.

The project must not add or claim required non-macOS automation, Playwright Firefox, Playwright WebKit, Edge-channel
automation, Cypress, or Electron.

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
- Search DOM, accessibility snapshots, React state, query caches, errors, clipboard data, and test artifacts for
  forbidden fixture fields the visible page does not need.
- Assert that using cookie parsing, `GET /users/me`, route probing, or denial probing as stage discovery fails.
- Frontend tests must never inspect HttpOnly cookies or guess the login stage.

## Secret hygiene — hard rules

- Use synthetic, non-production fixtures only. **Never call paid or production providers.**
- Generate secret-shaped fixtures per test. Do not commit them. Reference them in assertions by label or a one-way
  test-only fingerprint, never by literal value.
- Test names, snapshots, golden files, diffs, failure messages, console capture, HAR files, traces, videos,
  screenshots, coverage artifacts, and CI output must contain **no** fixture secret or protected body.
- Disable automatic artifact capture for token, password, MFA, recovery-code, raw-error, private-content, and download
  tests. Network mocks and request assertions must redact headers and bodies before a failure can print them.
- Deliberately fail each secret-bearing test and scan all process output and generated artifacts for its unique marker.
  The scan must find none.

## Manual evidence

Manual scripts must be reproducible from a named fixture and contain numbered actions, expected focus, expected speech
or visual result, actual result, tester, date, exact environment, evidence link, and defect link.

Screenshots alone cannot prove keyboard order, accessible names, announcements, password-manager behavior, or
screen-reader reading. Screen recordings or timestamped notes must accompany dynamic behavior.

Evidence must contain no passwords, MFA values, recovery codes, tokens, private content, or real student data.
