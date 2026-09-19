# MIA mascot — design brief

Prepared for an external graphic design team. Version 1, 2026-09-13.

> [!IMPORTANT]
> You are not expected to have any prior knowledge of MIA. This brief is self-contained. Where it states a constraint
> as binding, that constraint comes from an approved internal specification and is not negotiable without a formal
> change request. Where it invites your judgement, it says so explicitly.

## 1. The ask in one paragraph

Design a mascot for MIA, an AI-powered tutoring platform used in schools. The mascot is a **restrained brand
signature**, not a character, not a teacher, and not a face for the AI. It will appear sparingly — on a welcome
screen, on empty screens, and beside occasional guidance — in a deliberately calm, mature, text-first interface. It
must read as credible to a nine-year-old and a nineteen-year-old and a seventy-year-old volunteer, in seven locales,
at 24 pixels, in flat colour, with no animation. We are asking for concept exploration followed by one resolved
mascot delivered as production vector artwork.

## 2. About MIA

MIA is a self-hosted tutoring platform. A student works through course material in conversation with an AI tutor.
Teachers prepare courses, volunteers act as mentors, administrators run the installation. It is used in a desktop web
browser, frequently on shared school computers over weak connections.

The name is an abbreviation of the Spanish **"mi inteligencia artificial"** — "my artificial intelligence".

### Who uses it

| Role          | Context                                                                        |
|---------------|--------------------------------------------------------------------------------|
| Student       | School desktop browsers, often shared devices and weak connections             |
| Supervisor    | Education professionals preparing courses and overseeing students              |
| Mentor        | Volunteers, often older or less technically confident, working internationally |
| Administrator | Technically confident users managing the installation                          |

Four internal personas are used in planning, and they are a useful spread to design against: **Pablo**, a rural
Argentinian student on a shared school desktop; **Elena**, a teacher preparing a course; **Rosa**, a retired Mexican
nurse volunteering as a mentor; **Diego**, a technically confident administrator.

MIA explicitly targets students from low-income backgrounds. Asset weight is a real constraint, not a nicety.

The platform may serve minors. It has no guardian accounts and no age verification, and it treats the student as
working alone.

### Deliberately no age targeting

MIA ships **one age-inclusive interface** and does not adapt its presentation by age. Do not design for a stated age
band, and do not produce child and adult variants. Design one mascot that does not exclude anyone.

The practical test is the one our product owner set: a nineteen-year-old student must be willing to be seen with it on
a shared school screen.

## 3. Brand character

The approved character statement is:

> MIA is **calm, patient, guided, mature, and focused**. It should feel like **an open notebook on a well-organized
> desk**: safe enough for mistakes, clear enough for consequential preparation, and quiet enough for sustained
> tutoring.

Two further points shape everything:

**MIA is not a game.** There are no points, streaks, rewards, rankings, badges, celebratory effects, or progress
animations anywhere in the product. This is a firm product decision, not a current limitation. The mascot must never
read as a game character or a reward.

**Mistakes are expected.** The product treats errors as useful learning input and never frames them as failures of the
person. The mascot should feel like it belongs somewhere safe, not somewhere that judges.

The interface itself is quiet: a light theme, standard system fonts, inherited neutral colours, almost no decoration.
The mascot will be one of the very few pieces of personality in the entire product. That is precisely why it must be
restrained — it has no competition, so it does not need to shout.

## 4. What the mascot is, and is not

This is an approved internal decision and is the single most important section of this brief.

**The mascot is** a restrained, age-inclusive brand signature. It appears sparingly in welcome, empty, and guidance
contexts.

**The mascot is not:**

- **Not the AI tutor.** It must never become the face, avatar, or voice of the AI. The product is transparently
  AI-powered and must never imply the AI is a person or a friend.
- **Not a teacher, guide, or fictional companion.** It does not instruct, point, present, or explain.
- **Not a reward.** It never appears as a prize, never reacts to achievement, never celebrates.
- **Not a status indicator.** It never signals success, error, loading, or progress.
- **Not required to understand anything.** Every screen must be fully comprehensible with the mascot removed.
- **Not a monitor.** It must never suggest it is watching the student, or that a human is watching.

A blunt way to hold all of this: the mascot is closer to a **publisher's colophon or a watermark** than to a character
in an app. It signs the product; it does not participate in it.

### The emotional line

The mascot **must not imply emotion, consciousness, monitoring, or human involvement**. This is binding.

In practice:

| Acceptable                                | Not acceptable                              |
|-------------------------------------------|---------------------------------------------|
| A creature form with a calm, neutral face | Smiling, winking, frowning, surprise        |
| Eyes that are present but unexpressive    | Eyebrows, expressive brows, emotive eyelids |
| A settled, still, resting posture         | Waving, pointing, cheering, thumbs-up       |
| Symmetry and repose                       | Action poses, motion lines, dynamism        |

You may give it eyes. You may not give it a mood. Aim for the composure of an animal at rest rather than the
friendliness of a cartoon.

## 5. Hard constraints

