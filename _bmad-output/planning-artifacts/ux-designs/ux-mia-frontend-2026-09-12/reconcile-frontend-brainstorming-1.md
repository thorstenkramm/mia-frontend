# Frontend Brainstorming 1 Reconciliation

The questionnaire is discovery input; `.memlog.md` is canonical. References use memlog entry order and line number.

## Preserved

- **Safe experience:** Safe, patient, guided, forgiving, calm, focused, non-controlling, and not overwhelming are
  preserved by #6 (line 11).
- **No gamification:** Tutoring and exam simulation are not games, preserved by #7 (line 12).
- **Preparation guidance:** Careful course preparation and fast routine user administration are preserved by #8
  (line 13).
- **Visible work:** Waiting must visibly show that work continues, preserved by #9 (line 14), with truthful states in
  #29 and #38.
- **AI transparency:** The tutor openly identifies as AI-powered, preserved by #9 (line 14).
- **Unified UI:** One interface serves users with multiple roles, preserved by #10 (line 15) and detailed in #28.
- **Initial visual direction:** No release-one dark theme and a desirable age-inclusive mascot are preserved by #11
  (line 16).
- **Voice:** Formal, warm, non-colloquial language, simplified for students, is preserved by #12 (line 17).
- **Locales:** The seven specified regional launch locales are preserved by #13 (line 18) and detailed in #34.
- **Priorities:** Course preparation and tutoring lead; administration may be merely functional, per #14 (line 19).
- **Text and consistency:** Built-in text sizing and cross-surface consistency are preserved by #15 (line 20) and #35.
- **Shared devices:** Visible logout and inactivity security are represented by the expiry behavior in #33 (line 38).
- **Conversation UI:** A conversation-focused workspace and rich output are preserved by #29 and #56 (lines 34, 61).
- **Desktop browser:** Desktop-browser use without phone-specific workflows is preserved in qualified form by #55.
- **Human mentoring:** External-service scheduling for a human conversation is preserved by #49 (line 54).
- **Administration:** Accounts, courses, jobs, invitations, and oversight are represented by #50 (line 55).
- **Personas:** Pablo in rural Argentina on a shared school desktop and an older international mentor are preserved by
  #57 (line 62).

## Clarified

- **Tooltips:** #26 (line 31) reserves tooltips for supplemental help. Labels, helper text, examples, and validation
  carry essential guidance.
- **Preparation quality:** #27 and #31 (lines 32, 36) express its tutoring impact through readiness, processing,
  review, and approval.
- **Learning goals:** #44 (line 49) defines guided plain text, limits, examples, preview, and saveable incomplete work.
- **Praise and progress:** #23 (line 28) requires evidence-based praise and forbids invented progress, mastery, grades,
  or history.
- **Suggested activities:** #25 (line 30) defines localized static starters, editable free text, and optional material.
- **Clickable answers:** #25 supports static starters. #30 (line 35) defers tutor-generated choices pending a bounded
  backend schema.
- **Backend errors:** #16 (line 21) adds a localized explanation and expandable exact details while excluding secrets.
- **Preferred language:** #34 (line 39) defines negotiation, fallback, formatting, time zone, and untranslated content.
- **Back and Reload:** #39 (line 44) makes browser navigation safe instead of treating its use as a UX failure.
- **Rich tutor text:** #56 (line 61) permits a safe subset and excludes remote, executable, and model-defined controls.
- **Mascot:** #36 (line 41) makes it optional, restrained, non-anthropomorphic, non-essential, and non-rewarding.
- **Success:** #14 and #57 define independent second-session use and course activation without a manual.
- **Simple mentoring:** #49 defines minimal scheduling, external links, time zones, and lifecycle effects.

## Overridden

- **Human-guided tutoring:** Discovery assumes humans always guide sessions and the first session. #20 (line 25)
  treats the student as alone; external guidance is neither assumed nor represented.
- **Full HD blocking:** Discovery requires Full HD and prevention on small screens. #21 and #55 advise below a
  provisional 1024 CSS px floor and never block essential actions.
- **Optional accessibility:** Discovery makes WCAG AA negotiable. #21 and #40 make WCAG 2.2 AA a release baseline.
- **Student-standing summary:** Discovery asks for a quick mentor summary. #17 (line 22) prohibits an AI-generated
  standing summary and limits the briefing to authorized request and scheduling data.
- **Hidden mentoring:** Discovery permits hiding mentoring in release one. #19 (line 24) requires the complete
  lifecycle, though it remains low-priority and merely functional.
- **Tutor answer buttons:** Discovery favors clickable answers. #30 prohibits controls parsed from unstructured tutor
  output and defers structured choices.

## Deferred

- **Age-adaptive UI:** #22 (line 27) defers it. Backlog `Age-Adaptive Student Presentation` records the investigation.
- **Tutor-supplied choices:** #30 defers them. Backlog `Interactive Tutor Response Choices` defines prerequisites.
- **Expiry warning:** Not explicitly requested, but related shared-device protection is deferred by #33 and backlog
  `Session Expiry Warning`.

## Still Open

- **Minimum viewport:** #21 and #55 retain a provisional 1024 CSS-pixel floor pending prototype validation.
- **Mascot:** #11 and #36 leave adoption and design conditional on validation across audiences.
- **Age adaptation:** The backlog calls for post-release-one investigation but makes no adoption decision.
- **Structured choices:** The backlog requires a trusted backend schema but makes no delivery commitment.

## Dropped Qualitative Ideas

These discovery details are neither canonical decisions nor backlog items:

- Students use MIA after class, specifically from 3 p.m. to 6 p.m.
- A teacher recommends and explains MIA before the first session. Required guidance is overridden by #20; an optional
  external introduction is not represented.
- Students may initially feel excited or anxious.
- MIA feels like a companion or the most patient "person." Patience is preserved, but the metaphor is not; #36 also
  prevents a mascot from embodying the tutor or implying consciousness.
- Supervisors are teachers, childhood educators, or education professionals who devote whatever time preparation needs.
- Supervisors hold ample classroom material and usually prepare goals in Office or on paper.
- The explicit teaching message that AI "cannot do magic" is not retained as interface copy.
- Mentors may be university students, retirees, former teachers, or volunteers up to age 70. Rosa preserves one example,
  but these audience bounds are not canonical requirements.
- Keeping a mentoring conversation focused is solely the mentor's duty.
- Administrators are assumed to be highly technically confident.
- Lack of complaints is proposed as success, but no usability metric or measurement decision records it.

## Resolved Scope Clarifications

- Phones may receive SMS codes or run an authenticator app, while the MIA interface remains on the desktop. A phone-browser
  workflow is not supported or tested, though essential authentication is not deliberately broken below the desktop floor.
- Release one is a desktop-browser product for every audience. This is a support and optimization boundary, not physical-device
  detection or an access block.
