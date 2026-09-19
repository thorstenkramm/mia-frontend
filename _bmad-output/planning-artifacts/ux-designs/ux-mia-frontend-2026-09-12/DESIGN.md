---
name: MIA
description: Light-theme visual contract for the MIA desktop-browser frontend.
status: draft
sources:
  - mia/docs/product-requirements.md
  - mia/docs/api.md
  - mia/_bmad-output/planning-artifacts/prds/prd-mia-2026-08-29/prd.md
  - mia/_bmad-output/planning-artifacts/prds/prd-mia-2026-08-29/addendum.md
  - mia/_bmad-output/planning-artifacts/architecture/architecture-mia-2026-08-29/ARCHITECTURE-SPINE.md
typography:
  interface:
    note: 'Tailwind CSS v4.2 default sans-serif stack and type scale'
components:
  application-shell:
    note: 'Licensed Tailwind Plus application-shell blueprint; exact selection is a pre-implementation gate'
  page-header:
    note: 'Licensed Tailwind Plus page-heading blueprint; exact selection is a pre-implementation gate'
  action-card:
    note: 'Licensed Tailwind Plus card or list-panel blueprint; exact selection is a pre-implementation gate'
  guided-field:
    note: 'Licensed Tailwind Plus form-layout blueprint; exact selection is a pre-implementation gate'
  data-list:
    note: 'Licensed Tailwind Plus stacked-list or table blueprint; exact selection is a pre-implementation gate'
  status-indicator:
    note: 'Tailwind Plus badge adapted to pair text with an icon or shape'
  alert-banner:
    note: 'Licensed Tailwind Plus alert blueprint; exact selection is a pre-implementation gate'
  confirmation-dialog:
    note: 'Native dialog semantics with a licensed Tailwind Plus dialog blueprint'
  error-disclosure:
    note: 'Tailwind Plus alert plus a wrapping preformatted detail region'
  file-upload:
    note: 'Native file input with a licensed Tailwind Plus file-upload blueprint'
  rich-transcript:
    note: 'Tailwind typography primitives in a bounded reading column'
  message-composer:
    note: 'Tailwind form controls with a persistent explicit send action'
  static-session-starter:
    note: 'Tailwind Plus secondary action blueprint; frontend-owned only'
  readiness-checklist:
    note: 'Tailwind Plus description-list or stacked-list blueprint'
  pagination-controls:
    note: 'Licensed Tailwind Plus pagination blueprint; exact selection is a pre-implementation gate'
  security-code-input:
    note: 'One native text input holding the complete code and preserving leading zeroes and paste'
  recovery-code-panel:
    note: 'Tailwind panel with print and copy actions; no automatic download'
  date-time-field:
    note: 'Tailwind form controls with explicit viewer time-zone context'
  external-meeting-link:
    note: 'Tailwind link treatment with visible HTTPS destination'
  media-control:
    note: 'Native browser audio control inside a Tailwind status container'
  loading-skeleton:
    note: 'Tailwind Plus skeleton geometry matching the final surface structure'
  help-tooltip:
    note: 'Native or Tailwind Plus tooltip used only for supplemental information'
  content-disclosure:
    note: 'Native details and summary where suitable; otherwise equivalent Tailwind Plus disclosure'
  form-error-summary:
    note: 'Tailwind alert treatment containing links to invalid fields'
  copy-control:
    note: 'Visible Tailwind secondary button named for the copied object'
  safe-markdown-table:
    note: 'Native semantic table in a labeled bounded overflow region when required'
  safe-markdown-code:
    note: 'Native preformatted text with wrap, copy, and bounded overflow treatment'
  safe-markdown-math:
    note: 'Locally rendered accessible math with meaningful text fallback'
  idle-warning:
    note: 'Persistent non-modal Tailwind Plus status banner with visible Continue working and Sign out actions'
  privacy-screen:
    note: 'Blocking neutral surface with no protected content or prior scope identity'
updated: 2026-09-13
---

# MIA Design System

## Brand & Style

MIA is calm, patient, guided, mature, and focused. It should feel like an open notebook on a well-organized desk:
safe enough for mistakes, clear enough for consequential preparation, and quiet enough for sustained tutoring.

Tailwind CSS v4.3 and the licensed Tailwind Plus library are inherited wholesale. Use the default system sans-serif
stack, theme, spacing scale, palette, radii, shadows, and breakpoints. Do not restyle a default merely to make MIA
distinctive. Adapt only where confirmed MIA behavior, accessibility, localization, authorization, or state
communication requires it.

