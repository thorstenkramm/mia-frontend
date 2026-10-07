import {
  discoverSession,
  continueSession,
  getCurrentAccountCapabilities,
  logoutCurrentBrowser,
  loginWithPassword,
  changeTemporaryPassword,
  consumeMfaRecoveryCode,
  requestPasswordRecovery,
  resetPassword,
  verifyMfaChallenge,
  previewInvitation,
  acceptInvitation,
  type EntryApiFailure,
  type EntrySession,
  type SessionDeadlines,
  type AccountId,
  type MfaChallengeId,
  type PasswordResetToken,
  type InvitationToken,
  type InvitationRole,
  type InvitationAcceptanceFields,
} from "../api/entry";
import {
  ApiHttpError,
  ApiProtocolError,
  ApiTransportError,
} from "../api/client";

export type AuthenticationBootstrapState =
  | { readonly kind: "Cold" }
  | { readonly kind: "Checking"; readonly phase: "loading" }
  | {
      readonly kind: "Checking";
      readonly phase: "failed";
      readonly error: EntryApiFailure;
    }
  | { readonly kind: "Signed out"; readonly outcome?: LoginOutcome }
  | {
      readonly kind: "MFA required";
      readonly accountId: AccountId;
      readonly challengeId: MfaChallengeId;
      readonly route: MfaRoute;
      readonly outcome?: MfaOutcome;
    }
  | {
      readonly kind: "Password change";
      readonly accountId: AccountId;
      readonly outcome?: PasswordChangeOutcome;
    }
  | { readonly kind: "Access checking"; readonly phase: "loading" }
  | {
      readonly kind: "Access checking";
      readonly phase: "failed";
      readonly error: EntryApiFailure;
    }
  | {
      readonly kind: "Authenticated";
      readonly absoluteWarning?: boolean;
      readonly lifecycle?:
        "Warning due" | "Continue dispatching" | "Continue retryable";
      readonly error?: EntryApiFailure;
    }
  | {
      readonly kind: "Privacy shield";
      readonly anonymousOrigin?: boolean;
      readonly phase: "pending" | "checking";
      readonly reason?:
        | "lifecycle"
        | "deadline"
        | "continuation unknown"
        | "continuation denied"
        | "recovery failed"
        | "stopped"
        | "access lost";
      readonly error?: EntryApiFailure;
    }
  // Stories 1-6 and 1-7: cold discovery found `authenticated` while a captured link
  // waits for its interstitial. No capability or other protected read runs.
  | (SessionDeadlines & {
      readonly kind: "Access deferred";
      readonly accountId: AccountId;
    })
  | {
      readonly kind: "Rotating";
      readonly origin: "login";
      readonly phase: "submitting" | "reconciling" | "reconciliation failed";
      readonly error?: EntryApiFailure;
      readonly reconciliationError?: EntryApiFailure;
    }
  | {
      readonly kind: "Rotating";
      readonly origin: "mfa";
      readonly phase: "submitting" | "reconciling" | "reconciliation failed";
      readonly route: MfaRoute;
      readonly accountId: AccountId;
      readonly challengeId: MfaChallengeId;
      readonly error?: EntryApiFailure;
      readonly reconciliationError?: EntryApiFailure;
    }
  | {
      readonly kind: "Rotating";
      readonly origin: "password-change";
      readonly phase: "submitting" | "reconciling" | "reconciliation failed";
      readonly accountId: AccountId;
      readonly error?: EntryApiFailure;
      readonly reconciliationError?: EntryApiFailure;
    }
  | { readonly kind: "Restricted expired" }
  | { readonly kind: "Logout start" }
  | { readonly kind: "Logout quiescing" }
  | { readonly kind: "Logout dispatch" }
  | { readonly kind: "Logout confirming" }
  | { readonly kind: "Logout confirmed" }
  | {
      readonly kind: "Logout unconfirmed";
      readonly error?: EntryApiFailure;
    }
  | { readonly kind: "Logout reconciliation needed" };

type Listener = () => void;
// A `lifecycle` shield only masks route-local secrets; every other teardown
// destroys them (owner decision 2026-10-05).
export type SecurityTeardownScope = "mask" | "destroy";
type SecurityTeardown = (scope: SecurityTeardownScope) => void;
// The gate decisions the current authenticated tab passed, in one security
// epoch. Every destroying teardown starts a new epoch.
export type AuthenticatedAccess = {
  readonly accountId: AccountId;
  readonly ownProfileView: boolean;
  readonly invitationAdministration: boolean;
  readonly epoch: number;
};
export type AuthenticatedReadResult<T> =
  | { readonly kind: "completed"; readonly value: T }
  | { readonly kind: "failed"; readonly failure: EntryApiFailure }
  | { readonly kind: "superseded" };
// One authenticated mutation, dispatched at most once. Only `unknown` means it
// may have been processed without a response; `superseded` drops any value.
export type AuthenticatedMutationResult<T> =
  | { readonly kind: "completed"; readonly value: T }
  | { readonly kind: "rejected"; readonly failure: HttpFailure }
  | { readonly kind: "unknown"; readonly failure: EntryApiFailure }
  | { readonly kind: "not-sent"; readonly failure: EntryApiFailure }
  | { readonly kind: "superseded" };
export type MfaRoute = "challenge" | "recovery";
type MfaOutcome = {
  readonly kind:
    | "step-used"
    | "invalid-code"
    | "throttled"
    | "failed"
    | "unconfirmed"
    | "expired";
  readonly error: EntryApiFailure;
};
type PasswordChangeOutcome = {
  readonly kind: "rejected" | "throttled" | "failed" | "unconfirmed";
  readonly error: EntryApiFailure;
};
type HttpFailure = Extract<EntryApiFailure, { readonly kind: "http" }>;
type RotatingPhase = "submitting" | "reconciling" | "reconciliation failed";
type RotatingDetails = {
  readonly error?: EntryApiFailure;
  readonly reconciliationError?: EntryApiFailure;
};
// One restricted stage's authoritative binding. A transition and its recovery
// use it to recognize the same context, render rotation, and return to the stage.
type RestrictedContext = {
  readonly isCurrent: (session: EntrySession) => boolean;
  readonly rotating: (
    phase: RotatingPhase,
    details: RotatingDetails,
  ) => AuthenticationBootstrapState;
  readonly rejected: (failure: HttpFailure) => AuthenticationBootstrapState;
  readonly restored: (error?: EntryApiFailure) => AuthenticationBootstrapState;
};
type LoginRecoveryOrigin = "none" | "local ambiguity" | "passive revalidation";
type LoginOutcome = {
  readonly kind:
    "rejected" | "blocked" | "throttled" | "failed" | "unconfirmed";
  readonly error: EntryApiFailure;
};
// The result of one public, session-free mutation (password recovery, reset,
// invitation preview, or acceptance), carrying the completed response's value.
// Only `unknown` means the request may have been processed without a response.
export type PublicMutationResult<T = void> =
  | { readonly kind: "completed"; readonly value: T }
  | { readonly kind: "rejected"; readonly failure: HttpFailure }
  | {
      readonly kind: "csrf-rejected";
      readonly failure: HttpFailure;
      readonly refreshFailure?: EntryApiFailure;
    }
  | { readonly kind: "unknown"; readonly failure: EntryApiFailure }
  | { readonly kind: "not-sent"; readonly failure: EntryApiFailure }
  | { readonly kind: "superseded" };
// Which stages a logout attempt may recover CSRF from: restricted logout, or a
// fragment-token link's interstitial, which may also start from `authenticated`.
type LogoutScope = "restricted" | "link";
type LogoutAttemptOutcome =
  | { readonly kind: "confirmed" }
  | { readonly kind: "unconfirmed"; readonly error?: EntryApiFailure }
  | { readonly kind: "reconciliation-needed" };
type SecurityMessage = {
  readonly version: 1;
  readonly kind:
    | "security-epoch"
    | "logout-start"
    | "logout-quiesced"
    | "logout-confirmed"
    | "logout-unconfirmed";
  readonly eventNonce: string;
  readonly logoutNonce?: string;
};

