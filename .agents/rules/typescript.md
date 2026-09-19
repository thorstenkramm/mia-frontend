# TypeScript

TypeScript runs in strict mode. The compiler is a correctness tool, not a formality — the state machines in
`FRONTEND-STATE-MACHINES.md` are the main thing it protects.

## Compiler posture

- `strict` is on, together with `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, and
  `verbatimModuleSyntax`. Do not weaken a flag to make code compile.
- `npm run typecheck` must pass with zero errors. A type error is a defect, never a warning to triage later.
- Never use `@ts-ignore`. Use `@ts-expect-error` only with explicit user approval and a comment on the line above
  naming the reason and the condition under which it can be removed.

## Types that carry meaning

- Never use `any`. When a type is genuinely unknown, use `unknown` and narrow it explicitly.
- Never use a non-null assertion (`!`) to silence the compiler. If a value can be absent, handle the absence.
- Never use a type assertion (`as T`) to invent a shape the runtime does not guarantee. Parse and validate instead.
  `as const` and narrowing assertions on values you just constructed are fine.
- Prefer `satisfies` over a type annotation when you want the checked shape but the narrow inferred literal type.
- Do not export a type whose only purpose is to rename another type.

## State machines are discriminated unions

`FRONTEND-STATE-MACHINES.md` defines 31 machines. Each one's `State` column is a closed set of tags. Model it as a
discriminated union on a literal tag, never as a bag of booleans or optional fields.

```ts
type SpeechState =
  | { kind: 'not-requested' }
  | { kind: 'request-submitting'; requestId: RequestId }
  | { kind: 'request-outcome-unknown'; requestId: RequestId }
  | { kind: 'generating' }
  | { kind: 'available'; href: string }
  | { kind: 'failed'; retryEligible: boolean }
  | { kind: 'expired-or-hidden' }
  | { kind: 'access-lost' }
```

- Use the document's state names. A reviewer must be able to match the union against the table.
- Handle every case explicitly. Use an exhaustiveness check so a new state becomes a compile error:

  ```ts
  function assertNever(value: never): never {
    throw new Error(`Unhandled state: ${JSON.stringify(value)}`)
  }
  ```

- An ambiguous outcome is its own tag. Never collapse "unknown" into success or failure, and never represent it as
  `success: boolean | undefined`.
- Do not add a transition the table does not define. If behavior seems missing, it is an escalation, not an invention.

## Branded identifiers

Resource IDs, request IDs, and account IDs are opaque strings with different meanings. Brand them so they cannot be
passed to the wrong parameter.

```ts
declare const brand: unique symbol
type Branded<T, B> = T & { readonly [brand]: B }

type CourseId = Branded<string, 'CourseId'>
type RequestId = Branded<string, 'RequestId'>
```

## Backend data is untrusted input

- A `fetch` response is `unknown` until validated. Never assert a response into a type.
- Validate at the boundary, once, and pass validated view models inward. Shared components accept already-minimized
  view models, not broad API resources.
- Model an absent optional field as the backend models it. The API uses `null` for an absent optional value; do not
  silently convert it to `undefined` or an empty string if that loses meaning.

## Modules and structure

- Prefer named exports. Use a default export only where a tool requires one.
- Use `import type` for type-only imports.
- No barrel file whose only purpose is re-export. It obscures dependencies and defeats tree shaking.
- No `util` or `misc` module. Name a module after the responsibility it owns.
- Keep a module's public surface small. Export what callers need, not what happens to be defined.

## Errors

- Throw `Error` or a subclass, never a string or a plain object.
- Define a typed error when callers must branch on it. Preserve the original with `cause` when wrapping.
- Never swallow a rejected promise. An unawaited promise with side effects is a defect; either await it or explicitly
  hand it to something that owns its lifetime and failures.
