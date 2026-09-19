# Security and privacy

`SECURITY-PRIVACY-ACCEPTANCE.md` is the binding contract, including its named negative-test suites. This rule is the
working summary. Read the relevant section of the acceptance document before implementing an auth, secret, download,
or rich-content surface.

MIA processes sensitive educational data and may serve minors. These are product constraints, not hardening.

## Definitions

**Protected content** is authenticated API data, names tied to protected scope, chats, summaries, private material,
mentoring data, contact data, generated speech, source files, and unsaved sensitive input.

**A secret** is a password, temporary password, session or CSRF token, invitation or reset token, MFA value, TOTP
provisioning data, MFA-management proof, or recovery code.

## The protected mount gate

The application passes one **conjunctive, ordered** gate before mounting a protected route tree:

1. An authoritative `authenticated` browser session.
2. Current-account capabilities and complete scope.
3. Authorization context for the requested route resource and action.
4. Only then, dependent data.

A successful session check alone never permits a protected mount. Until every step succeeds in the same current
security and scope epoch, render only a neutral `Checking access` shell.

Anonymous, `mfa`, and `password-change` stages render only their permitted focused flow plus logout. Restricted and
checking flows expose no application shell, protected title, breadcrumb, cached name, dependent request, or
speculative prefetch. An older response can never overwrite a newer session, security, scope, or route-authorization
result.

Never discover the stage by parsing cookies, calling `GET /users/me`, probing routes, or probing denials. Each of
those fails review.

## Never persist

Never write protected content or a secret to local storage, session storage, IndexedDB, the Cache API, a
service-worker cache, URL state, or a form-restoration store.

- Authenticated service-worker caching, Cache API writes, protected prefetch, and prerender are prohibited. If a
  service worker exists for public assets, authenticated API requests and responses must bypass it.
- A chat draft may survive only page-local reconnection, while that page stays open and authorization stays confirmed.
- Device-local locale and text-size preferences may persist — they are not account content.

## Never put in a URL

Keep protected URLs opaque and content-free. Never place a name, topic, message, filename, email, or mobile number in
path text, query text, the hash, or `history.state`.

On teardown, replace a protected document title with a neutral `MIA`, and clear protected breadcrumbs and
content-bearing history state.

## Fragment bearer tokens

Invitation and password-reset entry points use a **synchronous pre-application bootstrap**. Before React mounts, before
router startup, before any API work, diagnostics, or optional script loads, the bootstrap reads `location.hash` once
into one route-local ephemeral object and immediately removes the complete fragment with `history.replaceState`.

- Accept only one exact `token=<canonical-lowercase-UUID-v4>` fragment. Empty, malformed, uppercase, duplicate,
  additional, and unknown fragment parameters are invalid — but the complete fragment is still removed synchronously.
- After capture, the token must never enter the live address, the current history entry, router state, a query cache,
  global state, browser storage, a title, a referrer, an error, a log, a clipboard helper, or a test report.

## Never log or expose

Never log, persist, or expose a password, MFA value, recovery code, bearer token, cookie, private prompt, message body,
provider payload, authorization header, or unnecessary personal data.

Release one contains no analytics, behavioral telemetry, session replay, third-party error or crash reporting,
third-party performance monitoring, remote fonts, remote scripts, tracking pixels, or diagnostic export. No SDK may
capture DOM, accessibility trees, keystrokes, clipboard actions, URLs, route scope, requests, responses, console
output, or behavior for remote delivery.

Local diagnostics must be content-free. A production `console` call must not contain a protected value, an error
carrying a body, a request or response object, a credential, a route parameter tied to a person, or provider data.