const securityChannelName = "mia-security-v1";
const coordinatorLockName = "mia-authenticated-requests-v1";

function csrfCookieName(): "__Host-mia_csrf" | "mia_csrf" {
  return window.location.protocol === "https:" ? "__Host-mia_csrf" : "mia_csrf";
}

function readCurrentCsrfCookie(): string | null {
  const name = csrfCookieName();
  const values = document.cookie
    .split(";")
    .map((part) => part.trim())
    .filter((part) => part.startsWith(`${name}=`))
    .map((part) => part.slice(name.length + 1));
  return values.length === 1 && values[0] !== "" ? (values[0] ?? null) : null;
}

// Logout confirmation needs the anonymous CSRF cookie that discovery issues; it
// is read only to prove presence and never retained.
function hasAnonymousCsrf(): boolean {
  return readCurrentCsrfCookie() !== null;
}

function isRestrictedState(
  state: AuthenticationBootstrapState,
): state is Extract<
  AuthenticationBootstrapState,
  | { readonly kind: "MFA required" | "Password change" }
  | { readonly kind: "Rotating"; readonly origin: "mfa" | "password-change" }
> {
  return (
    state.kind === "MFA required" ||
    state.kind === "Password change" ||
    (state.kind === "Rotating" && state.origin !== "login")
  );
}

export function isAnonymousState(state: AuthenticationBootstrapState): boolean {
  return state.kind === "Signed out" || state.kind === "Logout confirmed";
}

// The settled signed-in stages from which a link interstitial may sign out.
export function isSignedInState(state: AuthenticationBootstrapState): boolean {
  return (
    state.kind === "MFA required" ||
    state.kind === "Password change" ||
    state.kind === "Authenticated" ||
    state.kind === "Access deferred"
  );
}

// A link interstitial's sign-out is still running in these phases.
export function isLogoutPending(state: AuthenticationBootstrapState): boolean {
  return (
    state.kind === "Logout start" ||
    state.kind === "Logout quiescing" ||
    state.kind === "Logout dispatch" ||
    state.kind === "Logout confirming"
  );
}

export class SessionController {
  private state: AuthenticationBootstrapState = { kind: "Cold" };
  // Set only while a captured reset or invitation link awaits its interstitial.
  private readonly deferCapabilityGate: boolean;

  constructor(options: { readonly deferCapabilityGate?: boolean } = {}) {
    this.deferCapabilityGate = options.deferCapabilityGate ?? false;
  }
  private readonly listeners = new Set<Listener>();
  private activeRead: AbortController | null = null;
  private activeReadSettled: Promise<void> | null = null;
  private sequence = 0;
  private logoutActive = false;
  private logoutScope: LogoutScope = "restricted";
  private logoutNonce: string | null = null;
  private recordedLogoutSuccess = false;
  private reconciliationNeeded = false;
  private loginRecoveryOrigin: LoginRecoveryOrigin = "none";
  private channel: BroadcastChannel | null = null;
  private readonly receivedEventNonces = new Set<string>();
  private deadlines: Exclude<EntrySession, { kind: "anonymous" }> | null = null;
  private deadlineTimer: ReturnType<typeof setTimeout> | null = null;
  private clockSample = Date.now();
  private monotonicSample = performance.now();
  private clockAnchor = this.clockSample;
  private monotonicAnchor = this.monotonicSample;
  private readonly securityTeardowns = new Set<SecurityTeardown>();
  private access: AuthenticatedAccess | null = null;
  private securityEpoch = 0;
  private readonly authenticatedReads = new Set<AbortController>();
  private routeAdmission: Promise<void> | null = null;

  // A deliberate new route/history entry re-establishes the first two gate
  // steps. This is a read cycle, not Continue working or an auth mutation.
  checkRouteAdmission(): Promise<void> {
    this.checkDeadline();
    const failedEntry =
      (this.state.kind === "Checking" ||
        this.state.kind === "Access checking") &&
      this.state.phase === "failed";
    if (
      this.state.kind !== "Authenticated" &&
      this.routeAdmission === null &&
      !failedEntry
    )
      return Promise.resolve();
    if (
      this.state.kind === "Privacy shield" ||
      this.state.kind.startsWith("Logout")
    )
      return Promise.resolve();
    this.activeRead?.abort();
    for (const read of this.authenticatedReads) read.abort();
    const work = this.bootstrap(false);
    this.routeAdmission = work;
    this.trackSettlement(work);
    void work.then(() => {
      if (this.routeAdmission === work) this.routeAdmission = null;
    });
    return work;
  }

  registerSecurityTeardown(teardown: SecurityTeardown): () => void {
    this.securityTeardowns.add(teardown);
    return () => this.securityTeardowns.delete(teardown);
  }

  getAuthenticatedAccess = (): AuthenticatedAccess | null =>
    this.state.kind === "Authenticated" ? this.access : null;

  // A route-resource or dependent read for the current authenticated tab. It
  // never refreshes idle expiry, and any shield or epoch change fences it.
  async readAuthenticated<T>(
    read: (signal: AbortSignal) => Promise<T>,
  ): Promise<AuthenticatedReadResult<T>> {
    if (this.state.kind !== "Authenticated") return { kind: "superseded" };
    const sequence = this.sequence;
    const epoch = this.securityEpoch;
    const current = () =>
      sequence === this.sequence &&
      epoch === this.securityEpoch &&
      this.state.kind === "Authenticated";
    const controller = new AbortController();
    this.authenticatedReads.add(controller);
    try {
      return await withCoordinatorLock(
        "shared",
        async (): Promise<AuthenticatedReadResult<T>> => {
          if (!current()) return { kind: "superseded" };
          const value = await read(controller.signal);
          return current()
            ? { kind: "completed", value }
            : { kind: "superseded" };
        },
      );
    } catch (error) {
      if (!current()) return { kind: "superseded" };
      const failure = toEntryFailure(error);
      if (isAccessLoss(failure)) {
        this.loseAuthenticatedAccess(failure);
        return { kind: "superseded" };
      }
      return { kind: "failed", failure };
    } finally {
      this.authenticatedReads.delete(controller);
    }
  }

  // Mirrors the public mutation discipline for the authenticated stage: one
  // shared lease, CSRF read immediately before the only dispatch, no abort, and
  // no replay. A lifecycle mask does not fence the response; only a destroying
  // teardown (a new security epoch) drops it.
  runAuthenticatedMutation<T>(
    request: { send: ((csrf: string) => Promise<T>) | null },
    isCurrent: () => boolean,
  ): Promise<AuthenticatedMutationResult<T>> {
    const work = this.dispatchAuthenticatedMutation(request, isCurrent);
    this.trackSettlement(work.then(() => undefined));
    return work;
  }

  private async dispatchAuthenticatedMutation<T>(
    request: { send: ((csrf: string) => Promise<T>) | null },
    isCurrent: () => boolean,
  ): Promise<AuthenticatedMutationResult<T>> {
    const sequence = this.sequence;
    const epoch = this.securityEpoch;
    const dispatchable = () =>
      sequence === this.sequence &&
      epoch === this.securityEpoch &&
      this.state.kind === "Authenticated" &&
      this.state.lifecycle !== "Continue dispatching" &&
      isCurrent();
    const abandon = (): AuthenticatedMutationResult<T> => {
      request.send = null;
      return { kind: "superseded" };
    };
    if (!dispatchable()) return abandon();
    let dispatched = false;
    try {
      return await withCoordinatorLock(
        "shared",
        async (): Promise<AuthenticatedMutationResult<T>> => {
          const send = request.send;
          // Recheck the owner and epoch immediately before the request leaves.
          if (send === null || !dispatchable()) return abandon();
          request.send = null;
          const csrf = readCurrentCsrfCookie();
          if (csrf === null) throw new ApiProtocolError();
          dispatched = true;
          const value = await send(csrf);
          return epoch === this.securityEpoch
            ? { kind: "completed", value }
            : { kind: "superseded" };
        },
      );
    } catch (error) {
      request.send = null;
      const failure = toEntryFailure(error);
      if (!dispatched) return { kind: "not-sent", failure };
      if (epoch !== this.securityEpoch) return { kind: "superseded" };
      if (isAccessLoss(failure)) {
        this.loseAuthenticatedAccess(failure);
        return { kind: "superseded" };
      }
      if (failure.kind === "http" && failure.disclosure.status < 500)
        return { kind: "rejected", failure };
      return { kind: "unknown", failure };
    }
  }

