---
name: tailwind-plus
description: 'Retrieve licensed Tailwind Plus component source for the MIA frontend. Use when building any UI: adding a component, page, layout, form, table, list, modal, dialog, alert, banner, navigation, sidebar, application shell, pagination, skeleton, tooltip, or disclosure — and whenever DESIGN.md requires binding a component to an exact Tailwind Plus blueprint.'
---

# Tailwind Plus components (MIA)

The full licensed Tailwind Plus library is downloaded to `tailwindplus/` in the repository
root. It is gitignored and never committed — the licence permits use in this project but
forbids redistributing the component source.

**If `tailwindplus/` is missing**, stop and tell the user to run `./scripts/twp-download.sh`.
Do not try to fetch components from the web, and do not invent markup that imitates a
Tailwind Plus component.

## The only format MIA uses

MIA is React 19.2 + Tailwind CSS v4.2 and is **light-theme only** in release one
(`DESIGN.md:100`). So exactly one file per component is relevant:

| Product                   | File to read          |
| ------------------------- | --------------------- |
| Application UI, Marketing | `v4/react-light.jsx`  |
| Ecommerce                 | `v4/react.jsx`        |

Never read `-system` or `-dark` variants. They carry `dark:` utilities, and dark mode is
explicitly out of scope (`DESIGN.md:212`, `FRONTEND-PRD-FOUNDATION.md:84`). Never read `v3/`.

Ecommerce components have **no mode variants at all** — the files are `html.html`,
`react.jsx`, `vue.vue`. Searching for `react-light.jsx` under `Ecommerce/` therefore matches
nothing at all rather than erroring. `./scripts/twp.sh path` handles this difference for you.
MIA is not an e-commerce app, so it should rarely come up.

## Path layout

```
tailwindplus/{Product}/{Category}/{Group}/{Component}/v4/react-light.jsx
```

For example:

```
tailwindplus/Application UI/Forms/Input Groups/Input with add-on/v4/react-light.jsx
tailwindplus/Marketing/Page Sections/Hero Sections/Simple centered/v4/react-light.jsx
```

Path segments contain spaces — always quote them in Bash.

`tailwindplus/metadata.json` holds the library `version` and `downloaded_at`.
`tailwindplus/descriptions.json` holds the prose Tailwind Plus publishes per product and
per category, keyed by dotted path — useful when choosing between groups.

## Workflow

**Do not use the Glob tool on this library.** `tailwindplus/` is gitignored, and Glob skips
gitignored paths — it silently returns "No files found" for components that exist. `Grep`
and `Read` work on it normally. Use `./scripts/twp.sh` for listing and name search.

1. **Orient from the catalog below** to pick the group. Costs no tool calls. Do not dump the
   directory tree to find out what exists.
2. **List the candidates in that group:**
   ```bash
   ./scripts/twp.sh list "Application UI/Overlays/Modal Dialogs"
   ```
   Component names are descriptive and usually enough to shortlist two or three. To search
   names across the whole library instead, `./scripts/twp.sh find modal alert` (all terms
   must match, case-insensitive).
3. **Search by markup when the name is not enough.** This is what names cannot answer — for
   example, which overlays use Headless UI's `Dialog` rather than a native element:
   `Grep` pattern `DialogTitle`, path `tailwindplus/Application UI/Overlays`, include `react-light.jsx`.
   Grep matches `v3/` and `v4/` alike, so ignore any hit whose path is not under `/v4/`.
4. **Resolve the exact file, then read it:**
   ```bash
   ./scripts/twp.sh path "Application UI/Overlays/Modal Dialogs/Simple alert"
   ```
   It picks the right variant for the product and fails loudly if there is none. `Read` the
   path it prints. One file is the complete component.
5. **Adapt it** to MIA: replace placeholder copy, wire real state and handlers, apply the
   accessibility contract from `ACCESSIBILITY-ACCEPTANCE.md`. Keep Tailwind defaults —
   `DESIGN.md:85` inherits the theme wholesale, so do not introduce custom colours,
   spacing, radii or breakpoints.

Components import from `@headlessui/react` and `@heroicons/react`. Both are separate npm
packages and must be installed; they are not part of the Tailwind Plus download.

## Record the binding

`DESIGN.md:90-93` makes exact blueprint selection a **pre-implementation gate**: every
component must be bound to one specific licensed blueprint, not a "closest match". When you
adapt a component, record its identity at the top of the file so the binding survives and
future maintenance can diff against a later download:

```jsx
// Tailwind Plus: Application UI > Forms > Input Groups > Input with add-on
// Library version: 2026-09-13-083323 (see tailwindplus/metadata.json)
```

State MIA's deltas from the blueprint in the same comment when you change its anatomy.

## When nothing matches

Say so plainly and show the candidates you rejected. Do not silently substitute a different
component, and do not hand-roll markup "in the Tailwind Plus style" — that defeats the
binding gate and the licence rationale. Ask the user to choose or to confirm a deviation.

## Catalog

Numbers are how many components each group contains. Generated from the library on disk —
do not hand-edit; run `./scripts/twp-catalog.sh` after updating the download.

<!-- BEGIN GENERATED CATALOG -->

### Application UI
- **Application Shells** — Multi-Column Layouts (6), Sidebar Layouts (8), Stacked Layouts (9)
- **Data Display** — Calendars (8), Description Lists (6), Stats (5)
- **Elements** — Avatars (11), Badges (16), Button Groups (5), Buttons (8), Dropdowns (5)
- **Feedback** — Alerts (6), Empty States (6)
- **Forms** — Action Panels (8), Checkboxes (4), Comboboxes (4), Form Layouts (4), Input Groups (21), Radio Groups (12), Select Menus (7), Sign-in and Registration (4), Textareas (5), Toggles (5)
- **Headings** — Card Headings (6), Page Headings (9), Section Headings (10)
- **Layout** — Cards (10), Containers (5), Dividers (8), List containers (7), Media Objects (8)
- **Lists** — Feeds (3), Grid Lists (7), Stacked Lists (15), Tables (19)
- **Navigation** — Breadcrumbs (4), Command Palettes (8), Navbars (11), Pagination (3), Progress Bars (8), Sidebar Navigation (5), Tabs (9), Vertical Navigation (6)
- **Overlays** — Drawers (12), Modal Dialogs (6), Notifications (6)
- **Page Examples** — Detail Screens (2), Home Screens (2), Settings Screens (2)

### Ecommerce
- **Components** — Category Filters (5), Category Previews (6), Checkout Forms (5), Incentives (8), Order History (4), Order Summaries (4), Product Features (9), Product Lists (11), Product Overviews (5), Product Quickviews (4), Promo Sections (8), Reviews (4), Shopping Carts (6), Store Navigation (5)
- **Page Examples** — Category Pages (5), Checkout Pages (5), Order Detail Pages (3), Order History Pages (5), Product Pages (5), Shopping Cart Pages (3), Storefront Pages (4)

### Marketing
- **Elements** — Banners (13), Flyout Menus (7), Headers (11)
- **Feedback** — 404 Pages (5)
- **Page Examples** — About Pages (3), Landing Pages (4), Pricing Pages (3)
- **Page Sections** — Bento Grids (3), Blog Sections (7), CTA Sections (11), Contact Sections (7), Content Sections (7), FAQs (7), Feature Sections (15), Footers (7), Header Sections (8), Hero Sections (12), Logo Clouds (6), Newsletter Sections (6), Pricing Sections (12), Stats (8), Team Sections (9), Testimonials (8)

<!-- END GENERATED CATALOG -->

## MIA component map

`DESIGN.md` frontmatter names the intended Tailwind Plus source for each MIA component.
These are starting points for the search, not bindings — the exact blueprint is still the
open gate.

| MIA component        | Start looking in                                     |
| -------------------- | ---------------------------------------------------- |
| application-shell    | Application UI > Application Shells                  |
| page-header          | Application UI > Headings > Page Headings            |
| action-card          | Application UI > Layout > Cards; Lists > Stacked Lists |
| guided-field         | Application UI > Forms > Form Layouts, Input Groups  |
| data-list            | Application UI > Lists > Stacked Lists, Tables       |
| status-indicator     | Application UI > Elements > Badges                   |
| alert-banner         | Application UI > Feedback > Alerts                   |
| confirmation-dialog  | Application UI > Overlays > Modal Dialogs            |
| error-disclosure     | Application UI > Feedback > Alerts                   |
| file-upload          | Application UI > Forms > Form Layouts                |
| readiness-checklist  | Application UI > Data Display > Description Lists    |
| pagination-controls  | Application UI > Navigation > Pagination             |
| loading-skeleton     | Application UI > Lists, Layout (match final anatomy) |
| help-tooltip         | Application UI > Elements                            |
| content-disclosure   | Prefer native `<details>`/`<summary>`                |