These come from the product's visual contract and its accessibility acceptance criteria. Work inside them from the
first sketch; they are not adjustments to apply at the end.

### 5.1 Form and style

- **Flat vector.** No gradients, no gloss, no bevel, no drop shadows, no 3D rendering, no glass effects. The whole
  product forbids gradients and decorative depth; the mascot may not be the exception.
- **Simple enough to survive reduction.** It must remain recognisable at 24 pixels.
- **No text inside the mark.** The wordmark is a separate, later piece of work.
- **Must sit beside Heroicons.** The product's icon set is Heroicons — clean, geometric, 2px-stroke outline and solid
  forms. The mascot should look like it belongs in the same family, not like an import from a different product.

### 5.2 Colour

MIA deliberately has **no brand palette**. The interface inherits the default Tailwind CSS neutral palette, and
introducing brand colours purely for distinctiveness is explicitly forbidden.

For the mascot we are granting a **narrow, bounded exception**:

- A maximum of **four flat colours**, plus optional white and a single dark ink.
- Flat fills only. No gradient is permitted between them, including subtle ones.
- The set must be muted and must sit comfortably on a light, paper-like, near-white interface.
- Saturated primaries, neon, rainbow spectra, and anything that reads as "kids' app" will be rejected.
- Propose the palette as part of your concept. It will be reviewed as a specification amendment, so give us a short
  written rationale for each colour.

You must also supply a **single-colour version** of the final mascot — see 6.2.

### 5.3 Accessibility

The product must meet **WCAG 2.2 Level AA**, and this is release-blocking. The following bind the mascot directly.

- **The mascot is decorative.** It will ship with an empty alternative text (`alt=""`) and will be invisible to screen
  readers. It therefore may not carry any information not already present in adjacent text.
- **No animation.** Any decorative animation is removed when a user has reduced-motion enabled, and nothing may
  auto-animate for more than five seconds without a pause control. Deliver a static mascot. Do not design a rig, a
  loop, or an idle animation.
- **No flashing.** The product must not introduce anything that flashes more than three times per second, against
  both general and red-flash thresholds. This effectively rules out high-contrast strobing detail.
- **Must survive forced-colors mode.** Some users run an operating-system high-contrast mode that strips authored
  colour. Your mascot must still be identifiable as a shape when its colours are removed or replaced. Do not rely on
  colour alone to define its silhouette; internal edges must hold.
- **Must reflow.** Every screen must work at an effective width of 320 CSS pixels, and at 1280 pixels with 400%
  browser zoom, in three text-size modes. The mascot must be droppable or shrinkable at these sizes without breaking
  the layout. Design it so that removing it costs nothing.

### 5.4 Cross-locale

MIA launches in seven locales: **en-US, de-DE, fr-FR, pt-PT, pt-BR, es-ES, es-AR**. The user base spans Europe and
Latin America.

- No culturally specific symbol, gesture, costume, food, animal with strong local connotation, or regional
  stereotype.
- No hand gestures of any kind. Gesture meanings vary dangerously across these regions.
- No text, letterforms, or numerals in the mark.
- No religious, national, or political reference.

You are not expected to research all seven cultures exhaustively. You are expected to avoid anything you cannot
confirm is neutral, and to flag anything you are unsure about.

### 5.5 Technical

> [NOTE!]
> Good ideas matter more than fulfilling technical requirements.
> For the first version and initial ideas, any file format and any file size is acceptable.

- **SVG is the preferred delivery format.** Clean, optimised, minimal node count, no embedded raster, no external
  references,
  no embedded fonts. If SVG creation is not possible, use pixel based file formats. The idea matters more than the file
  format.
- **Bundled locally.** The product loads no remote fonts, scripts, or images whatsoever. Everything ships in the
  application bundle.
- **Small.** Target under 15 KB for the primary SVG. Our students are on weak connections. But for creating ideas the file size doesn't matter. 
- **No external dependency.** No linked typeface, no CSS filter effects, no mask referencing an external asset.

## 6. Deliverables

Scope for this engagement is **the mascot only**. A wordmark, a logo lockup, favicons, and an illustration system are
explicitly out of scope and may be commissioned separately later. Please design the mascot so it could sit beside a
future wordmark, but do not design that wordmark.

### 6.1 Stage 1 — Concept exploration

- **Three to five distinct concepts**, each a different idea rather than a variation on one.
- Presented **in black and white first**, at both large and 24-pixel size on a plain near-white background.
- A short written rationale for each: what it is, why it suits a calm, mature, non-gamified tutoring product, and what
  it deliberately avoids.
- Rough is fine. We are evaluating ideas, not finish.

We will select one direction, or ask for a further round.

### 6.2 Stage 2 — Refinement

- The selected concept resolved, with the proposed colour palette and its rationale.
- Two or three variations within the direction so we can judge the range.

### 6.3 Stage 3 — Final production