  // A definitive sign-in or stage loss on an authenticated operation destroys
  // protected state. Recovery is the explicit Refresh of the privacy shield.
  private loseAuthenticatedAccess(failure: EntryApiFailure): void {
    if (this.state.kind.startsWith("Logout")) return;
    this.sequence++;
    this.activeRead?.abort();
    this.setState({
      kind: "Privacy shield",
      phase: "pending",
      reason: "access lost",
      error: failure,
    });
  }

  // A lifecycle signal during an explicit recovery fences that recovery: its
  // late result must not reveal content in a tab that may now be hidden. Only
  // a later explicit Refresh starts a new access cycle.
  observeLifecycle(): void {
    if (
      this.state.kind === "Authenticated" ||
      this.routeAdmission !== null ||
      (this.state.kind === "Privacy shield" && this.state.phase === "checking")
    )
      this.shield();
    else this.checkDeadline();
  }

  // Lifecycle observation is notification only. The React owner flushes the
  // resulting unmount synchronously on pagehide before BFCache capture.
  shield(
    reason: Extract<
      AuthenticationBootstrapState,
      { kind: "Privacy shield" }
    >["reason"] = "lifecycle",
    includeAnonymous = false,
  ): void {
    if (
      (this.state.kind.startsWith("Logout") &&
        this.state.kind !== "Logout confirmed") ||
      (!includeAnonymous &&
        isAnonymousState(this.state) &&
        this.deadlines === null) ||
      this.state.kind === "Cold" ||
      (this.state.kind === "Privacy shield" &&
        this.state.phase === "pending" &&
        this.deadlines === null)
    )
      return;
    this.sequence++;
    this.activeRead?.abort();
    this.setState({
      kind: "Privacy shield",
      phase: "pending",
      reason,
      anonymousOrigin:
        isAnonymousState(this.state) ||
        (this.state.kind === "Privacy shield" &&
          this.state.anonymousOrigin === true),
    });
  }

  stopLifecycleWaiting(): void {
    if (!(
      (this.state.kind === "Authenticated" &&
        this.state.lifecycle === "Continue dispatching") ||
      (this.state.kind === "Privacy shield" && this.state.phase === "checking")
    ))
      return;
    const continuing = this.state.kind === "Authenticated";
    this.sequence++;
    this.activeRead?.abort();
    // A dispatched continuation keeps its shared lease until settlement. Stopping
    // the UI wait must not let logout pass the origin-wide quiescence barrier.
    this.setState({
      kind: "Privacy shield",
      phase: "pending",
      reason: continuing ? "continuation unknown" : "stopped",
      anonymousOrigin:
        this.state.kind === "Privacy shield" &&
        this.state.anonymousOrigin === true,
    });
  }

  refreshSession(): Promise<void> {
    if (this.state.kind !== "Privacy shield" || this.state.phase === "checking")
      return Promise.resolve();
    const work = this.recoverLifecycle(++this.sequence);
    this.trackSettlement(work);
    return work;
  }

  private async recoverLifecycle(sequence: number): Promise<void> {
    const anonymousOrigin =
      this.state.kind === "Privacy shield" &&
      this.state.anonymousOrigin === true;
    this.setState({
      kind: "Privacy shield",
      phase: "checking",
      anonymousOrigin,
    });
    const controller = new AbortController();
    this.activeRead = controller;
    try {
      await withCoordinatorLock("shared", async () => {
        if (sequence !== this.sequence) return;
        const session = await discoverSession(controller.signal);
        if (sequence !== this.sequence) return;
        await this.applySession(session, sequence, controller.signal);
      });
    } catch (error) {
      if (sequence === this.sequence)
        this.setState({
          kind: "Privacy shield",
          phase: "pending",
          reason: "recovery failed",
          anonymousOrigin,
          error: toEntryFailure(error),
        });
    } finally {
      if (this.activeRead === controller) this.activeRead = null;
    }
  }

  continueWorking(): Promise<void> {
    if (
      this.state.kind !== "Authenticated" ||
      this.state.lifecycle === undefined ||
      this.state.lifecycle === "Continue dispatching"
    )
      return Promise.resolve();
    this.checkDeadline();
    if (this.state.kind !== "Authenticated" || this.deadlines === null)
      return Promise.resolve();
    if (this.deadlines.absoluteExpiresAt <= this.deadlines.idleExpiresAt)
      return Promise.resolve();
    const sequence = this.sequence;
    const absoluteExpiresAt = this.deadlines.absoluteExpiresAt;
    this.setState({ kind: "Authenticated", lifecycle: "Continue dispatching" });
    const work = this.runContinuation(sequence, absoluteExpiresAt);
    this.trackSettlement(work);
    return work;
  }

  private async runContinuation(
    sequence: number,
    absoluteExpiresAt: number,
  ): Promise<void> {
    let dispatched = false;
    try {
      await withCoordinatorLock("shared", async () => {
        if (sequence !== this.sequence) return;
        this.checkDeadline();
        if (sequence !== this.sequence) return;
        const csrf = readCurrentCsrfCookie();
        if (csrf === null) throw new ApiProtocolError();
        dispatched = true;
        const session = await continueSession(csrf);
        if (sequence !== this.sequence) return;
        if (
          session.absoluteExpiresAt !== absoluteExpiresAt ||
          session.accountId !== this.deadlines?.accountId
        )
          throw new ApiProtocolError();
        // No second deadline read. The successful operation supplies both.
        this.deadlines = session;
        this.checkDeadline();
        if (sequence !== this.sequence) return;
        this.setState({ kind: "Authenticated" });
        this.checkDeadline();
      });
    } catch (error) {
      if (sequence === this.sequence) {
        this.checkDeadline();
        if (sequence !== this.sequence) return;
        const failure = toEntryFailure(error);
        if (!dispatched) {
          this.setState({
            kind: "Authenticated",
            lifecycle: "Continue retryable",
            error: failure,
          });
          return;
        }
        this.shield();
        this.setState({
          kind: "Privacy shield",
          phase: "pending",
          reason:
            failure.kind === "http" &&
            [401, 403, 406].includes(failure.disclosure.status)
              ? "continuation denied"
              : "continuation unknown",
          error: failure,
        });
      }
    }
  }

  beginAuthenticatedLogout(): void {
    if (
      this.state.kind === "Authenticated" ||
      (this.state.kind === "Privacy shield" && !this.state.anonymousOrigin)
    )
      this.startLogout("link");
  }

  private clearDeadlineTimer(): void {
    if (this.deadlineTimer !== null) clearTimeout(this.deadlineTimer);
    this.deadlineTimer = null;
  }

