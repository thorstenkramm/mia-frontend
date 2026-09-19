# Accessibility

**WCAG 2.2 Level AA is release-blocking.** `ACCESSIBILITY-ACCEPTANCE.md` is the binding contract — 19 acceptance
criteria `AC-001`..`AC-019` over 14 complete processes `CP-01`..`CP-14`. This rule is the working summary an
implementer needs; it does not replace reading the relevant `AC-*` section before building a surface.

An `AC-*` ID owns every normative clause in its section. IDs are stable and must never be renumbered.

## What blocks release

- Every applicable WCAG 2.2 A and AA criterion has a reviewed traceability row with status Pass.
- Zero unresolved A or AA failures, in any supported browser.
- Every required complete-process matrix cell passes. `BLOCKED` prevents release; it is not a pass.

A scanner reporting no violations is not a conformance decision. Automated checks cannot replace keyboard, zoom,
content, screen-reader, and supported-browser manual evaluation. Blanket scanner rule suppression is not permitted.

## Reflow — the hard numbers (`AC-001`)

Every complete process stays operable and understandable at an **effective viewport width of 320 CSS pixels**, verified
in two configurations, in each of the three built-in text modes:

1. A direct 320 CSS-pixel viewport.
2. A 1280 CSS-pixel window at 400% browser zoom.

Content must also be preserved at 200% zoom, and critical processes exercised at 100% with full state depth.

At every configuration: no clipping, overlap, meaning-removing truncation, or hidden actions; **no page-level
horizontal scrolling**; labels, errors, statuses, dialogs, navigation, and the tutoring composer all remain available;
visual and DOM reading order stay equivalent; fixed and sticky elements never cover content or a focused control.

Horizontal scrolling is allowed only inside a separately labelled region whose content is intrinsically
two-dimensional. That region must be keyboard reachable and must not make surrounding actions scroll.

Orientation, physical resolution, user-agent, and phone detection must never gate access. Browser zoom must stay
enabled and must never be reset, intercepted, or counter-scaled.

## Text modes and spacing (`AC-002`)

Standard, Large, and Extra large scale from the root with relative units. Text, controls, spacing, status, and error
content reflow together. All three modes must pass every reflow and zoom requirement — testing a mode only at the
optimized desktop width is insufficient.

Changing text size must not lose route, focus, entered values, transcript position, or dialog state.

Content must survive these WCAG 1.4.12 overrides applied simultaneously: line height 1.5×, paragraph spacing 2×,
letter spacing 0.12×, word spacing 0.16× the font size.

## Structure per route (`AC-003`)

Every rendered route provides:

- A first-focus, visible-on-focus bypass link that moves focus to main content.
- Exactly one `main` landmark, and distinct accessible names when multiple navigation landmarks exist.
- Exactly one page-level `h1` describing the current route.
- A unique localized document title naming the route before the product name.
- `aria-current="page"` on the current route link, and no false current state elsewhere.
- A direct parent or Home route, so browser history is never the only exit.

## Keyboard, focus, targets (`AC-004`)

- Every action is operable with ordinary keyboard commands, with no required shortcut, drag, hover, gesture, hidden
  timer, or rapid motor response.
- Focus order follows meaning and operation, not CSS placement.
- Persistent navigation, headers, banners, toasts, composers, and dialogs must never fully obscure a focused component.
  At least part of the focus indicator stays visible without extra scrolling, at 100%, 200%, and 400% zoom.
- Pointer targets are at least **24 by 24 CSS pixels** unless they meet a normative WCAG 2.5.8 exception, which must be
  recorded. Compact icon controls, upload-row actions, table actions, and disclosure controls get no automatic
  exception.
- Every drag interaction has an equivalent non-drag pointer and keyboard path.

On a full route change, the document title updates first, then focus moves to the `h1` without unexpected scrolling.
In-place pagination is not a route reset: move focus to the collection heading or a concise collection status. Back
restores the prior trigger and scroll position when it still exists.

## Announcements (`AC-012`, `AC-013`)

This is the area most likely to be got wrong. The full matrices are in `ACCESSIBILITY-ACCEPTANCE.md`.

