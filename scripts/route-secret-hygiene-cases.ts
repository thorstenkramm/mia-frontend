// Actual Story 2.2 browser-test inventory, including cookie-only cases and the
// R1 repair. IDs/checkpoints are fixed public labels, never fixture-derived.
export const routeHygieneCases = [
  {
    id: "student-entry-learn",
    title:
      "student replacement enters Learn and later sign-in rediscovers persisted joined-course metadata",
    checkpoints: [
      "student-entry-provision-input",
      "student-entry-login-input",
      "student-entry-replacement-input",
      "learn-metadata",
      "student-entry-later-login-input",
      "complete",
    ],
  },
  ...(
    [
      [
        "learn-discovery",
        "Learn mixed-role discovery shows only joined active courses and metadata without downloads",
        ["learn-metadata", "complete"],
      ],
      [
        "learn-hidden",
        "Learn hidden causes retain neutral primary copy focus exits and no stale course identity",
        ["learn-hidden", "complete"],
      ],
      [
        "learn-lifecycle",
        "Learn delayed course response is fenced by lifecycle and changed membership is rediscovered on Refresh",
        ["learn-hidden", "complete"],
      ],
      [
        "learn-pages",
        "Learn bounded joined batches and filtered-empty material pages require explicit continuation",
        ["learn-metadata", "learn-error", "complete"],
      ],
      [
        "learn-locales",
        "Learn surfaces reflow in all seven locales and text modes with metadata kept inert",
        ["learn-metadata", "complete"],
      ],
      [
        "learn-zoom",
        "Learn surfaces preserve keyboard structure spacing and actual 200 percent zoom in every text mode",
        ["complete"],
      ],
    ] as const
  ).map(([id, title, checkpoints]) => ({ id, title, checkpoints })),
  ...["standard", "large", "extra-large"].map((size) => ({
    id: `student-entry-handoff-${size}`,
    title: `provisioned student replacement reaches Home and later password-only sign-in at 320 pixels with ${size} text`,
    checkpoints: [
      "student-entry-provision-input",
      "student-entry-login-input",
      "student-entry-replacement-input",
      "student-entry-later-login-input",
      "complete",
    ],
  })),
  {
    id: "student-entry-gate-recovery",
    title:
      "student failed shell admission recovers by read without replacement replay",
    checkpoints: [
      "student-entry-provision-input",
      "student-entry-login-input",
      "student-entry-replacement-input",
      "student-entry-gate-error",
      "complete",
    ],
  },
  {
    id: "student-entry-gate-hidden",
    title:
      "student hidden pending admission fences late Home until explicit Refresh",
    checkpoints: [
      "student-entry-provision-input",
      "student-entry-login-input",
      "student-entry-replacement-input",
      "complete",
    ],
  },
  {
    id: "student-entry-zoom",
    title:
      "student connected replacement stays operable at actual 200 percent zoom in all text modes",
    checkpoints: [
      "student-entry-provision-input",
      "student-entry-login-input",
      "student-entry-replacement-input",
      "complete",
    ],
  },
  {
    id: "student-boundary",
    title:
      "student temporary password enabled unfocused boundaries meet contrast in normal and invalid states",
    checkpoints: [
      "student-boundary-normal",
      "student-boundary-invalid",
      "complete",
    ],
  },
  ...["profiles", "language", "username-profiles", "all-fields"].map(
    (scenario) => ({
      id: `student-field-errors-${scenario}`,
      title: `student local ${scenario} errors have linked DOM order and precise corrective focus`,
      checkpoints: ["student-field-errors", "complete"],
    }),
  ),
  {
    id: "student-paste",
    title:
      "student password paste preserves exact Unicode spaces and clipboard has no automatic handoff",
    checkpoints: ["student-pasted", "complete"],
  },
  ...["csrf", "expired", "restricted", "denied"].map((loss) => ({
    id: `student-security-${loss}`,
    title: `student ${loss} clears credential surface and never retries unsafe creation`,
    checkpoints: ["student-security", "complete"],
  })),
  {
    id: "student-gates",
    title:
      "student stage and independent capability gates never discover course or roster",
    checkpoints: ["complete"],
  },
  {
    id: "student-inactive",
    title:
      "student preflight deactivation sends nothing and inactive POST destroys credentials",
    checkpoints: ["student-inactive", "complete"],
  },
  {
    id: "student-connected",
    title:
      "student connected active nonaccepting hub creates once and reads minimal membership and roster",
    checkpoints: ["student-input", "student-success", "complete"],
  },
  ...["conflict", "invalid"].map((outcome) => ({
    id: `student-${outcome}`,
    title: `student ${outcome} preserves native correction and raw disclosure remains inert`,
    checkpoints: ["student-rejected", "complete"],
  })),
  ...["lose", "malformed", "server"].map((outcome) => ({
    id: `student-${outcome}`,
    title: `student ${outcome} drops credentials and explicit bounded reconciliation never confirms attempt`,
    checkpoints: ["student-unknown", "student-reconciled", "complete"],
  })),
  {
    id: "student-stopped",
    title:
      "student stopped dispatch destroys native controls and fences late definitive response",
    checkpoints: ["student-stopped", "student-late", "complete"],
  },
  {
    id: "student-lifecycle",
    title:
      "student lifecycle and scope loss destroy credentials without automatic discovery",
    checkpoints: ["student-cleared", "complete"],
  },
  {
    id: "student-dirty",
    title:
      "student dirty keyboard departure keeps safe focus then discards credential controls",
    checkpoints: ["student-stay", "student-discard", "complete"],
  },
  {
    id: "student-roster",
    title:
      "student inactive roster pages remain authorized while creation and unsupported actions stay absent",
    checkpoints: ["complete"],
  },
  {
    id: "student-denied",
    title:
      "student denied membership clears identity with a fixed neutral presentation",
    checkpoints: ["complete"],
  },
  {
    id: "student-locales",
    title:
      "student all seven locales and text modes preserve form roster membership reflow and semantics",
    checkpoints: ["complete"],
  },
  ...["standard", "large", "extra-large"].map((mode) => ({
    id: `student-zoom-${mode}`,
    title: `student complete process at real 200 percent browser zoom ${mode}`,
    checkpoints: ["student-input", "complete"],
  })),
  {
    id: "preparation-activation-not-accepting",
    title:
      "activation definitive response announces once and newer nonaccepting hub truth remains authoritative",
    checkpoints: ["complete"],
  },
  {
    id: "preparation-activation-hub-failed",
    title:
      "activation definitive success survives failed hub read without guessing current acceptance",
    checkpoints: ["complete"],
  },
  {
    id: "preparation-activation-blocked",
    title:
      "activation blocked readiness links resolve only implemented same-course prerequisites",
    checkpoints: ["complete"],
  },
  ...["active_not_accepting", "previously-active"].map((state) => ({
    id: `preparation-activation-state-${state}`,
    title: `activation ${state} never becomes reactivation or viewer session eligibility`,
    checkpoints: ["complete"],
  })),
  ...["en-US", "de-DE", "es-ES", "es-AR", "fr-FR", "pt-PT", "pt-BR"].flatMap(
    (locale) =>
      ["standard", "large", "extra-large"].map((mode) => ({
        id: `preparation-activation-reflow-${locale}-${mode}`,
        title: `activation readiness confirmation ${locale} ${mode} reflow at 320`,
        checkpoints: ["complete"],
      })),
  ),
  ...[2, 4].flatMap((factor) =>
    ["standard", "large", "extra-large"].map((mode) => ({
      id: `preparation-activation-zoom-${factor}-${mode}`,
      title: `activation both surfaces browser zoom ${factor * 100} ${mode}`,
      checkpoints: ["complete"],
    })),
  ),
  {
    id: "preparation-activation-connected",
    title:
      "activation connected approval readiness and keyboard confirmation end at authoritative hub",
    checkpoints: ["activation-review", "activation-hub", "complete"],
  },
  ...["conflict", "lose", "malformed", "server-error"].map((outcome) => ({
    id: `preparation-activation-${outcome}`,
    title: `activation ${outcome} requires explicit reconciliation without success or replay`,
    checkpoints: ["activation-outcome", "activation-reconciled", "complete"],
  })),
  {
    id: "preparation-activation-stopped",
    title:
      "activation stopped pending response and lifecycle teardown fence late navigation",
    checkpoints: ["activation-stopped", "activation-cleared", "complete"],
  },
  {
    id: "material-delete-new-attempt",
    title:
      "material deletion new attempt retires rejection and stopped late success stays unknown",
    checkpoints: [
      "material-delete-prior-rejected",
      "material-delete-new-chosen",
      "material-delete-new-stopped",
      "material-delete-new-late-success",
      "complete",
    ],
  },
  ...["material", "files"].flatMap((path) =>
    ["http", "transport"].map((outcome) => ({
      id: `material-deleted-refresh-${path}-${outcome}`,
      title: `material confirmed deletion survives ${path} ${outcome} refresh failure`,
      checkpoints: [
        `material-deleted-read-failed-${path}-${outcome}`,
        `material-deleted-read-recovered-${path}-${outcome}`,
        "complete",
      ],
    })),
  ),
  {
    id: "material-csrf",
    title:
      "material CSRF rejection fences the queue until explicit ordered recovery",
    checkpoints: [
      "material-csrf-cleared",
      "material-csrf-recovered",
      "complete",
    ],
  },
  ...["create", "delete"].flatMap((operation) =>
    ["unknown", "rejected"].map((outcome) => ({
      id: `material-feedback-${operation}-${outcome}`,
      title: `material ${operation} ${outcome} live feedback is truthful deduplicated and retired`,
      checkpoints: [
        `material-${operation}-feedback-${outcome}`,
        `material-${operation}-retired-${outcome}`,
        "complete",
      ],
    })),
  ),
  {
    id: "material-validation",
    title:
      "material name errors are associated corrective and cleared before valid dispatch",
    checkpoints: [
      "material-validation-long",
      "material-validation-corrected",
      "complete",
    ],
  },
  {
    id: "material-loading",
    title:
      "material lazy loading failure stays neutral with a localized safe exit",
    checkpoints: ["complete"],
  },
  {
    id: "material-mutations",
    title:
      "material unknown creation and removal retain truth without automatic unsafe replay",
    checkpoints: [
      "material-create-unknown",
      "material-delete-unknown",
      "complete",
    ],
  },
  {
    id: "material-connected",
    title:
      "material connected native picker serializes persisted review and exact removal",
    checkpoints: [
      "material-create-input",
      "material-selected",
      "material-persisted",
      "complete",
    ],
  },
  {
    id: "material-unknown",
    title:
      "material lost upload pauses duplicate sources and reconciles without correlation or replay",
    checkpoints: ["material-unknown", "material-reconciled", "complete"],
  },
  {
    id: "material-security",
    title:
      "material denial lifecycle and private scope destroy controls before dependent work",
    checkpoints: ["material-cleared", "material-error", "complete"],
  },
  {
    id: "material-keyboard",
    title:
      "material keyboard review handles 200 rows mixed formats and explicit row fallback",
    checkpoints: ["material-many", "complete"],
  },
  {
    id: "material-locales",
    title:
      "material all locales and text modes preserve native queue reflow and stable controls",
    checkpoints: ["complete"],
  },
  {
    id: "material-zoom",
    title:
      "material connected process remains usable at real 200 percent browser zoom",
    checkpoints: ["complete"],
  },
  {
    id: "preparation-stopped-denial",
    title:
      "preparation stopped operations retain applicable hidden denial teardown",
    checkpoints: [
      "preparation-stop-PATCH",
      "preparation-hidden-PATCH",
      "preparation-stop-GET",
      "preparation-hidden-GET",
      "complete",
    ],
  },
  {
    id: "preparation-pending-draft",
    title:
      "preparation pending dirty reads guard hub Home Back unload and yield to security",
    checkpoints: [
      "preparation-read-pending",
      "preparation-read-stay",
      "preparation-read-discard",
      "preparation-read-cleared",
      "complete",
    ],
  },
  {
    id: "preparation-mobile",
    title:
      "preparation mobile departure preserves focus then security clears delayed save",
    checkpoints: ["complete"],
  },
  {
    id: "preparation-connected",
    title:
      "preparation connected fields persist independently without invented readiness",
    checkpoints: ["preparation-input", "preparation-persisted", "complete"],
  },
  {
    id: "preparation-scope",
    title:
      "preparation scope gates prevent reads and changed assignments tear down drafts",
    checkpoints: ["complete"],
  },
  {
    id: "preparation-readiness",
    title:
      "preparation authoritative readiness and safe blocker links remain distinct",
    checkpoints: ["preparation-error", "complete"],
  },
  {
    id: "preparation-hidden",
    title:
      "preparation hidden save denial removes preview and reveals only inert technical error",
    checkpoints: ["preparation-error", "complete"],
  },
  {
    id: "preparation-unknown",
    title:
      "preparation unknown PATCH reconciles current values without unsafe replay",
    checkpoints: ["preparation-unknown", "complete"],
  },
  {
    id: "preparation-stopped",
    title:
      "preparation Stop waiting fences late success and dirty history guards navigation",
    checkpoints: ["preparation-persisted", "preparation-newer", "complete"],
  },
  {
    id: "preparation-invalid",
    title:
      "preparation invalid fields have corrective semantics and measured contrast",
    checkpoints: ["preparation-error", "complete"],
  },
  {
    id: "preparation-reflow",
    title:
      "preparation reflows across all locales text modes spacing and forced colors",
    checkpoints: ["complete"],
  },
  {
    id: "preparation-zoom",
    title:
      "preparation connected process remains usable at real 200 percent zoom",
    checkpoints: ["preparation-input", "preparation-persisted", "complete"],
  },
  {
    id: "course-boundaries",
    title:
      "course enabled unfocused boundaries and collection landmarks are accessible",
    checkpoints: ["complete"],
  },
  {
    id: "course-hidden-locales",
    title:
      "course hidden detail causes share neutral presentation in every locale",
    checkpoints: ["course-persisted", "complete"],
  },
  {
    id: "course-connected",
    title:
      "course creation persists atomically and assigned scope discovers it",
    checkpoints: ["course-input", "course-persisted", "complete"],
  },
  {
    id: "course-scope",
    title:
      "course authority and scope never broaden through role or empty scope",
    checkpoints: ["course-persisted", "complete"],
  },
  {
    id: "course-hidden",
    title: "course hidden selector denial removes draft dialog and labels",
    checkpoints: ["course-input", "course-error", "complete"],
  },
  {
    id: "course-unknown",
    title: "course lost response freezes the journey without replay",
    checkpoints: ["course-input", "course-persisted", "complete"],
  },
  {
    id: "course-stopped",
    title: "course stopping waiting fences late create success",
    checkpoints: ["course-input", "complete"],
  },
  {
    id: "course-departure",
    title:
      "course dirty navigation and lifecycle security have separate boundaries",
    checkpoints: ["course-input", "complete"],
  },
  {
    id: "course-reflow",
    title: "course create reflows in every locale and text mode",
    checkpoints: ["complete"],
  },
  {
    id: "course-zoom",
    title: "course connected process remains operable at real 200 percent zoom",
    checkpoints: ["course-input", "course-persisted", "complete"],
  },
  // Story 6.1/6.2 tutoring session start/intent/workspace
  // (e2e/tutoringSessions.spec.ts).
  {
    id: "tutoring-start",
    title:
      "tutoring start chooses course and material once and reload resumes through recovery",
    checkpoints: ["tutoring-content", "complete"],
  },
  {
    id: "tutoring-conflict",
    title:
      "tutoring active-session conflict discovers once and never dispatches a second start",
    checkpoints: ["tutoring-course", "complete"],
  },
  {
    id: "tutoring-unknown",
    title:
      "tutoring lost start response reconciles through discovery and a fresh sign-in rediscovers the session",
    checkpoints: ["tutoring-course", "complete"],
  },
  {
    id: "tutoring-retry",
    title:
      "tutoring reconciled unknown retries only the exact retained request identity",
    checkpoints: ["tutoring-content", "complete"],
  },
  {
    id: "tutoring-hidden",
    title:
      "tutoring hidden causes share the fixed neutral presentation without start affordances",
    checkpoints: ["learn-hidden", "complete"],
  },
  {
    id: "tutoring-finished",
    title:
      "tutoring completed session shows the fixed finished notice without transcript reads",
    checkpoints: ["complete"],
  },
  {
    id: "tutoring-queue",
    title:
      "tutoring workspace queues one message during an answer and keeps the draft when the queue is full",
    checkpoints: ["tutoring-content", "complete"],
  },
  {
    id: "tutoring-send-unknown",
    title:
      "tutoring lost workspace send reconciles through the current work read and retries only the exact attempt",
    checkpoints: ["tutoring-content", "complete"],
  },
  {
    id: "tutoring-send-busy",
    title:
      "tutoring busy workspace send keeps the draft and recovers only through explicit Refresh",
    checkpoints: ["tutoring-content", "complete"],
  },
  {
    id: "tutoring-send-reload",
    title:
      "tutoring reload during an unsettled send loses the draft and never replays",
    checkpoints: ["tutoring-content", "complete"],
  },
  {
    id: "tutoring-locales",
    title:
      "tutoring start recovery and workspace reflow in all seven locales and text modes at 320 pixels",
    checkpoints: ["tutoring-content", "complete"],
  },
  {
    id: "tutoring-zoom",
    title:
      "tutoring surfaces preserve keyboard structure and pass axe at actual 200 percent zoom in every text mode",
    checkpoints: ["complete"],
  },
  // Story 3.2 executes the actual joined cases in scaffold's bounded describe.
  ...["standard", "large", "extra-large"].map((size) => ({
    id: `supervisor-handoff-${size}`,
    title: `connected supervisor setup reaches password-only shell at 320 pixels with ${size} text`,
    checkpoints: [
      "invitation-email",
      "invitation-detail",
      "onboarding-acceptance-input",
      "onboarding-login-input",
      "complete",
    ],
  })),
  {
    id: "supervisor-gate-hidden",
    title:
      "hidden pending supervisor admission rejects its late result until explicit Refresh",
    checkpoints: [
      "invitation-email",
      "invitation-detail",
      "onboarding-acceptance-input",
      "onboarding-login-input",
      "complete",
    ],
  },
  {
    id: "supervisor-gate-recovery",
    title:
      "failed supervisor admission recovers by read without login replay or administrator scope",
    checkpoints: [
      "invitation-email",
      "invitation-detail",
      "onboarding-acceptance-input",
      "onboarding-login-input",
      "onboarding-gate-error",
      "complete",
    ],
  },
  {
    id: "supervisor-existing-factor",
    title:
      "an existing supervisor factor requires its authoritative challenge before shell admission",
    checkpoints: [
      "invitation-email",
      "invitation-detail",
      "onboarding-acceptance-input",
      "onboarding-login-input",
      "onboarding-mfa-input",
      "complete",
    ],
  },
  {
    id: "supervisor-acceptance-unknown",
    title:
      "lost committed supervisor acceptance stays unknown and never replays through a consumed link",
    checkpoints: [
      "invitation-email",
      "invitation-detail",
      "onboarding-acceptance-input",
      "onboarding-login-input",
      "complete",
    ],
  },
  {
    id: "supervisor-revoked-link",
    title:
      "administrator revocation invalidates the delivered supervisor link without public identity",
    checkpoints: ["invitation-email", "invitation-detail", "complete"],
  },
  {
    id: "supervisor-locales",
    title:
      "connected supervisor handoff remains operable in every launch locale and text mode",
    checkpoints: [
      "invitation-email",
      "invitation-detail",
      "onboarding-acceptance-input",
      "onboarding-login-input",
      "complete",
    ],
  },
  {
    id: "supervisor-zoom",
    title:
      "connected supervisor handoff stays usable at actual 200 percent zoom in all text modes",
    checkpoints: [
      "invitation-email",
      "invitation-detail",
      "onboarding-acceptance-input",
      "onboarding-login-input",
      "complete",
    ],
  },
  {
    id: "navigation-history",
    title:
      "direct, reload and client history freshly establish ordered admission",
    checkpoints: ["complete"],
  },
  {
    id: "navigation-scope",
    title:
      "delayed navigation with scope revoked never loads a protected chunk",
    checkpoints: ["complete"],
  },
  {
    id: "navigation-sequence",
    title:
      "same-path history identity announces only after title and before heading focus",
    checkpoints: ["complete"],
  },
  {
    id: "navigation-reload",
    title:
      "verify and codes Reload reconstruct only authoritative metadata, never mutation payloads",
    checkpoints: ["complete"],
  },
  {
    id: "navigation-invitation",
    title:
      "invitation parents retain the allowed link flow, clear form values and discard the token on exit",
    checkpoints: ["invitation-form"],
  },
  {
    id: "recovery-logout",
    title:
      "rejected logout chunk retains failure guidance and explicit Retry without protected reveal",
    checkpoints: ["logout-unconfirmed"],
  },
  {
    id: "recovery-chunk",
    title:
      "rejected production chunk leaves a usable eager frame and explicit document Reload",
    checkpoints: ["complete"],
  },
  ...["session", "capabilities", "resource"].map((layer) => ({
    id: `recovery-read-${layer}`,
    title: `failed ${layer} read keeps neutral recovery and explicit Check again`,
    checkpoints: ["read-failure"],
  })),
  {
    id: "recovery-codes-chunk",
    title:
      "unavailable codes chunk refuses parent and omits Reload while eager Sign out works",
    checkpoints: ["totp-input", "codes-held"],
  },
  {
    id: "recovery-codes-read",
    title:
      "a codes-route read failure retains default-deny recovery with independent Sign out",
    checkpoints: ["totp-input", "codes-held"],
  },
  ...["standard", "large", "extra-large"].map((mode) => ({
    id: `recovery-reflow-${mode}`,
    title: `recovery reflows at 320 CSS pixels and zoom equivalent with ${mode} text`,
    checkpoints: ["complete"],
  })),
  ...["de-DE", "en-US", "es-AR", "es-ES", "fr-FR", "pt-BR", "pt-PT"].map(
    (locale) => ({
      id: `recovery-locale-${locale}`,
      title: `localized recovery retains operable controls and no page scroll in ${locale}`,
      checkpoints: ["complete"],
    }),
  ),
  ...[200, 400].map((zoom) => ({
    id: `recovery-zoom-${zoom}`,
    title: `route recovery remains operable at actual ${zoom}% browser zoom in all text modes`,
    checkpoints: ["complete"],
  })),
  // Story 3.1 invitation administration (e2e/invitationAdministration.spec.ts).
  {
    id: "invitation-mobile-discard",
    title:
      "mobile dirty confirmation names its consequence and security closure cancels deferred departure",
    checkpoints: ["invitation-email", "complete"],
  },
  {
    id: "invitation-forward",
    title:
      "dirty Forward stays without requests or discards exactly one traversal",
    checkpoints: ["invitation-email", "complete"],
  },
  {
    id: "invitation-create",
    title:
      "administrator invites a supervisor with one dispatch and reaches its persisted detail",
    checkpoints: ["invitation-email", "invitation-detail", "complete"],
  },
  {
    id: "invitation-discard",
    title:
      "dirty create form asks Stay or Discard for shell, browser Back and Reload departures",
    checkpoints: ["invitation-email", "complete"],
  },
  {
    id: "invitation-unknown",
    title:
      "unknown create, resend and revoke outcomes never replay and reconcile on request",
    checkpoints: ["invitation-error", "complete"],
  },
  {
    id: "invitation-revoke-stale",
    title:
      "revoke binds the reviewed ETag and sends nothing after a concurrent change",
    checkpoints: ["complete"],
  },
  {
    id: "invitation-accessibility",
    title: "invitation surfaces pass axe with visible keyboard focus",
    checkpoints: ["complete"],
  },
  ...["standard", "large", "extra-large"].map((size) => ({
    id: `invitation-reflow-${size}`,
    title: `invitation surfaces reflow at 320 CSS pixels with ${size} text`,
    checkpoints: ["complete"],
  })),
  {
    id: "invitation-locales",
    title:
      "invitation surfaces stay operable without page scroll in every launch locale",
    checkpoints: ["complete"],
  },
  {
    id: "invitation-zoom",
    title: "invitation management remains operable at actual 200% browser zoom",
    checkpoints: ["complete"],
  },
];