  private checkDeadline = (): void => {
    this.clearDeadlineTimer();
    if (this.deadlines === null) return;
    const now = Date.now();
    const monotonic = performance.now();
    // Carry cumulative elapsed time across watchdog samples and Continue.
    // Repeated small wall-clock rollbacks cannot accumulate extra lifetime.
    const effectiveNow = Math.max(
      now,
      this.clockAnchor + monotonic - this.monotonicAnchor,
    );
    const deadline = Math.min(
      this.deadlines.idleExpiresAt,
      this.deadlines.absoluteExpiresAt,
    );
    // Both clocks are checked: sleep/late callbacks and wall-clock rollback
    // cannot grant a longer lifetime. The one-second watchdog does no I/O.
    if (
      now < this.clockSample ||
      now - this.clockSample > 2000 ||
      monotonic - this.monotonicSample > 2000 ||
      monotonic < this.monotonicSample ||
      effectiveNow >= deadline
    ) {
      this.shield(effectiveNow >= deadline ? "deadline" : "lifecycle");
      return;
    }
    this.clockSample = now;
    this.monotonicSample = monotonic;
    this.clockAnchor = effectiveNow;
    this.monotonicAnchor = monotonic;
    if (
      this.state.kind === "Authenticated" &&
      this.state.lifecycle !== "Continue dispatching" &&
      this.state.lifecycle !== "Continue retryable"
    ) {
      const warning = deadline - effectiveNow <= 5 * 60_000;
      if (warning !== (this.state.lifecycle === "Warning due"))
        this.setState(
          warning
            ? {
                kind: "Authenticated",
                lifecycle: "Warning due",
                ...(this.deadlines.absoluteExpiresAt <=
                this.deadlines.idleExpiresAt
                  ? { absoluteWarning: true }
                  : {}),
              }
            : { kind: "Authenticated" },
        );
    }
    const warningIn = deadline - effectiveNow - 5 * 60_000;
    this.deadlineTimer = setTimeout(
      this.checkDeadline,
      Math.min(1000, warningIn > 0 ? warningIn : deadline - effectiveNow),
    );
  };

  getSnapshot = (): AuthenticationBootstrapState => this.state;

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  start(): void {
    if (this.state.kind !== "Cold") {
      return;
    }
    this.openSecurityChannel();
    this.trackSettlement(this.bootstrap());
  }

  stop(): void {
    this.clearDeadlineTimer();
    this.deadlines = null;
    this.access = null;
    this.securityEpoch++;
    for (const read of this.authenticatedReads) read.abort();
    this.sequence += 1;
    this.activeRead?.abort();
    this.activeRead = null;
    this.activeReadSettled = null;
    this.channel?.close();
    this.channel = null;
    this.logoutActive = false;
    this.logoutScope = "restricted";
    this.logoutNonce = null;
    this.recordedLogoutSuccess = false;
    this.reconciliationNeeded = false;
    this.loginRecoveryOrigin = "none";
    this.receivedEventNonces.clear();
    this.state = { kind: "Cold" };
  }

  beginRestrictedLogout(): void {
    if (!isRestrictedState(this.state)) return;
    this.startLogout("restricted");
  }

  // A reset or invitation link's interstitial signs out a settled signed-in
  // stage through the same logout phases before the captured link may be used.
  beginLinkLogout(): boolean {
    if (!isSignedInState(this.state) || this.logoutActive) return false;
    this.startLogout("link");
    return true;
  }

  // Go back from a link interstitial: only now run the ordinary capability gate.
  continueDeferredAccess(): Promise<void> {
    if (this.state.kind !== "Access deferred") return Promise.resolve();
    const work = this.applyDiscoveredStage({
      kind: "authenticated",
      accountId: this.state.accountId,
      idleExpiresAt: this.state.idleExpiresAt,
      absoluteExpiresAt: this.state.absoluteExpiresAt,
    });
    this.trackSettlement(work);
    return work;
  }

  // `isCurrent` is the owning route or flow lifetime. Work that waited for the
  // coordinator is sent only if its owner still exists at dispatch.
  requestPasswordRecovery(
    username: string,
    isCurrent: () => boolean,
  ): Promise<PublicMutationResult> {
    return this.runPublicMutation(
      { send: (csrf) => requestPasswordRecovery(username, csrf) },
      isCurrent,
    );
  }

  resetPassword(
    token: PasswordResetToken,
    password: string,
    passwordConfirmation: string,
    isCurrent: () => boolean,
    signal: AbortSignal,
  ): Promise<PublicMutationResult> {
    return this.runPublicMutation(
      {
        send: (csrf) =>
          resetPassword(token, password, passwordConfirmation, csrf),
      },
      isCurrent,
      signal,
    );
  }

  previewInvitation(
    token: InvitationToken,
    isCurrent: () => boolean,
    signal: AbortSignal,
  ): Promise<PublicMutationResult<InvitationRole>> {
    return this.runPublicMutation(
      { send: (csrf) => previewInvitation(token, csrf) },
      isCurrent,
      signal,
    );
  }

  acceptInvitation(
    token: InvitationToken,
    fields: InvitationAcceptanceFields,
    isCurrent: () => boolean,
    signal: AbortSignal,
  ): Promise<PublicMutationResult> {
    return this.runPublicMutation(
      { send: (csrf) => acceptInvitation(token, fields, csrf) },
      isCurrent,
      signal,
    );
  }

  private startLogout(scope: LogoutScope): void {
    if (this.logoutActive) return;
    this.logoutScope = scope;
    this.logoutActive = true;
    this.logoutNonce = crypto.randomUUID();
    this.recordedLogoutSuccess = false;
    this.reconciliationNeeded = false;
    this.loginRecoveryOrigin = "none";
    this.sequence += 1;
    this.activeRead?.abort();
    this.setState({ kind: "Logout start" });
    this.broadcast("logout-start");
    void this.runLogoutAttempt(false);
  }

  retryRestrictedLogout(): void {
    if (this.state.kind !== "Logout unconfirmed" || this.logoutActive) {
      return;
    }
    this.logoutActive = true;
    this.logoutNonce = crypto.randomUUID();
    // A `204` already recorded for this logout flow stays applicable until the
    // retry's own discovery observes the browser signed in again.
    this.reconciliationNeeded = false;
    this.setState({ kind: "Logout start" });
    this.broadcast("logout-start");
    void this.runLogoutAttempt(true);
  }

  refreshLogoutStatus(): void {
    if (
      this.state.kind !== "Logout reconciliation needed" ||
      this.logoutActive
    ) {
      return;
    }
    this.logoutActive = true;
    this.reconciliationNeeded = false;
    void this.runLogoutReconciliation();
  }

  login(username: string, password: string): Promise<void> {
    if (
      this.state.kind !== "Signed out" &&
      this.state.kind !== "Logout confirmed"
    ) {
      return Promise.resolve();
    }
    // A new deliberate sign-in ends this tab's previously confirmed logout flow.
    this.logoutNonce = null;
    this.recordedLogoutSuccess = false;
    this.reconciliationNeeded = false;
    this.loginRecoveryOrigin = "none";
    const sequence = ++this.sequence;
    this.setState({ kind: "Rotating", origin: "login", phase: "submitting" });
    const work = this.runLogin(username, password, sequence);
    this.trackSettlement(work);
    return work;
  }

  selectMfaRoute(route: MfaRoute): void {
    if (
      this.state.kind !== "MFA required" ||
      this.state.outcome?.kind === "expired"
    )
      return;
    this.setState({
      kind: "MFA required",
      accountId: this.state.accountId,
      challengeId: this.state.challengeId,
      route,
    });
  }

  submitMfa(route: MfaRoute, code: string): Promise<void> {
    if (
      this.state.kind !== "MFA required" ||
      this.state.route !== route ||
      this.state.outcome?.kind === "expired"
    )
      return Promise.resolve();
    const sequence = ++this.sequence;
    const challengeId = this.state.challengeId;
    const context = mfaContext(route, this.state.accountId, challengeId);
    this.setState(context.rotating("submitting", {}));
    const work = this.runRestrictedTransition(sequence, context, (csrf) =>
      route === "challenge"
        ? verifyMfaChallenge(challengeId, code, csrf)
        : consumeMfaRecoveryCode(challengeId, code, csrf),
    );
    this.trackSettlement(work);
    return work;
  }

  recheckMfa(): Promise<void> {
    if (
      this.state.kind !== "Rotating" ||
      this.state.origin !== "mfa" ||
      this.state.phase !== "reconciliation failed"
    )
      return Promise.resolve();
    const work = this.reconcileRestricted(
      ++this.sequence,
      mfaContext(
        this.state.route,
        this.state.accountId,
        this.state.challengeId,
      ),
      this.state.error,
    );
    this.trackSettlement(work);
    return work;
  }

