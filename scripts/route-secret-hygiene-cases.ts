// Actual Story 2.2 browser-test inventory, including cookie-only cases and the
// R1 repair. IDs/checkpoints are fixed public labels, never fixture-derived.
export const routeHygieneCases = [
  {
    id: "complete-tutoring-journey",
    title:
      "one synthetic invitation-to-second-tutoring-session journey preserves recovery and scope",
    checkpoints: [
      "journey-invitation",
      "journey-acceptance",
      "journey-student-input",
      "journey-student-replacement",
      "journey-tutoring",
      "journey-interrupted",
      "journey-denied",
      "complete",
    ],
  },
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
  {
    id: "preparation-readiness-unavailable",
    title:
      "readiness unavailable hides identity before explicit admission retry",
    checkpoints: ["readiness-unavailable", "complete"],
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
    id: "hub-reflow",
    title:
      "hub saved content and blockers reflow in every locale and text mode",
    checkpoints: ["hub-reflow", "complete"],
  },
  {
    id: "hub-long-values",
    title:
      "hub keeps long saved details and language tag readable at narrow widths",
    checkpoints: ["hub-reflow", "complete"],
  },
  {
    id: "hub-zoom",
    title: "hub remains operable at real 400 percent zoom",
    checkpoints: ["hub-zoom", "complete"],
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
  // Story 6.3 keeps every stream reader/reconciliation test in the same
  // deliberate-failure inventory; each owns a complete-journey checkpoint.
  // Story 6.4's new lifecycle/Stop/retry protocol cases have the same
  // protected page-memory boundary and explicit completion checkpoint.
  ...(
    [
      [
        "tutoring-lifecycle",
        "tutoring lifecycle return keeps a page-local draft and reconnects only after explicit Try now",
      ],
      [
        "tutoring-resource-denied",
        "tutoring addressed denial destroys retained draft while a failed check keeps it covered",
      ],
      [
        "tutoring-stop",
        "tutoring Stop accepts only definitive interrupted truth and keeps the targeted article",
      ],
      [
        "tutoring-stop-conflict",
        "tutoring Stop conflict requires an explicit fresh reconciliation",
      ],
      [
        "tutoring-stop-loss",
        "tutoring lost Stop stays unknown until targeted current work proves outcome",
      ],
      [
        "tutoring-two-tab",
        "tutoring two tabs reconcile stale Stop without retrying the destructive request",
      ],
      [
        "tutoring-stop-terminal-race",
        "tutoring queued Stop fences an older terminal work read without losing its targeted article",
      ],
      ...(["created", "replay", "conflict", "lose"] as const).map(
        (outcome) =>
          [
            `tutoring-retry-${outcome}`,
            `tutoring explicit linked retry ${outcome} preserves the earlier attempt without automatic POST replay`,
          ] as const,
      ),
    ] as const
  ).map(([id, title]) => ({
    id,
    title,
    checkpoints:
      id === "tutoring-resource-denied"
        ? ["tutoring-resource-recoverable", id, "complete"]
        : [id, "complete"],
  })),
  ...(
    [
      [
        "tutoring-stream-initial",
        "tutoring initial generating snapshots stay silent; queued to generating speaks only once",
      ],
      [
        "tutoring-stream-transition",
        "tutoring queued to generating transition speaks once without speaking deltas",
      ],
      [
        "tutoring-stream-reader",
        "tutoring reader away preserves earlier focus selection and scroll until unseen action is activated",
      ],
      [
        "tutoring-stream-pause",
        "tutoring pause buffers transport loss without changing transcript or live region until Resume",
      ],
      [
        "tutoring-stream-terminal-pending",
        "tutoring terminal remains unconfirmed and silent until persisted targeted truth arrives",
      ],
      [
        "tutoring-stream-terminal-unconfirmed",
        "tutoring failed terminal read never claims completion",
      ],
      [
        "tutoring-stream-terminal-disagreement",
        "tutoring persisted outcome overrides a differing SSE terminal claim",
      ],
      [
        "tutoring-stream-terminal",
        "tutoring native stream reconciles its terminal response without reopening or speaking content",
      ],
      [
        "tutoring-stream-loss",
        "tutoring transport loss closes the stream once and retains focus without automatic recovery",
      ],
    ] as const
  ).map(([id, title]) => ({ id, title, checkpoints: ["complete"] })),
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
      "tutoring completed session renders only persisted read-only turns and can begin another permitted session",
    checkpoints: ["tutoring-finished", "complete"],
  },
  ...(
    [
      [
        "tutoring-finish-success",
        "tutoring Finish confirms once after ordered prevalidation then reads persisted transcript without new messages",
      ],
      [
        "tutoring-finish-owner",
        "tutoring dual-capability non-owner completed session denies before transcript GET with the fixed unknown surface",
      ],
      [
        "tutoring-finish-ineligible",
        "tutoring Finish stays unavailable for denied or generating work without a completion POST",
      ],
      [
        "tutoring-finish-unknown",
        "tutoring lost Finish response stays unknown until explicit completed-session read without replay",
      ],
      [
        "tutoring-finish-stopped",
        "tutoring Stop waiting on Finish never claims success or replays the late POST",
      ],
      [
        "tutoring-finish-return",
        "tutoring unknown Finish stays interlocked after workspace return while the first POST is held",
      ],
      [
        "tutoring-finish-failed-check",
        "tutoring lost uncommitted Finish stays reconcile-only after failed then eligible Refresh",
      ],
      [
        "tutoring-finish-resolved",
        "tutoring late definitive Finish rejection clears unknown for a freshly confirmed attempt",
      ],
      [
        "tutoring-finish-race",
        "tutoring Finish race reads new authoritative work after a stale eligibility conflict",
      ],
      [
        "tutoring-finish-access",
        "tutoring Finish dialog and completed transcript retain keyboard access and reflow at 320 pixels",
      ],
      [
        "tutoring-finish-zoom",
        "tutoring completed transcript preserves semantics at actual 200 percent zoom in forced colors",
      ],
    ] as const
  ).map(([id, title]) => ({ id, title, checkpoints: [id, "complete"] })),
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