The licensed Tailwind Plus inventory has not been bound to this project. Before component implementation, the frontend
team must select one exact available blueprint and variant for every inherited component, record a stable local
reference, and verify that its anatomy supports the paired behavioral contract. This is a pre-implementation gate, not
an open visual-design choice. The handoff does not pretend that exact licensed references already exist.

Calm Notebook governs pattern selection: prefer airy reading rhythm, patient pacing, restrained decoration, and clear
writing surfaces. Open Desk adds structural clarity for course preparation and dense staff work: prefer explicit
section labels, practical hierarchy, and scan-friendly lists. These names are selection criteria, not custom palettes
or instructions to recreate the exploratory HTML.

MIA is light-theme only in release one. It is not a game. Avoid points, streaks, rewards, celebratory effects, ranking,
or visual language that makes learning or exam simulation look like play. A mascot is deferred unless an age-inclusive,
cross-locale concept is later validated and approved; the interface is complete without one.

## Colors

Inherit the Tailwind CSS v4.2 default palette and the closest Tailwind Plus blueprint color assignments. MIA defines
no custom palette in release one. Do not copy colors from the exploratory direction files or add brand colors solely
for uniqueness.

Choose inherited combinations that meet WCAG 2.2 AA. Normal text requires at least 4.5:1 contrast, large text at least
3:1, and focus indicators and meaningful non-text boundaries at least 3:1 against adjacent colors. Verify every used
combination in implementation, including disabled, hover, focus, error, warning, success, and selected states.

Color is supplementary. Readiness, approval, processing, tutoring, security, and mentoring states always include text
and, where a compact scan aid helps, an icon or shape. Never infer urgency, authorization, or completion from color.

## Typography

Use `{typography.interface}` throughout. This means Tailwind CSS v4.2's default operating-system-specific sans-serif
font stack and inherited type scale. Do not introduce serif display type, rounded type, remote web fonts, or a custom
type ramp.

Hierarchy comes from the inherited scale, weight, measure, and spacing. Student copy uses short lines and plain labels.
Tutor output and long guidance use a bounded readable measure. Dense administration may use the compact Tailwind Plus
table and metadata styles, but never reduce text below an accessible inherited size.

Layouts must tolerate the Tailwind system stack across current stable Chrome and Edge and current stable Safari. Safari
visual support is verified manually by the Product Owner. Do not tune layout to Playwright's bundled Chromium metrics.
Firefox is unsupported but is not proactively blocked.

Standard, Large, and Extra large are device-local interface text-size modes. Implement them through root-relative
scaling so type, controls, and spacing reflow together. Browser zoom remains enabled. Every locale and every supported
surface must remain usable at each setting.

## Layout & Spacing

Inherit Tailwind CSS v4.2 spacing, widths, grid, flex, and default breakpoints. Prefer the closest licensed
Tailwind Plus application shell. Do not add a custom spacing scale or custom breakpoint without evidence.

Tailwind's default `lg` breakpoint and 1024 CSS pixels are optimization contexts, never functionality floors. Every
complete process must reflow and remain functional at 320 effective CSS pixels in Standard, Large, and Extra large text
modes. The same requirement applies at 1280 CSS pixels with 400% browser zoom. A larger-window advisory is supplemental
copy only and must not hide, disable, reorder out, or block functionality.

Tutoring prioritizes one bounded transcript column and a persistent composer. Course preparation uses clear sections
with visible scope and readiness. Administration uses ordinary paginated tables and detail pages. At increased text
sizes or narrow widths, stack secondary columns before compressing labels. Page-level horizontal scrolling, clipping,
overlap, obscured focus, and hidden actions are release failures. Horizontal scrolling is limited to individually
labeled tables, code, or mathematical regions that intrinsically require two dimensions.

## Elevation & Depth

Inherit Tailwind Plus shadows and surface layering unchanged. Prefer borders, spacing, and tonal separation over added
elevation. Do not use dramatic shadows, floating glass surfaces, gradients, or depth as decoration. Dialog elevation
may follow the inherited blueprint because it communicates modality.

## Shapes

Inherit Tailwind CSS v4.2 radii and each selected Tailwind Plus blueprint. Do not create a MIA-specific radius scale.
Use pills only where the inherited blueprint uses them for compact status or selection; do not make all controls pill
shaped. Shape may reinforce status, but text remains authoritative.

## Components

Visual rules below define only MIA deltas. Anatomy, spacing, palette, radii, shadows, responsive behavior, and ordinary
states otherwise come from the exact licensed Tailwind Plus blueprint selected at the pre-implementation gate or the
native browser component named in frontmatter.

