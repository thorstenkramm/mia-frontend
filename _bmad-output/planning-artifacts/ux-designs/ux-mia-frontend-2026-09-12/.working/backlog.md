# UX Backlog

## Age-Adaptive Student Presentation

**Status:** Deferred beyond release one

Investigate whether the student presentation should adapt from the optional `year_of_birth` profile field. Potential adaptation
may include guidance density, mascot prominence, examples, and initial text-size defaults. Preserve the same navigation,
terminology, capabilities, authorization, and safety rules for every age. Use broad developmental bands, provide a neutral
fallback when the field is absent, and let explicit accessibility preferences override derived defaults.

Release one uses one age-inclusive student interface and does not differentiate students by age.

## Interactive Tutor Response Choices

**Status:** Deferred beyond release one

Investigate structured answer choices supplied by the tutor. Do not parse arbitrary model text into interactive controls. This
feature requires a bounded, trusted backend response schema containing choice labels and safe text payloads. Selecting a choice
should insert editable text into the student composer and must not submit automatically.

Release one provides frontend-owned static session starters, renders tutor responses as rich text, and uses the ordinary text
composer for replies.