  submitPasswordChange(
    password: string,
    passwordConfirmation: string,
  ): Promise<void> {
    if (this.state.kind !== "Password change") return Promise.resolve();
    const sequence = ++this.sequence;
    const context = passwordChangeContext(this.state.accountId);
    this.setState(context.rotating("submitting", {}));
    const work = this.runRestrictedTransition(sequence, context, (csrf) =>
      changeTemporaryPassword(password, passwordConfirmation, csrf),
    );
    this.trackSettlement(work);
    return work;
  }

  recheckPasswordChange(): Promise<void> {
    if (
      this.state.kind !== "Rotating" ||
      this.state.origin !== "password-change" ||
      this.state.phase !== "reconciliation failed"
    )
      return Promise.resolve();
    const work = this.reconcileRestricted(
      ++this.sequence,
      passwordChangeContext(this.state.accountId),
      this.state.error,
    );
    this.trackSettlement(work);
    return work;
  }

  async recheckLogin(): Promise<void> {
    if (
      this.state.kind !== "Restricted expired" &&
      (this.state.kind !== "Rotating" ||
        this.state.origin !== "login" ||
        this.state.phase !== "reconciliation failed")
    ) {
      return;
    }
    const work = this.reconcileLogin(++this.sequence, {
      origin:
        this.loginRecoveryOrigin === "local ambiguity"
          ? "local ambiguity"
          : "passive revalidation",
      ...(this.state.kind === "Rotating" && this.state.error
        ? { error: this.state.error }
        : {}),
    });
    this.trackSettlement(work);
    await work;
  }

  // Recovery, reset, and invitation operations create no session. They run only
  // while this tab is anonymous, read CSRF at dispatch under a shared lease, and
  // are sent once.
  private async runPublicMutation<T>(
    request: { send: ((csrf: string) => Promise<T>) | null },
    isCurrent: () => boolean,
    signal?: AbortSignal,
  ): Promise<PublicMutationResult<T>> {
    const sequence = this.sequence;
    const sessionCurrent = () =>
      sequence === this.sequence && isAnonymousState(this.state);
    const current = () => sessionCurrent() && isCurrent();
    // The payload lives only in `request`; an attempt that never dispatches
    // drops it, so a waiting lease cannot retain secrets after its owner ends.
    const abandon = (): PublicMutationResult<T> => {
      request.send = null;
      return { kind: "superseded" };
    };
    const cancel = () => {
      request.send = null;
    };
    signal?.addEventListener("abort", cancel, { once: true });
    if (!current()) return abandon();
    let dispatched = false;
    try {
      return await withCoordinatorLock(
        "shared",
        async (): Promise<PublicMutationResult<T>> => {
          if (!current()) return abandon();
          let csrf = readCurrentCsrfCookie();
          if (csrf === null) {
            // Only anonymous discovery issues the public CSRF cookie.
            const session = await discoverSession();
            if (!sessionCurrent()) return abandon();
            if (session.kind !== "anonymous") {
              request.send = null;
              await this.applyDiscoveredStage(session);
              return { kind: "superseded" };
            }
            csrf = readCurrentCsrfCookie();
            if (csrf === null) throw new ApiProtocolError();
          }
          const send = request.send;
          // Recheck the owner immediately before the request leaves.
          if (send === null || !current()) return abandon();
          request.send = null;
          dispatched = true;
          return { kind: "completed", value: await send(csrf) };
        },
      );
    } catch (error) {
      request.send = null;
      const failure = toEntryFailure(error);
      if (!dispatched) return { kind: "not-sent", failure };
      if (failure.kind === "http" && failure.code === "csrf_invalid")
        return this.refreshCsrfAfterRejection(failure, sessionCurrent);
      if (failure.kind === "http" && failure.disclosure.status < 500)
        return { kind: "rejected", failure };
      return { kind: "unknown", failure };
    } finally {
      signal?.removeEventListener("abort", cancel);
    }
  }

  private async refreshCsrfAfterRejection<T>(
    failure: HttpFailure,
    current: () => boolean,
  ): Promise<PublicMutationResult<T>> {
    try {
      const session = await withCoordinatorLock("shared", discoverSession);
      if (!current()) return { kind: "superseded" };
      if (session.kind !== "anonymous") {
        await this.applyDiscoveredStage(session);
        return { kind: "superseded" };
      }
      return { kind: "csrf-rejected", failure };
    } catch (refreshFailure) {
      return {
        kind: "csrf-rejected",
        failure,
        refreshFailure: toEntryFailure(refreshFailure),
      };
    }
  }

  // Another tab changed this browser's stage; follow discovery, never replay.
  private async applyDiscoveredStage(session: EntrySession): Promise<void> {
    const sequence = ++this.sequence;
    const controller = new AbortController();
    this.activeRead = controller;
    try {
      await this.applySession(session, sequence, controller.signal);
    } finally {
      if (this.activeRead === controller) this.activeRead = null;
    }
  }

  private async runLogin(
    username: string,
    password: string,
    sequence: number,
  ): Promise<void> {
    let reconcileError: EntryApiFailure | undefined;
    let mutationDispatched = false;
    try {
      // Transitions are exclusive across the origin; safe reads wait for their
      // cookie settlement before discovering state. Logout uses the same barrier.
      await withLoginCoordinatorLock(async (queued) => {
        // A queued lease is not permission to dispatch after an epoch change.
        if (sequence !== this.sequence) return;
        if (queued) {
          const controller = new AbortController();
          this.activeRead = controller;
          let current: EntrySession;
          try {
            current = await discoverSession(controller.signal);
          } finally {
            if (this.activeRead === controller) this.activeRead = null;
          }
          if (sequence !== this.sequence) return;
          if (current.kind !== "anonymous") {
            this.loginRecoveryOrigin = "passive revalidation";
            this.setState({ kind: "Restricted expired" });
            return;
          }
        }
        const csrf = readCurrentCsrfCookie();
        if (csrf === null) throw new ApiProtocolError();
        // Do not abort an admitted transition: local abort cannot prove cookie settlement.
        let session: EntrySession;
        try {
          mutationDispatched = true;
          session = await loginWithPassword(username, password, csrf);
        } catch (error) {
          if (sequence !== this.sequence) this.observeLateLogin();
          throw error;
        }
        this.loginRecoveryOrigin = "none";
        await this.applyTransitionSession(session, sequence);
      });
    } catch (error) {
      if (this.isSupersededTransition(sequence)) return;
      const failure = toEntryFailure(error);
      if (
        mutationDispatched &&
        failure.kind === "http" &&
        failure.disclosure.status < 500 &&
        failure.code !== "csrf_invalid"
      ) {
        this.loginRecoveryOrigin = "none";
        const status = failure.disclosure.status;
        this.setState({
          kind: "Signed out",
          outcome: {
            kind:
              status === 401
                ? "rejected"
                : status === 422
                  ? "blocked"
                  : status === 429
                    ? "throttled"
                    : "failed",
            error: failure,
          },
        });
      } else {
        if (mutationDispatched) reconcileError = failure;
        else {
          this.loginRecoveryOrigin = "passive revalidation";
          this.setState({
            kind: "Rotating",
            origin: "login",
            phase: "reconciliation failed",
            reconciliationError: failure,
          });
        }
      }
    }
    if (reconcileError !== undefined && sequence === this.sequence) {
      await this.reconcileLogin(sequence, {
        origin: "local ambiguity",
        error: reconcileError,
      });
    }
  }

  private async reconcileLogin(
    sequence: number,
    recovery: {
      readonly origin: Exclude<LoginRecoveryOrigin, "none">;
      readonly error?: EntryApiFailure;
    },
  ): Promise<void> {
    this.loginRecoveryOrigin = recovery.origin;
    this.setState({
      kind: "Rotating",
      origin: "login",
      phase: "reconciling",
      ...(recovery.error ? { error: recovery.error } : {}),
    });
    const controller = new AbortController();
    this.activeRead = controller;
    try {
      await withCoordinatorLock("shared", async () => {
        if (sequence !== this.sequence) return;
        const session = await discoverSession(controller.signal);
        if (sequence !== this.sequence) return;
        if (session.kind === "anonymous" && recovery.error) {
          this.setState({
            kind: "Signed out",
            outcome: { kind: "unconfirmed", error: recovery.error },
          });
        } else {
          const applied = this.applySession(
            session,
            sequence,
            controller.signal,
          );
          if (
            session.kind !== "anonymous" &&
            recovery.origin === "local ambiguity"
          )
            this.broadcast("security-epoch");
          await applied;
        }
        this.loginRecoveryOrigin = "none";
      });
    } catch (failure) {
      if (sequence === this.sequence) {
        this.setState({
          kind: "Rotating",
          origin: "login",
          phase: "reconciliation failed",
          ...(recovery.error ? { error: recovery.error } : {}),
          reconciliationError: toEntryFailure(failure),
        });
      }
    } finally {
      if (this.activeRead === controller) this.activeRead = null;
    }
  }