Any CSP relaxation or new external origin is a separately approved, security-reviewed product change. Approved
relaxations: `style-src-attr 'unsafe-inline'` for KaTeX-generated math output (product owner, 2026-09-15, recorded in
the architecture spine's AD-15).

## Untrusted content

Treat model output, partial SSE text, user text, authored content, filenames, OCR text, and backend error bodies as
untrusted.

- Safe Markdown uses **one locked parser and sanitizer configuration** with an explicit element and attribute
  allowlist. Raw HTML, SVG and MathML input, forms, frames, media, remote images, IDs, styles, classes, event
  attributes, model-defined controls, and DOM-clobbering names are forbidden. Single approved exception (product
  owner, 2026-09-15, architecture spine AD-6): the KaTeX subtree generated by the locked math pipeline from parsed TeX
  may carry generator classes and style attributes; input HTML, SVG, and MathML remain forbidden, and the mandated
  math security fixtures gate this exception.
- Streaming content is escaped text, or the entire accumulated string is reparsed through the same locked sanitizer on
  every update. **Never append unsanitized chunk HTML.** Test every adversarial payload at every chunk boundary.
- The terminal state discards the incremental parse result and reconciles authoritative content through the same
  policy.
- Model output never creates controls and never authorizes a platform action.
- `dangerouslySetInnerHTML` is forbidden outside the single locked sanitizer boundary.

### External links

Only a successfully parsed `https:` URL whose parsed `username` and `password` are both empty may become an
interactive external link.

- A credential-bearing HTTPS URL is rejected and rendered as inert text, with no copy-link control and no network
  activity.
- **Do not autolink arbitrary transcript text.**
- Display the normalized ASCII host and a fully inspectable destination, mark it external, and require deliberate
  activation.
- State that activation opens a new tab, both visibly and programmatically. `title`-only and hover-only disclosure do
  not qualify.
- Open with `noopener noreferrer`. Set no opener and send no referrer.
- Never fetch, preview, preconnect, DNS-prefetch, embed, or follow the URL on the user's behalf.
- MIA same-origin navigation uses trusted route construction, never the external-link renderer.

## Session expiry and the privacy shield

- Each tab owns its idle baseline. Only that tab's last successful, user-initiated authenticated request may reset it.
  Activity in another tab, pointer movement, typing without dispatch, timer callbacks, SSE traffic, and automatic reads
  do not.
- `online`, focus, visibility-return, persisted-`pageshow`, network-change, and SSE transport loss only mark
  revalidation needed. They send no authenticated request and open no replacement EventSource.
- Explicit Refresh and Try now require BCG-001 non-refreshing transport. Continue working is one user-initiated
  operation whose success returns refreshed idle and unchanged absolute deadlines together, with no second automatic
  deadline read. Outcome unknown retains the shield until explicit reconciliation or retry.
- Schedule the local privacy shield at the earlier authoritative idle or absolute deadline. Recheck on every timer
  wake, focus, visibility return, and pageshow. Clock rollback, sleep, suspension, or a late callback **shields
  immediately rather than extending** either deadline. A client clock never extends a server-authored deadline, and the
  absolute deadline never moves.
- On `pagehide`, synchronously install the content-free privacy shield before the document can enter BFCache. A
  persisted `pageshow` marks revalidation needed behind that retained shield; it is not the first shielding point.

## Logout

Logout has explicit start, quiescing, dispatch, confirming, confirmed, and unconfirmed phases. It reaches confirmed
only after in-flight work settles, the backend returns `204`, and subsequent session discovery establishes an anonymous
state with fresh anonymous CSRF.

Every tab stays shielded until it independently establishes anonymous state. Only then may its neutral login surface
say logout completed.

If logout, CSRF refresh, or anonymous confirmation fails, **keep the privacy screen**. State that logout is not
confirmed, that the browser may still hold a valid sign-in cookie, and that protected content has been hidden locally.
Offer explicit `Retry logout` and guidance to close the whole browser on a shared device. Never show the ordinary login
screen, claim success, restore protected UI, run authenticated discovery automatically, or retry automatically.

## Cross-tab channel

Each tab opens one same-origin `BroadcastChannel` with a fixed public name. Accepted messages are versioned and
content-free: security-epoch, logout-start, logout-quiesced, logout-confirmed, logout-unconfirmed. Each carries only
the fixed version and kind plus a fresh random event nonce, and for one logout attempt its random logout nonce.

No message contains an account ID, username, stage, route, resource ID, scope, action, activity timestamp, or protected
data. Unknown, malformed, oversized, replayed, or differently versioned messages trigger the conservative privacy
shield and never appear in logs.

The channel is **notification only, never authority**. It carries no session state and causes no automatic unsafe
request. `localStorage` events are not a substitute, because they persist a cross-tab signal.

## Caching

Every protected cache identity includes the authenticated account ID, the OpenAPI operation, the complete path and
query scope, and every course, student, owner, assignment, capability, or representation discriminator the operation
uses. **A resource ID or route alone is never a sufficient cache key.**

Do not merge differently authorized representations into one normalized entity, and do not reuse a role-shaped response
for another capability path.

Purge affected details, collections, relationships, derived labels, forms, downloads, blobs, media, breadcrumbs, and
prefetch state on account or stage change, capability or assignment change, scope switch, mutation, denial, `404`,
logout, tab-return revalidation, or terminal deletion. A newer scope epoch fences all older responses.

## Existence-hiding

For each existence-hiding operation, map every cause — unknown, out-of-scope, ineligible, revoked, faulty, accepted,
banned, throttled — to **one fixed localized presentation**.

Within a locale, the rendered copy, heading, status role, available actions, focus target, retained-input policy, URL,
title, breadcrumb, announcement, and coarse waiting treatment must all be identical. Never interpolate a cached person,
course, material, invitation, or session name into this copy.

Clear stale protected identity before rendering the safe result. Never infer cause from timing, cache state, prior
navigation, response size, or whether a resource was visible earlier.

## Secrets in the UI

- **Recovery codes:** show exactly ten, once, on a dedicated route, intercepted outside generic stores. Require explicit
  reveal and safe-storage acknowledgement. Offer only user-initiated `Copy all` and print — never auto-download. Mask
  on page hide, drop all references on departure, and replace the history entry so Back cannot restore the surface.
- **MFA-management proof:** a five-minute, single-use bearer credential distinct from its non-secret resource ID. Keep
  it in one active mutation flow, send it only in the OpenAPI-defined header or field, and drop every reference before
  handling the response — including on timeout — because the frontend cannot know whether it was consumed. Never retry
  automatically and never reuse it for another action.
- **TOTP provisioning URI:** limit to 1,024 UTF-8 bytes before parsing, accept only the canonical
  `otpauth://totp/<label>` form with `secret`, `issuer`, `algorithm=SHA1`, `digits=6`, `period=30` in exact order,
  verify the label equals the current username and the issuer equals `MIA (<normalized hostname>)`, and require exactly
  32 uppercase unpadded Base32 characters. Reject anything else. Derive the QR image locally — no remote image,
  service, or authenticator handoff.

## Clipboard, print, and downloads

- Copy is always an explicit, visibly labelled user action. Never copy automatically.
- Copy only the visible object-specific value. Never include hidden metadata, IDs, markup, headers, URLs, or adjacent
  protected state. Announce one concise result without moving focus.
- The default print stylesheet suppresses protected application content. Only an explicitly approved print surface may
  opt in. Recovery-code print output contains the codes and the storage warning only. Printing never starts
  automatically.

## Claims the UI must not make

- Do not claim self-hosting keeps all processing local, or that local deletion removes provider copies and backups.
- Do not claim accepted material is malware-free, or that MIA validates copyright or licensing.
- MIA is not an emergency service, sends no safeguarding alert, and must never imply human monitoring or notification.
- Browser memory, the HTTP cache, BFCache, Downloads, the OS clipboard, the print spooler, and recently-closed-tab
  metadata are boundaries the frontend cannot reliably erase. UI copy must not claim otherwise.
- JavaScript cannot guarantee physical memory erasure. Teardown means dropping every application-reachable reference,
  unmounting controls, and cancelling callbacks. Never claim immutable strings were zeroed.

## Release gate

Release fails if any rule above is untested, any negative test exposes protected data, any critical scenario can render
before authorization, or any referenced entry in `BACKEND-CONTRACT-GAPS.md` remains open.

Passing visual checks is not evidence. Tests must inspect network activity, retained client state, browser lifecycle
behavior, and generated artifacts.
