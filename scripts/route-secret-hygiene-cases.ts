// Actual Story 2.2 browser-test inventory, including cookie-only cases and the
// R1 repair. IDs/checkpoints are fixed public labels, never fixture-derived.
export const routeHygieneCases = [
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