  private async runRestrictedTransition(
    sequence: number,
    context: RestrictedContext,
    dispatch: (csrf: string) => Promise<EntrySession>,
  ): Promise<void> {
    let ambiguity: EntryApiFailure | undefined;
    let mutationDispatched = false;
    try {
      await withLoginCoordinatorLock(async (queued) => {
        if (sequence !== this.sequence) return;
        if (queued) {
          // A queued lease may follow another tab's transition: dispatch only
          // while discovery still reports this exact restricted binding.
          const current = await discoverSession();
          if (sequence !== this.sequence) return;
          if (!context.isCurrent(current)) {
            await this.applySession(
              current,
              sequence,
              new AbortController().signal,
            );
            return;
          }
        }
        const csrf = readCurrentCsrfCookie();
        if (csrf === null) throw new ApiProtocolError();
        mutationDispatched = true;
        const session = await dispatch(csrf);
        await this.applyTransitionSession(session, sequence);
      });
    } catch (error) {
      if (this.isSupersededTransition(sequence)) return;
      const failure = toEntryFailure(error);
      if (mutationDispatched && isDefinitiveTransitionFailure(failure))
        this.setState(context.rejected(failure));
      else if (mutationDispatched) ambiguity = failure;
      else
        this.setState(
          context.rotating("reconciliation failed", {
            reconciliationError: failure,
          }),
        );
    }
    if (ambiguity !== undefined && sequence === this.sequence)
      await this.reconcileRestricted(sequence, context, ambiguity);
  }

  private async reconcileRestricted(
    sequence: number,
    context: RestrictedContext,
    error?: EntryApiFailure,
  ): Promise<void> {
    const details = error ? { error } : {};
    this.setState(context.rotating("reconciling", details));
    try {
      await withCoordinatorLock("shared", async () => {
        if (sequence !== this.sequence) return;
        const session = await discoverSession();
        if (sequence !== this.sequence) return;
        if (context.isCurrent(session)) {
          this.installDeadlines(session);
          if (sequence !== this.sequence) return;
          this.setState(context.restored(error));
          return;
        }
        const applied = this.applySession(
          session,
          sequence,
          new AbortController().signal,
        );
        if (session.kind !== "anonymous") this.broadcast("security-epoch");
        await applied;
      });
    } catch (failure) {
      if (sequence === this.sequence)
        this.setState(
          context.rotating("reconciliation failed", {
            ...details,
            reconciliationError: toEntryFailure(failure),
          }),
        );
    }
  }

  private observeLateLogin(): void {
    if (this.state.kind.startsWith("Logout"))
      this.markLogoutReconciliationNeeded();
    this.broadcast("security-epoch");
  }

  private async applyTransitionSession(
    session: EntrySession,
    sequence: number,
  ): Promise<void> {
    if (sequence !== this.sequence) {
      this.observeLateLogin();
      return;
    }
    const controller = new AbortController();
    this.activeRead = controller;
    const applied = this.applySession(session, sequence, controller.signal);
    this.broadcast("security-epoch");
    await applied;
    if (this.activeRead === controller) this.activeRead = null;
  }

  private isSupersededTransition(sequence: number): boolean {
    if (sequence === this.sequence) return false;
    if (this.state.kind.startsWith("Logout"))
      this.markLogoutReconciliationNeeded();
    return true;
  }

  private async bootstrap(
    deferCapabilityGate = this.deferCapabilityGate,
  ): Promise<void> {
    const sequence = ++this.sequence;
    const controller = new AbortController();
    this.activeRead = controller;
    this.setState({ kind: "Checking", phase: "loading" });
    try {
      await withCoordinatorLock("shared", async () => {
        if (sequence !== this.sequence || controller.signal.aborted) return;
        const session = await discoverSession(controller.signal);
        if (sequence !== this.sequence) {
          return;
        }
        if (deferCapabilityGate && session.kind === "authenticated") {
          this.installDeadlines(session);
          if (sequence !== this.sequence) return;
          this.setState({
            kind: "Access deferred",
            accountId: session.accountId,
            idleExpiresAt: session.idleExpiresAt,
            absoluteExpiresAt: session.absoluteExpiresAt,
          });
          return;
        }
        await this.applySession(session, sequence, controller.signal);
      });
    } catch (error) {
      if (sequence === this.sequence && !controller.signal.aborted) {
        if (this.access !== null) this.destroySecrets();
        this.setState({
          kind: "Checking",
          phase: "failed",
          error: toEntryFailure(error),
        });
      }
    } finally {
      if (this.activeRead === controller) {
        this.activeRead = null;
      }
    }
  }

  private async applySession(
    session: EntrySession,
    sequence: number,
    signal: AbortSignal,
  ): Promise<void> {
    this.installDeadlines(session);
    if (sequence !== this.sequence) return;
    switch (session.kind) {
      case "anonymous":
        this.setState({ kind: "Signed out" });
        return;
      case "mfa":
        this.setState({
          kind: "MFA required",
          accountId: session.accountId,
          challengeId: session.challengeId,
          route:
            (this.state.kind === "MFA required" ||
              (this.state.kind === "Rotating" &&
                this.state.origin === "mfa")) &&
            this.state.accountId === session.accountId &&
            this.state.challengeId === session.challengeId
              ? this.state.route
              : "challenge",
        });
        return;
      case "password-change":
        this.setState({
          kind: "Password change",
          accountId: session.accountId,
        });
        return;
      case "authenticated": {
        const recovering = this.state.kind === "Privacy shield";
        if (!recovering)
          this.setState({ kind: "Access checking", phase: "loading" });
        try {
          const capabilities = await getCurrentAccountCapabilities(signal);
          if (sequence !== this.sequence) {
            return;
          }
          if (capabilities.accountId !== session.accountId) {
            throw new ApiProtocolError();
          }
          this.checkDeadline();
          if (sequence !== this.sequence) return;
          // A different account after a masking shield is an account change.
          if (
            this.access !== null &&
            (this.access.accountId !== session.accountId ||
              this.access.ownProfileView !== capabilities.ownProfileView)
          )
            this.destroySecrets();
          this.access = {
            accountId: session.accountId,
            ownProfileView: capabilities.ownProfileView,
            invitationAdministration: capabilities.invitationAdministration,
            epoch: this.securityEpoch,
          };
          this.setState({ kind: "Authenticated" });
          this.checkDeadline();
        } catch (error) {
          if (sequence === this.sequence && !signal.aborted) {
            if (this.access !== null) this.destroySecrets();
            this.setState(
              recovering
                ? {
                    kind: "Privacy shield",
                    phase: "pending",
                    reason: "recovery failed",
                    error: toEntryFailure(error),
                  }
                : {
                    kind: "Access checking",
                    phase: "failed",
                    error: toEntryFailure(error),
                  },
            );
          }
        }
        return;
      }
      default:
        return assertNever(session);
    }
  }