- One mounted announcement owner arbitrates simultaneous events. Priority: auth or scope loss, then urgent failure,
  then one latest polite transition. Suppressed events stay visible and are not replayed later.
- Tutor tokens, deltas, Markdown reparses, heartbeat comments, and polling **must not be live regions**.
- Repeated polling, SSE heartbeat, render, hydration, and an unchanged snapshot must not trigger announcements.
- Announce a corrective summary only. Never announce the raw backend body, headers, cookies, tokens, credentials,
  private content, or provider payloads.
- Unknown progress gets concise indeterminate text, never a fabricated percentage.
- Skeletons are not progress indicators and need adjacent concise loading text when a wait needs a name.
- A visually hidden duplicate must not repeat a visible label.

## Forms and errors (`AC-008`, `AC-010`, `AC-011`)

- Placeholder text is never the label or the sole instruction.
- Never block clipboard events or alter pasted credential bytes. Password managers must work.
- Security codes use one native input for the full code. Visual character grouping is presentational only and must not
  create multiple controls, values, selection models, or focus stops. Numeric spinner controls are forbidden.
- Authentication must not require memory, transcription, puzzle solving, or recognition of internal stage names.
- The TOTP QR image gets a concise purpose label. Its alternative text must never be the encoded secret.

## Timers

The essential security timer inventory is in `ACCESSIBILITY-ACCEPTANCE.md`. Load-bearing points:

- Browser idle is 30 minutes and activity may reset it. Browser absolute is 12 hours and never extends.
- The ordinary polite idle warning appears five minutes before the earlier authoritative deadline, or immediately when
  a newly returned deadline is inside that threshold. It never predicts exact expiry or makes an automatic request.
- Continue working is one explicit operation whose success returns refreshed idle and unchanged absolute deadlines.
  Outcome unknown retains the privacy shield until explicit Refresh reconciliation or Retry Continue working.
- Invitation links do not expire and must never be presented as timed. Five-failure invalidation is an attempt bound,
  not a timer.
- Expiry and resend-availability instants come from the backend as UTC. A mobile resend sends the existing code without
  extending its original expiry; whether its failure count resets or carries forward remains a BCG-015 requirement.
  Local receipt time, countdown completion, and a rejected mutation are never authority.

## Rich content and links (`AC-015`)

- Streaming input, completed tutor output, authored Markdown, code, and math are untrusted. Raw HTML, input SVG or
  MathML, scripts, frames, forms, media, remote images, event attributes, IDs, inline style, and model-defined controls
  must never reach the rendered DOM.
- Model headings nest beneath the message heading: the shallowest model heading maps to `h4`, relative depth is
  preserved without skipped levels, output deeper than `h6` becomes a strong paragraph, and an empty, malformed, or
  unstable heading renders as plain text.
- Generated heading text never supplies an element ID or global anchor.
- Only explicitly parsed, allowlisted links become interactive. Transcript text is never auto-linked.
- "Opens in a new tab" must be stated visibly and programmatically. `title`, hover, an icon, or styling alone does not
  qualify.
- Tables with ambiguous headers, invalid spans, or malformed structure fall back to a labelled linear list or escaped
  plain text.
- User- or model-supplied MathML is never inserted directly.

## Motion (`AC-005`)

- Never introduce content that flashes more than three times in any one-second period.
- Auto-motion lasting more than 5 seconds needs Pause, Stop, or Hide.

## Dialogs (`AC-007`)

- Initial focus goes to the least destructive action for short confirmations. Never default focus to the destructive
  action.
- The inactivity warning is a persistent non-modal status region. It does not move focus, make the background inert, or
  intercept Escape. Alert semantics are reserved for an urgent deadline correction that immediately shields content.

## Evidence (`AC-019`)

Accessibility work is not done when it looks right. It is done when evidence exists: the command, commit, versions,
fixture, result, and artifact location for automated checks, and numbered reproducible scripts with expected and actual
results for manual ones. Evidence must contain no passwords, MFA values, recovery codes, tokens, private content, or
real student data.
