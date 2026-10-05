# Epic 1 Context: Enter MIA — localized sign-in and a safe session

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Provide localized anonymous entry, staged sign-in, access recovery, invitation acceptance, and truthful session expiry and logout on shared desktops. Establish the architectural and security boundaries needed before later epics expose protected educational data. Backend-dependent lifecycle closure remains blocked until the outstanding contract and evidence obligations are resolved.

## Stories

- Story 1.1: Project scaffold with enforced architecture
- Story 1.2: Localized anonymous entry
- Story 1.3: Password sign-in with restricted-stage isolation
- Story 1.4: MFA challenge and recovery-code sign-in
- Story 1.5: Forced password replacement
- Story 1.6: Password recovery and token reset
- Story 1.7: Invitation preview and acceptance
- Story 1.8: Session lifecycle — idle warning, expiry shield, logout (BCG-001-gated closure)
- Story 1.9: TOTP enrollment and recovery codes

## Requirements & Constraints

- MFA precedes required password replacement. Restricted stages expose only their focused flow and logout, with no application navigation, protected identity, dependent requests, or protected route preloading. Protected mounting requires ordered session, capability/scope, route-resource, then dependent-data authorization in the current epoch.
- Treat unsafe-request ambiguity as a distinct state. Never replay unsafe requests automatically, infer cancellation from abort, or infer success from discovery. Serialize rotating authentication transitions and read fresh CSRF immediately before unsafe dispatch. OpenAPI owns transport; missing contracts cannot be replaced with cookie inspection, probing, or guessed requests.
- Capture reset/invitation fragments synchronously before application startup, strip the whole fragment, and retain valid tokens only in one ephemeral flow. Secrets bypass generic caches. Purge protected memory, trees, streams, transfers, media, object URLs, titles, and content-bearing history state on security loss. No protected browser persistence or telemetry.
- Authenticated expiry is 30 minutes idle, bounded by an immutable 12-hour absolute lifetime; restricted stages have a non-refreshing 30-minute lifetime. Use backend-authored deadlines. Per-tab activity bookkeeping never extends them. Only explicit Continue working refreshes backend idle expiry, returning both deadlines in its single success response.
- Lifecycle events only mark revalidation needed; they send no authenticated requests or replacement streams. Shield at the earlier deadline and conservatively after clock rollback or suspension. Install the shield synchronously on `pagehide`, retain it through BFCache restoration, and require explicit revalidation before protected reveal.
- Logout coordinates known live requests and authentication transitions. Confirmation requires settled transitions, backend `204`, and subsequent anonymous discovery independently in each tab. Broadcasts and aborts are not authority. Late transitions fence results, withdraw confirmation, and require explicit reconciliation; failed or ambiguous logout retains the shield.
- The owner accepted reduced stateless logout on 2026-09-27: delayed authentication transitions may restore authentication; ordinary and Continue working responses cannot restore usable authentication. No server-side per-browser revocation or durable guarantee across suspended/terminated contexts exists. Never promise permanent sign-out or browser-artifact erasure.
- Verify non-fetch behavior, clock boundaries, multi-tab delayed responses, BFCache no-protected-paint, CSRF rotation, and secret teardown. Protocol fakes do not replace required browser evidence or close backend gaps. Run the full project gate; release also requires supported-browser and accessibility manual evidence.

## Technical Decisions

- Follow the layered SPA architecture: `app` composes, features own surfaces, and `platform` owns shared boundaries; features never import each other. Use the prescribed React, strict TypeScript, Vite, Tailwind Plus, declarative router, and test stack.
- One framework-independent `platform/session` controller owns stages, deadlines, per-tab activity, security epochs, cross-tab coordination, and logout phases; React observes it through `useSyncExternalStore`. Session UI belongs in `app`. Epoch loss orders transfer aborts, cache purge, then UI notification.
- One API core uses generated OpenAPI wire types, one validated boundary schema per operation, explicit request provenance, and a discriminated error model. Memory-only server-state caching is fenced in `platform/data`; automatic focus/reconnect refetch and unsafe retry are prohibited.
- One route table and gate engine own lazy protected mounting, neutral access checks, response fencing, and title/announcement/focus sequencing. One announcer owns live messages; only device-local locale and text preferences may persist.
- Cross-tab messages are versioned, content-free notifications with random nonces, never account, stage, scope, or activity data. Logout uses origin-wide shared/exclusive coordination, not timing guesses. Consult the security contract for phase-specific CSRF recovery and late-transition handling rather than inventing a second phase machine.

## UX & Interaction Patterns

- Support seven launch locales with atomic language changes and visible pre-login locale/text-size controls. Standard, Large, and Extra large must reflow at 320 effective CSS pixels and 400% zoom. WCAG 2.2 AA is release-blocking.
- Inherit exact licensed Tailwind Plus light-theme blueprints; record bindings before UI implementation. No custom theme or dark mode.
- Credential flows support keyboard, paste, autofill, password managers, accessible reveal, and one native full-value security-code input. Throttle information comes only from `Retry-After`, without a local countdown.
- Show the persistent non-modal idle warning five minutes before the earlier deadline, immediately if already within that threshold. Never move or obscure focus or state remaining time. Offer Continue working and Sign out; unknown continuation outcomes retain the shield for explicit recovery.
- Privacy screens contain no protected identity. Unconfirmed logout explains local hiding and potentially valid authentication, with explicit safe retry and shared-device guidance. Backend errors use localized explanations plus collapsed, escaped, untranslated technical details, never live-announced.

## Cross-Story Dependencies

- BCG-001 remains OPEN. Owner decisions through 2026-10-03 approve cold entry and the login, MFA, forced-replacement, recovery/reset, and invitation slices. The 2026-10-05 decision additionally approves Story 1.8 lifecycle/BFCache/logout work for existing auth/Home surfaces; it does not authorize missing SSE transport or close composite release obligations.
- Remaining BCG-001 obligations include non-refreshing transport/deadline-header completeness, the permitted post-continuation SSE sequence, documented-bootstrap CSRF coverage, expiry boundaries, multi-tab logout races, and BFCache browser evidence. Existing endpoint implementations alone do not close these obligations.
- The 2026-10-05 owner decision approves lifecycle work for existing auth/Home surfaces and correction of historical activity wording. Only Continue working refreshes idle expiry. Unknown continuation outcomes shield immediately; explicit Refresh after observed expiry discovers the current stage and runs the full gate. Broader BCG-001/SSE/header/release-evidence obligations remain open.
- BCG-003 still blocks broader capability/scope behavior despite approved entry discovery. BCG-005 retains shared-device no-store acceptance obligations. Later shell and tutoring epics consume these gates; authoritative active-session resumption depends on BCG-002. Sign-in expiry must never imply tutoring-session expiry.
