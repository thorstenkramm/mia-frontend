# Tailwind and styling

Tailwind CSS 4.3 with the licensed Tailwind Plus component library. `DESIGN.md` is the visual contract and it is
deliberately restrictive: the theme is inherited wholesale, not designed here.

## Inherit, do not redesign

`DESIGN.md` inherits Tailwind's defaults and the Tailwind Plus blueprints. That means:

- Use the default system sans-serif stack, type scale, spacing scale, palette, radii, shadows, and breakpoints.
- Do not introduce a custom colour, custom spacing step, custom radius, or custom breakpoint. If a design need seems to
  require one, that is a `DESIGN.md` change request, not an implementation decision.
- Every component must be bound to one exact Tailwind Plus blueprint and variant. "Closest match" is not acceptable —
  this is a named pre-implementation gate in `DESIGN.md`. Record the blueprint and library version in a comment.
- Retrieve blueprints with the `tailwind-plus` skill. Never hand-write markup that imitates a Tailwind Plus component.

## Tailwind 4 is CSS-first

- There is **no `tailwind.config.js`**. Configuration lives in CSS via `@import "tailwindcss"` and `@theme`.
- Do not create a JavaScript config file. If an agent suggests one, it is applying Tailwind 3 knowledge.
- Keep `@theme` minimal. Release one should need almost nothing in it, because the defaults are inherited.

## Light theme only

Release one is light-theme only. Dark mode is explicitly excluded by `FRONTEND-PRD-FOUNDATION.md` and `DESIGN.md`.

- Never write a `dark:` variant.
- Never add `prefers-color-scheme` handling.
- Always take the `react-light.jsx` variant from the Tailwind Plus library, never `-system` or `-dark`.

## Custom CSS is an exception

Hand-written CSS should be close to zero. Utilities and blueprints cover the product.

Writing custom CSS is justified only for something utilities genuinely cannot express: a `@theme` declaration, a
global reset concern, a print stylesheet, or a forced-colors adjustment. When you write it, say why in a comment.

- No CSS-in-JS runtime, no styled-components, no CSS modules as a primary mechanism.
- Do not use `@apply` to build a component class. That reinvents the component layer Tailwind Plus already provides.
- Arbitrary values (`w-[347px]`) are a smell. Prefer a scale step. If an arbitrary value is genuinely required, comment
  the constraint that forces it.

## Class ordering and readability

- Use `prettier-plugin-tailwindcss` and let it own class order. Do not hand-sort.
- Build conditional classes with a small helper such as `clsx` or `tailwind-merge`. Do not concatenate class strings
  with template literals and ternaries inline; it defeats both the formatter and review.
- Never construct a class name dynamically from a variable fragment. Tailwind cannot see it and it will be purged.

## Layout must reflow

`ACCESSIBILITY-ACCEPTANCE.md` sets a hard floor: every complete process stays operable at **320 effective CSS pixels**,
tested both as a direct 320-pixel viewport and as a 1280-pixel window at 400% zoom, in all three built-in text modes.

- Page-level horizontal scrolling fails release. Only a separately labelled, intrinsically two-dimensional region — a
  data table, a long code line, a mathematical layout — may scroll horizontally.
- Tailwind's `lg` and 1024 pixels are optimization targets only. They never gate functionality.
- Use relative units so the three text modes scale from the root. A fixed `px` font size breaks text-mode scaling.
- Sticky and fixed elements must never cover content or a focused control at any zoom level.
- Never reset, intercept, or counter-scale browser zoom.
- Responsive styling must not reorder table cells or hide table headers.

## Forced colors and reduced motion

- Never use `forced-color-adjust: none` unless a traceability row proves native adjustment destroys essential meaning
  and the replacement passes contrast and state tests.
- Under `prefers-reduced-motion: reduce`, route and dialog transitions become immediate, smooth scrolling becomes
  instant, skeleton shimmer stops, and decorative animation is removed.
- Focus indicators must meet WCAG 2.2 contrast and area requirements in every state, text mode, zoom level, and in
  forced-colors mode.