  private async runLogoutAttempt(recoverCsrfFirst: boolean): Promise<void> {
    const attempt = ++this.sequence;
    this.setState({ kind: "Logout quiescing" });

    let outcome: LogoutAttemptOutcome;
    try {
      outcome = await withCoordinatorLock("exclusive", async () => {
        let csrfToken: string | null = null;
        if (recoverCsrfFirst || readCurrentCsrfCookie() === null) {
          const recovered = await discoverSession();
          if (attempt !== this.sequence) {
            return { kind: "reconciliation-needed" };
          }
          // Logout requires a session cookie, so an anonymous browser cannot
          // be signed out again. Only a recorded `204` lets this anonymous
          // result confirm the flow; without one it stays unconfirmed.
          if (recovered.kind === "anonymous") {
            return this.recordedLogoutSuccess &&
              !this.reconciliationNeeded &&
              hasAnonymousCsrf()
              ? { kind: "confirmed" }
              : { kind: "unconfirmed" };
          }
          // The browser is signed in again: an earlier `204` no longer applies.
          this.recordedLogoutSuccess = false;
          if (
            recovered.kind !== "mfa" &&
            recovered.kind !== "password-change" &&
            (this.logoutScope !== "link" || recovered.kind !== "authenticated")
          ) {
            return { kind: "unconfirmed" };
          }
          csrfToken = readCurrentCsrfCookie();
        } else {
          csrfToken = readCurrentCsrfCookie();
        }
        if (csrfToken === null) {
          return { kind: "unconfirmed" };
        }

        this.setState({ kind: "Logout dispatch" });
        await logoutCurrentBrowser(csrfToken);
        if (attempt !== this.sequence) {
          return { kind: "reconciliation-needed" };
        }
        this.recordedLogoutSuccess = true;
        if (this.reconciliationNeeded) {
          return { kind: "reconciliation-needed" };
        }

        this.setState({ kind: "Logout confirming" });
        const confirmation = await discoverSession();
        if (attempt !== this.sequence) {
          return { kind: "reconciliation-needed" };
        }
        if (this.reconciliationNeeded) {
          return { kind: "reconciliation-needed" };
        }
        if (confirmation.kind !== "anonymous") {
          this.recordedLogoutSuccess = false;
          return { kind: "unconfirmed" };
        }
        return hasAnonymousCsrf()
          ? { kind: "confirmed" }
          : { kind: "unconfirmed" };
      });
    } catch (error) {
      outcome = {
        kind: "unconfirmed",
        error: toEntryFailure(error),
      };
    }

    if (attempt !== this.sequence) {
      this.logoutActive = false;
      return;
    }
    this.logoutActive = false;
    this.finishLogoutAttempt(
      this.reconciliationNeeded ? { kind: "reconciliation-needed" } : outcome,
    );
  }

  private async runLogoutReconciliation(): Promise<void> {
    const attempt = ++this.sequence;
    try {
      const session = await withCoordinatorLock("exclusive", discoverSession);
      if (attempt !== this.sequence) {
        this.logoutActive = false;
        return;
      }
      this.logoutActive = false;
      if (this.reconciliationNeeded) {
        this.setState({ kind: "Logout reconciliation needed" });
      } else if (
        this.recordedLogoutSuccess &&
        session.kind === "anonymous" &&
        hasAnonymousCsrf()
      ) {
        this.setState({ kind: "Logout confirmed" });
      } else {
        // A signed-in result means a late transition restored authentication;
        // the earlier `204` cannot confirm a later anonymous observation.
        if (session.kind !== "anonymous") this.recordedLogoutSuccess = false;
        this.finishUnconfirmed();
      }
    } catch (error) {
      if (attempt === this.sequence) {
        this.logoutActive = false;
        this.finishUnconfirmed(toEntryFailure(error));
      }
    }
  }

  private finishLogoutAttempt(outcome: LogoutAttemptOutcome): void {
    switch (outcome.kind) {
      case "confirmed":
        this.setState({ kind: "Logout confirmed" });
        this.broadcast("logout-confirmed");
        return;
      case "unconfirmed":
        this.finishUnconfirmed(outcome.error);
        return;
      case "reconciliation-needed":
        this.setState({ kind: "Logout reconciliation needed" });
        return;
      default:
        return assertNever(outcome);
    }
  }

  private finishUnconfirmed(error?: EntryApiFailure): void {
    this.setState({
      kind: "Logout unconfirmed",
      ...(error === undefined ? {} : { error }),
    });
    this.broadcast("logout-unconfirmed");
  }

  private clearSettledRead(work: Promise<void>): void {
    if (this.activeReadSettled === work) {
      this.activeReadSettled = null;
    }
  }

  private trackSettlement(work: Promise<void>): void {
    this.activeReadSettled = work;
    void work.then(
      () => this.clearSettledRead(work),
      () => this.clearSettledRead(work),
    );
  }

  private acknowledgeQuiescenceWhenSettled(logoutNonce: string): void {
    const pendingRead = this.activeReadSettled;
    if (pendingRead === null) {
      this.broadcast("logout-quiesced");
      return;
    }
    void pendingRead.then(
      () => this.acknowledgeQuiescence(logoutNonce),
      () => this.acknowledgeQuiescence(logoutNonce),
    );
  }

  private acknowledgeQuiescence(logoutNonce: string): void {
    if (
      this.logoutNonce === logoutNonce &&
      this.state.kind === "Logout quiescing"
    ) {
      this.broadcast("logout-quiesced");
    }
  }

  private markLogoutReconciliationNeeded(): void {
    this.reconciliationNeeded = true;
    if (
      !this.logoutActive &&
      this.state.kind !== "Logout start" &&
      this.state.kind !== "Logout quiescing" &&
      this.state.kind !== "Logout dispatch" &&
      this.state.kind !== "Logout confirming"
    ) {
      this.setState({ kind: "Logout reconciliation needed" });
    }
  }

  private openSecurityChannel(): void {
    if (!("BroadcastChannel" in window)) {
      return;
    }
    try {
      this.channel = new window.BroadcastChannel(securityChannelName);
      this.channel.addEventListener("message", this.receiveSecurityMessage);
    } catch {
      this.channel = null;
    }
  }

  private receiveSecurityMessage = (event: MessageEvent<unknown>): void => {
    const message = parseSecurityMessage(event.data);
    if (message === null || this.receivedEventNonces.has(message.eventNonce)) {
      if (this.state.kind.startsWith("Logout")) {
        this.markLogoutReconciliationNeeded();
      } else {
        this.sequence += 1;
        this.activeRead?.abort();
        this.setState({ kind: "Logout reconciliation needed" });
      }
      return;
    }
    this.receivedEventNonces.add(message.eventNonce);

    switch (message.kind) {
      case "logout-start":
        if (this.logoutActive) {
          this.markLogoutReconciliationNeeded();
          return;
        }
        this.sequence += 1;
        this.activeRead?.abort();
        this.logoutScope = isRestrictedState(this.state)
          ? "restricted"
          : "link";
        this.logoutNonce = message.logoutNonce ?? null;
        this.recordedLogoutSuccess = false;
        this.reconciliationNeeded = false;
        this.setState({ kind: "Logout quiescing" });
        if (this.logoutNonce !== null) {
          this.acknowledgeQuiescenceWhenSettled(this.logoutNonce);
        }
        return;
      case "logout-confirmed":
        this.recordedLogoutSuccess = true;
        if (this.logoutActive) {
          this.markLogoutReconciliationNeeded();
        } else {
          this.sequence += 1;
          this.activeRead?.abort();
          this.setState({ kind: "Logout reconciliation needed" });
        }
        return;
      case "logout-unconfirmed":
        if (this.logoutActive) {
          this.markLogoutReconciliationNeeded();
        } else {
          this.sequence += 1;
          this.activeRead?.abort();
          this.setState(
            this.reconciliationNeeded
              ? { kind: "Logout reconciliation needed" }
              : { kind: "Logout unconfirmed" },
          );
        }
        return;
      case "security-epoch":
        if (this.state.kind.startsWith("Logout")) {
          this.markLogoutReconciliationNeeded();
        } else {
          this.sequence += 1;
          this.activeRead?.abort();
          this.loginRecoveryOrigin = "passive revalidation";
          this.setState({ kind: "Restricted expired" });
        }
        return;
      case "logout-quiesced":
        return;
      default:
        return assertNever(message.kind);
    }
  };

