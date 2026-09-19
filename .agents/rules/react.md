# React

React 19.3, client-rendered, strict TypeScript. React 19 changed enough that older idioms are usually wrong here — do
not reach for patterns that predate it.

## React 19 specifics

- The compiler-friendly style is the default. Do not add `useMemo`, `useCallback`, or `memo` speculatively. Add one
  only after a measured problem, and say what was measured.
- `forwardRef` is unnecessary. `ref` is an ordinary prop on function components.
- Use `<Context>` directly as a provider. `<Context.Provider>` is legacy.
- Use form Actions and `useActionState` for submissions, and `useFormStatus` for pending state inside a form. They give
  pending, error, and result handling without hand-rolled state.
- `useOptimistic` exists but is **forbidden in this codebase for anything persisted**. See the optimistic-update ban
  below.
- Prefer `use()` for reading a resource inside a Suspense boundary over an effect that sets state.

## useEffect is a last resort

Most `useEffect` calls in a React codebase are defects. Before writing one, rule out every alternative:

- Deriving a value from props or state — compute it during render.
- Resetting state when a prop changes — give the component a `key` instead.
- Responding to a user action — do the work in the event handler, not in an effect that watches the result.
- Fetching data for display — use the data layer and Suspense.

A legitimate effect synchronizes with something outside React: an `EventSource`, a `BroadcastChannel`, a timer, a
`visibilitychange` or `pageshow` listener, an `AbortController`. Those are real and this app has several.

Every effect that subscribes must clean up. A leaked `EventSource`, listener, or timer is a security defect here, not
just a performance one — see `.agents/rules/security-privacy.md` on teardown.

## Optimistic updates are forbidden

`EXPERIENCE.md` and `SECURITY-PRIVACY-ACCEPTANCE.md` both forbid them. Render only authoritative persisted or streamed
state.

- A destructive mutation updates the interface only after a definitive backend success.
- A lost or ambiguous response enters an explicit "outcome unknown" state. It never optimistically removes an item and
  never shows success copy.
- Do not infer success from a request completing, from a component unmounting, or from a list refetch happening to omit
  the item.

## Component design

- A component renders authoritative state. It does not decide authorization. Pass in an already-minimized view model.
- Keep presentational components free of data fetching. A component that both fetches and renders a complex tree is
  two components.
- Do not put a field in props that the current user is not permitted to see. Never render it hidden and never pass it
  "just in case" — that violates the never-overfetch-and-hide rule.
- Derive a stable `key` from a resource identity. Never use an array index for a list that can reorder, filter, or
  paginate, and never for transcript content.
- Tutor transcript nodes must stay stable across streaming updates so focus and reading anchors survive. Keying a
  streamed message by its content or its index will break assistive technology.

## Forms and inputs

- Controlled inputs need a value and a change handler. Never switch a field between controlled and uncontrolled.
- Never block paste, clipboard events, or autofill on a credential field. Password managers must work.
- Use the native file input as the real control. Drag and drop is an enhancement layered on top, never the only path.
- Enter inserts a newline in the multiline tutoring composer. Visible **Send** is the baseline submit action. Any send
  shortcut uses a modifier, is documented, and must not fire during IME composition.
- Do not use a numeric spinner for a security code, and do not split a code into multiple inputs. One native input for
  the full code.

## Suspense and errors

- Put an error boundary around each route tree and around independently failing regions. A failed region must not take
  the application down.
- Blocking a state is action-scoped. A blocked action stays unavailable without hiding independently authorized content
  or actions on the same surface.
- An error boundary renders the localized explanation. It must not render the raw backend body as HTML — see
  `.agents/rules/api-client.md` for the exact disclosure contract.

## Routing and focus

Route behavior is an accessibility contract, not a convenience. On a full client-side route change:

1. The document title updates **before** the announcement or focus move.
2. Focus moves to the `h1`, or an equivalent focusable route-title target immediately before it, without scrolling
   unexpectedly.
3. Exactly one `main` landmark and exactly one page-level `h1` exist.

In-place pagination is not a full route change. Move focus to the collection heading or a concise collection status
instead. See `.agents/rules/accessibility.md`.

## State ownership

- Keep server state in the data layer and UI state in components. Do not mirror server data into `useState`; that is
  how stale authorization survives a scope change.
- Cache keys must include the authenticated account ID and every scope discriminator. A resource ID alone is never a
  sufficient cache key. See `.agents/rules/security-privacy.md`.
- Do not build a global store for things that are really route-local. Route-local ephemeral values — captured fragment
  tokens, MFA proofs, recovery codes — must stay out of any global store entirely.