| Canonical component ID | Confirmed visual delta |
| --- | --- |
| `application-shell` | Capability groups are explicit; current course or student scope remains visible. |
| `page-header` | Shows plain title, parent context, and scope before actions. No dashboard decoration. |
| `action-card` | Calm continuation or attention item with one direct route to resolution. No vanity metric. |
| `guided-field` | Persistent label and essential helper text; examples reveal separately. |
| `data-list` | Conventional pagination and visible row labels; consequential actions move to detail. |
| `status-indicator` | Full text plus optional icon or shape; never color-only or decorative animation. |
| `alert-banner` | Names impact and next action; long-running states may include last-checked time. |
| `confirmation-dialog` | Exact scope, blockers, preservation, irreversibility, and deletion limits. |
| `error-disclosure` | Collapsed escaped details visually wrap and break long tokens without changing copied text. |
| `file-upload` | Declared limits precede the native picker and enhanced drop area; failures stay per file. |
| `rich-transcript` | Stable turns, anchors, and reading mode preserve focus, position, and controlled updates. |
| `message-composer` | Persistent text area and labeled send action; queued state is visually distinct. |
| `static-session-starter` | Secondary actions before a session; visually subordinate to free text. |
| `readiness-checklist` | Separate rows for prerequisites, processing, and educational approval. |
| `pagination-controls` | Previous and next controls with current page context; no fabricated total. |
| `security-code-input` | One native text input holds the full code; grouping is visual only and adds no focus stops. |
| `recovery-code-panel` | Dedicated high-attention surface with legible code grouping and print styles. |
| `date-time-field` | Local date and time with viewer IANA zone and resolved offset adjacent. |
| `external-meeting-link` | Inspectable HTTPS destination and normalized host; no external preview. |
| `media-control` | Native audio affordances with adjacent generation, failure, and retention state. |
| `loading-skeleton` | Matches final geometry and never resembles real loaded content. |
| `help-tooltip` | Visually secondary; never contains information needed to complete a task. |
| `content-disclosure` | Visible label and expanded state; opened content remains in reading order. |
| `form-error-summary` | High-visibility summary above the form without obscuring fields or focus. |
| `copy-control` | Visible object-specific label with adjacent concise result feedback. |
| `safe-markdown-table` | Captioned native table; contained overflow appears only when unavoidable. |
| `safe-markdown-code` | Plain-text-preserving block with wrap, copy, and contained overflow. |
| `safe-markdown-math` | Accessible local rendering; raw untrusted MathML or SVG is never inserted. |
| `idle-warning` | Non-modal local-inactivity status that does not move focus, obscure it, or predict expiry. |
| `privacy-screen` | Neutral blocking surface; no protected names, breadcrumbs, or prior content. |

## Do's and Don'ts

| Do | Don't |
| --- | --- |
| Start from the closest Tailwind Plus blueprint. | Recreate an exploratory direction pixel for pixel. |
| Preserve the default Tailwind system font and theme. | Add custom fonts, palette, spacing, radii, or shadows. |
| Use Calm Notebook to select calm, airy patterns. | Treat Calm Notebook as a custom paper-colored palette. |
| Use Open Desk to structure dense staff work. | Turn tutoring into a console, dashboard, or scorecard. |
| Keep every state explicit in words. | Rely on color, motion, icon, hover, sound, or mascot alone. |
| Honor reduced motion and use immediate state changes. | Use shimmer, smooth scrolling, or flashing content. |
| Keep light surfaces focused and mature. | Add dark mode, gradients, glass effects, or gamification. |
| Reflow every process to 320 effective CSS pixels. | Treat 1024 CSS pixels as a functionality floor. |
| Render model content as safe semantic Markdown. | Render raw HTML, remote images, or model-defined controls. |
| Tolerate supported-browser font metrics. | Tune layout only for bundled Chromium screenshots. |

The visual direction files in `.working/` are exploratory, non-interactive visual evidence only. They are not
implementation specifications, interaction prototypes, accessibility prototypes, or accessibility acceptance evidence:

- [Calm Notebook](.working/direction-calm-notebook.html) illustrates the selected governing criteria.
- [Open Desk](.working/direction-open-desk.html) illustrates the selected structural criteria.
- [Learning Console](.working/direction-learning-console.html) illustrates an intentionally rejected intensity.
- [Guided Current](.working/direction-guided-current.html) illustrates an intentionally rejected youthful posture.

The discovery import is preserved at
[frontend-brainstorming-1.md](imports/frontend-brainstorming-1.md). `DESIGN.md` and `EXPERIENCE.md` win if any visual
reference or discovery input conflicts with a captured decision or authoritative source.