  private broadcast(kind: SecurityMessage["kind"]): void {
    const message: SecurityMessage = {
      version: 1,
      kind,
      eventNonce: crypto.randomUUID(),
      ...(kind === "security-epoch" || this.logoutNonce === null
        ? {}
        : { logoutNonce: this.logoutNonce }),
    };
    try {
      this.channel?.postMessage(message);
    } catch {
      if (kind === "logout-confirmed") {
        this.setState({ kind: "Logout reconciliation needed" });
      }
    }
  }

  private setState(state: AuthenticationBootstrapState): void {
    // A lifecycle recovery may discover a restricted stage. Its deadlines
    // remain valid, but the former authenticated account's secrets do not.
    if (state.kind === "MFA required" || state.kind === "Password change")
      this.destroySecrets();
    if (
      state.kind === "Privacy shield" ||
      state.kind.startsWith("Logout") ||
      state.kind === "Signed out" ||
      state.kind === "Restricted expired"
    ) {
      this.clearDeadlineTimer();
      this.deadlines = null;
      document.title = "MIA";
      for (const read of this.authenticatedReads) read.abort();
      // A lifecycle shield and its explicit recovery check only mask.
      if (
        state.kind === "Privacy shield" &&
        (state.reason === "lifecycle" ||
          (state.reason === undefined && state.phase === "checking"))
      )
        for (const teardown of this.securityTeardowns) teardown("mask");
      else this.destroySecrets();
    }
    this.state = state;
    for (const listener of this.listeners) {
      listener();
    }
  }

  private destroySecrets(): void {
    this.securityEpoch++;
    this.access = null;
    for (const teardown of this.securityTeardowns) teardown("destroy");
  }

  private installDeadlines(session: EntrySession): void {
    this.clearDeadlineTimer();
    this.deadlines = session.kind === "anonymous" ? null : session;
    this.clockSample = Date.now();
    this.monotonicSample = performance.now();
    // Explicit discovery is authoritative about deadlines, not permission to
    // forget elapsed time already observed before a wall-clock adjustment.
    this.clockAnchor = Math.max(
      this.clockSample,
      this.clockAnchor +
        Math.max(0, this.monotonicSample - this.monotonicAnchor),
    );
    this.monotonicAnchor = this.monotonicSample;
    this.checkDeadline();
  }
}

async function withCoordinatorLock<T>(
  mode: "shared" | "exclusive",
  action: () => Promise<T>,
): Promise<T> {
  if (!("locks" in navigator)) {
    // Current supported browsers provide Web Locks. Without an origin-wide
    // coordinator, proceeding would permit concurrent authentication mutations.
    throw new ApiProtocolError();
  }
  return navigator.locks.request(coordinatorLockName, { mode }, () => action());
}

async function withLoginCoordinatorLock(
  action: (queued: boolean) => Promise<void>,
): Promise<void> {
  if (!("locks" in navigator)) throw new ApiProtocolError();
  let acquiredImmediately = false;
  await navigator.locks.request(
    coordinatorLockName,
    { mode: "exclusive", ifAvailable: true },
    async (lock) => {
      if (lock === null) return;
      acquiredImmediately = true;
      await action(false);
    },
  );
  if (acquiredImmediately) return;
  await navigator.locks.request(
    coordinatorLockName,
    { mode: "exclusive" },
    () => action(true),
  );
}

function parseSecurityMessage(value: unknown): SecurityMessage | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record);
  const hasOnlyAcceptedKeys = keys.every(
    (key) =>
      key === "version" ||
      key === "kind" ||
      key === "eventNonce" ||
      key === "logoutNonce",
  );
  if (
    keys.length > 4 ||
    !hasOnlyAcceptedKeys ||
    record.version !== 1 ||
    typeof record.eventNonce !== "string" ||
    record.eventNonce.length === 0 ||
    record.eventNonce.length > 64 ||
    !isSecurityMessageKind(record.kind) ||
    (record.logoutNonce !== undefined &&
      (typeof record.logoutNonce !== "string" ||
        record.logoutNonce.length === 0 ||
        record.logoutNonce.length > 64))
  ) {
    return null;
  }
  if (
    (record.kind === "security-epoch" && record.logoutNonce !== undefined) ||
    (record.kind !== "security-epoch" && record.logoutNonce === undefined)
  ) {
    return null;
  }
  return {
    version: 1,
    kind: record.kind,
    eventNonce: record.eventNonce,
    ...(record.logoutNonce === undefined
      ? {}
      : { logoutNonce: record.logoutNonce }),
  };
}

function isSecurityMessageKind(
  value: unknown,
): value is SecurityMessage["kind"] {
  return (
    value === "security-epoch" ||
    value === "logout-start" ||
    value === "logout-quiesced" ||
    value === "logout-confirmed" ||
    value === "logout-unconfirmed"
  );
}

function mfaContext(
  route: MfaRoute,
  accountId: AccountId,
  challengeId: MfaChallengeId,
): RestrictedContext {
  return {
    isCurrent: (session) =>
      session.kind === "mfa" &&
      session.accountId === accountId &&
      session.challengeId === challengeId,
    rotating: (phase, details) => ({
      kind: "Rotating",
      origin: "mfa",
      phase,
      route,
      accountId,
      challengeId,
      ...details,
    }),
    rejected: (failure) => ({
      kind: "MFA required",
      accountId,
      challengeId,
      route,
      outcome: { kind: mfaOutcomeKind(failure), error: failure },
    }),
    restored: (error) => ({
      kind: "MFA required",
      accountId,
      challengeId,
      route,
      ...(error ? { outcome: { kind: "unconfirmed", error } } : {}),
    }),
  };
}

function passwordChangeContext(accountId: AccountId): RestrictedContext {
  return {
    isCurrent: (session) =>
      session.kind === "password-change" && session.accountId === accountId,
    rotating: (phase, details) => ({
      kind: "Rotating",
      origin: "password-change",
      phase,
      accountId,
      ...details,
    }),
    rejected: (failure) => ({
      kind: "Password change",
      accountId,
      outcome: { kind: passwordChangeOutcomeKind(failure), error: failure },
    }),
    restored: (error) => ({
      kind: "Password change",
      accountId,
      ...(error ? { outcome: { kind: "unconfirmed", error } } : {}),
    }),
  };
}

// Stage-loss, CSRF, and server-side failures cannot prove the transition did
// not commit; they reconcile through discovery instead of rendering a result.
function isDefinitiveTransitionFailure(
  failure: EntryApiFailure,
): failure is HttpFailure {
  return (
    failure.kind === "http" &&
    failure.disclosure.status < 500 &&
    failure.disclosure.status !== 401 &&
    failure.code !== "csrf_invalid" &&
    failure.code !== "auth_password_change_required"
  );
}

function passwordChangeOutcomeKind(
  failure: HttpFailure,
): PasswordChangeOutcome["kind"] {
  if (failure.code === "auth_invalid_password") return "rejected";
  if (failure.disclosure.status === 429) return "throttled";
  return "failed";
}

function mfaOutcomeKind(failure: HttpFailure): MfaOutcome["kind"] {
  if (failure.code === "auth_mfa_challenge_expired") return "expired";
  if (failure.code === "auth_mfa_step_used") return "step-used";
  if (
    failure.code === "auth_invalid_mfa_code" ||
    failure.code === "auth_invalid_recovery_code"
  )
    return "invalid-code";
  if (failure.disclosure.status === 429) return "throttled";
  return "failed";
}

// Sign-in loss or a restricted stage on an authenticated operation.
function isAccessLoss(failure: EntryApiFailure): boolean {
  return (
    failure.kind === "http" &&
    (failure.disclosure.status === 401 ||
      (failure.disclosure.status === 403 &&
        failure.code === "auth_password_change_required"))
  );
}

function toEntryFailure(error: unknown): EntryApiFailure {
  if (
    error instanceof ApiHttpError ||
    error instanceof ApiProtocolError ||
    error instanceof ApiTransportError
  ) {
    return error;
  }
  return new ApiProtocolError();
}

function assertNever(value: never): never {
  throw new Error(`Unhandled entry session state: ${String(value)}`);
}