- **Primary mascot**, full colour, SVG.
- **Single-colour version**, SVG — one ink on transparent, for forced-colors contexts, print, and monochrome use.
- **Reduced form**, SVG — a simplified construction that holds at 24 pixels, if the primary does not.
- **Marketing form** — a version permitted more visual latitude for the repository cover image, documentation, and
  presentations. This one does not have to satisfy 5.2 or 5.3. Deliver as SVG plus a 1024×1024 PNG.
- **Editable source files** in their native format.
- **A one-page usage sheet**: minimum sizes, clear space, permitted backgrounds, what not to do.
- Written confirmation that we may use, modify, and redistribute the artwork, including in an open-source
  repository. State the licence.

## 7. Anti-examples

### 7.1 An existing placeholder — what we do not want

The repository currently contains placeholder artwork at `mia/docs/artwork/logo.png`: a glossy, rainbow-gradient
cartoon chameleon with a large expressive eye, an arched eyebrow, and a broad smile.

**It has no official status and is not a starting point.** We include it because it is a precise inventory of what to
avoid:

| Problem                          | Constraint breached                   |
|----------------------------------|---------------------------------------|
| Smiling, eyebrow, expressive eye | Must not imply emotion (4)            |
| Full rainbow gradient            | No custom palette, no gradients (5.2) |
| 3D gloss and highlights          | No decorative depth (5.1)             |
| Reads as a young children's app  | Calm, mature, age-inclusive (3, 2)    |
| Raster only, no vector source    | SVG required (5.5)                    |

The underlying *idea* — a chameleon, as something that adapts to its environment, which is what a tutor does — is not
itself objectionable, and you may propose it. The execution is the problem. If you do propose a chameleon, it must be
a calm, flat, unexpressive one, and it must compete on merit against your other concepts.

### 7.2 A rejected internal direction

During interface design we explored and **rejected an entire visual direction for being too youthful** — rounded
typography, violet and purple tones, a soft playful posture. Anything in that register will be rejected again.

### 7.3 General rejections

Speech bubbles, graduation caps, mortarboards, lightbulbs, pencils held in hands, open books with faces, stars,
trophies, medals, checkmark badges, progress rings, thumbs-up, waving, robot faces, and anything resembling an
assistant avatar.

## 8. A useful reference point

Our product owner named **the GitHub Octocat** as the benchmark, for one specific reason: *"All ages like it."*

What is worth taking from it:

- It is a **brand signature**, not a product character. It never appears inside the working interface telling you
  things.
- It is **calm and still**. It does not emote at you.
- It is **credible to adults** while still being distinctive.
- It survives at **favicon size**.

What is not worth taking from it: its level of illustrative detail and its many costumed variants. MIA needs
something simpler and quieter.

## 9. Acceptance criteria

We will test the final mascot against each of these. Please self-check before delivery.

1. Rendered at 24 pixels on a near-white background, it is still identifiable.
2. Converted to a single flat ink, it is still identifiable.
3. With all authored colour stripped, its silhouette and internal edges still hold.
4. No viewer describes its expression as happy, sad, excited, friendly, or watchful. "Calm", "neutral", and "still"
   are the target responses.
5. Removing it entirely from a screen removes no information.
6. It contains no text, no gesture, no culturally specific symbol.
7. It is flat: no gradient, gloss, bevel, or shadow anywhere.
8. Primary SVG is under 15 KB with no external references.
9. Shown beside Heroicons outline icons, it looks like it belongs.
10. Shown to a nineteen-year-old, it does not read as a children's app.

Point 4 is the one most likely to fail. Please test it with people who have not seen this brief, and report what they
said.

## 10. Validation before adoption

Internally, mascot adoption is conditional on the concept being **validated as age-inclusive and cross-locale**. Your
delivery is an input to that validation, not the end of it.

Two consequences worth knowing: we may decline to adopt a mascot at all if no concept clears validation, and this is
an accepted outcome rather than a failure of the engagement. The interface is designed to be complete without one.

Please therefore treat Stage 1 as genuinely exploratory and give us real alternatives.

## 11. Out of scope

Wordmark and logotype; logo lockup; favicon, touch icons, and web manifest assets; empty-state and spot illustrations;
an icon set (we use Heroicons); any animation; any tutor avatar or AI representation; user avatar imagery, which is
uploaded by users; course logos, which are uploaded by teachers.

## 12. To be completed before this brief is sent

The following are commercial and administrative details that this document does not yet contain. Fill them in:

- Budget, and whether it is per stage.
- Timeline and the date of each stage review.
- Named reviewer and decision-maker on our side.
- Preferred file transfer and review method.
- Contract, licence terms, and confidentiality expectations.
- Whether the design team may reference MIA publicly in a portfolio.

## 13. Questions to send back to us

If any of the following are unclear or feel contradictory, ask before starting. It is cheaper than a wasted stage.

- Anything in section 5 that you believe is impossible to satisfy simultaneously. Some constraints do pull against
  each other, particularly restraint against memorability, and we would rather discuss that openly than receive a
  compromise we did not agree to.
- Any symbol or form you are considering but cannot confirm is neutral across all seven locales.
- Whether a proposed palette is likely to fail the forced-colors or single-ink tests.
