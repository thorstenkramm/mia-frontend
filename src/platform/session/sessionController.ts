import {
  discoverSession,
  getCurrentAccountCapabilities,
  logoutCurrentBrowser,
  loginWithPassword,
  consumeMfaRecoveryCode,
  verifyMfaChallenge,
  type EntryApiFailure,
  type EntrySession,
  type AccountId,
  type MfaChallengeId,
} from "../api/entry";
import { ApiProtocolError } from "../api/client";

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
  | { readonly kind: "Password change" }
  | { readonly kind: "Access checking"; readonly phase: "loading" }
  | {
      readonly kind: "Access checking";
      readonly phase: "failed";
      readonly error: EntryApiFailure;
    }
  | { readonly kind: "Authenticated" }
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
type LoginRecoveryOrigin = "none" | "local ambiguity" | "passive revalidation";
type LoginOutcome = {
  readonly kind:
    "rejected" | "blocked" | "throttled" | "failed" | "unconfirmed";
  readonly error: EntryApiFailure;
};
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
  return values.length === 1 && values[0] !== "" ? values[0] : null;
}

function isRestrictedState(
  state: AuthenticationBootstrapState,
): state is
  | { readonly kind: "MFA required" }
  | { readonly kind: "Password change" }
  | Extract<
      AuthenticationBootstrapState,
      { readonly kind: "Rotating"; readonly origin: "mfa" }
    > {
  return (
    state.kind === "MFA required" ||
    state.kind === "Password change" ||
    (state.kind === "Rotating" && state.origin === "mfa")
  );
}

export class SessionController {
  private state: AuthenticationBootstrapState = { kind: "Cold" };
  private readonly listeners = new Set<Listener>();
  private activeRead: AbortController | null = null;
  private activeReadSettled: Promise<void> | null = null;
  private sequence = 0;
  private logoutActive = false;
  private logoutNonce: string | null = null;
  private recordedLogoutSuccess = false;
  private reconciliationNeeded = false;
  private loginRecoveryOrigin: LoginRecoveryOrigin = "none";
  private channel: BroadcastChannel | null = null;
  private readonly receivedEventNonces = new Set<string>();

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
    this.sequence += 1;
    this.activeRead?.abort();
    this.activeRead = null;
    this.activeReadSettled = null;
    this.channel?.close();
    this.channel = null;
    this.logoutActive = false;
    this.logoutNonce = null;
    this.recordedLogoutSuccess = false;
    this.reconciliationNeeded = false;
    this.loginRecoveryOrigin = "none";
    this.receivedEventNonces.clear();
    this.state = { kind: "Cold" };
  }

  beginRestrictedLogout(): void {
    if (!isRestrictedState(this.state) || this.logoutActive) {
      return;
    }
    this.logoutActive = true;
    this.logoutNonce = crypto.randomUUID();
    this.recordedLogoutSuccess = false;
    this.reconciliationNeeded = false;
    this.loginRecoveryOrigin = "none";
    this.sequence += 1;
    this.setState({ kind: "Logout start" });
    this.activeRead?.abort();
    this.broadcast("logout-start");
    void this.runLogoutAttempt(false);
  }

  retryRestrictedLogout(): void {
    if (this.state.kind !== "Logout unconfirmed" || this.logoutActive) {
      return;
    }
    this.logoutActive = true;
    this.logoutNonce = crypto.randomUUID();
    this.recordedLogoutSuccess = false;
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
    const accountId = this.state.accountId;
    const challengeId = this.state.challengeId;
    this.setState({
      kind: "Rotating",
      origin: "mfa",
      phase: "submitting",
      route,
      accountId,
      challengeId,
    });
    const work = this.runMfa(route, code, accountId, challengeId, sequence);
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
    const work = this.reconcileMfa(
      ++this.sequence,
      this.state.route,
      this.state.accountId,
      this.state.challengeId,
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

  private async runMfa(
    route: MfaRoute,
    code: string,
    accountId: AccountId,
    challengeId: MfaChallengeId,
    sequence: number,
  ): Promise<void> {
    let ambiguity: EntryApiFailure | undefined;
    let mutationDispatched = false;
    try {
      await withLoginCoordinatorLock(async (queued) => {
        if (sequence !== this.sequence) return;
        if (queued) {
          const current = await discoverSession();
          if (sequence !== this.sequence) return;
          if (current.kind !== "mfa" || current.challengeId !== challengeId) {
            await this.applySession(
              current,
              sequence,
              new AbortController().signal,
            );
            return;
          }
          if (current.accountId !== accountId) {
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
        const session =
          route === "challenge"
            ? await verifyMfaChallenge(challengeId, code, csrf)
            : await consumeMfaRecoveryCode(challengeId, code, csrf);
        await this.applyTransitionSession(session, sequence);
      });
    } catch (error) {
      if (this.isSupersededTransition(sequence)) return;
      const failure = toEntryFailure(error);
      if (mutationDispatched && isDefinitiveMfaFailure(failure)) {
        this.setState({
          kind: "MFA required",
          accountId,
          challengeId,
          route,
          outcome: { kind: mfaOutcomeKind(failure), error: failure },
        });
      } else if (mutationDispatched) ambiguity = failure;
      else {
        this.setState({
          kind: "Rotating",
          origin: "mfa",
          phase: "reconciliation failed",
          route,
          accountId,
          challengeId,
          reconciliationError: failure,
        });
      }
    }
    if (ambiguity !== undefined && sequence === this.sequence)
      await this.reconcileMfa(
        sequence,
        route,
        accountId,
        challengeId,
        ambiguity,
      );
  }

  private async reconcileMfa(
    sequence: number,
    route: MfaRoute,
    accountId: AccountId,
    challengeId: MfaChallengeId,
    error?: EntryApiFailure,
  ): Promise<void> {
    this.setState({
      kind: "Rotating",
      origin: "mfa",
      phase: "reconciling",
      route,
      accountId,
      challengeId,
      ...(error ? { error } : {}),
    });
    try {
      await withCoordinatorLock("shared", async () => {
        if (sequence !== this.sequence) return;
        const session = await discoverSession();
        if (sequence !== this.sequence) return;
        if (
          session.kind === "mfa" &&
          session.accountId === accountId &&
          session.challengeId === challengeId
        ) {
          this.setState({
            kind: "MFA required",
            accountId,
            challengeId,
            route,
            ...(error
              ? { outcome: { kind: "unconfirmed", error } satisfies MfaOutcome }
              : {}),
          });
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
        this.setState({
          kind: "Rotating",
          origin: "mfa",
          phase: "reconciliation failed",
          route,
          accountId,
          challengeId,
          ...(error ? { error } : {}),
          reconciliationError: toEntryFailure(failure),
        });
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

  private async bootstrap(): Promise<void> {
    const sequence = ++this.sequence;
    const controller = new AbortController();
    this.activeRead = controller;
    this.setState({ kind: "Checking", phase: "loading" });
    try {
      await withCoordinatorLock("shared", async () => {
        const session = await discoverSession(controller.signal);
        if (sequence !== this.sequence) {
          return;
        }
        await this.applySession(session, sequence, controller.signal);
      });
    } catch (error) {
      if (sequence === this.sequence && !controller.signal.aborted) {
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
        this.setState({ kind: "Password change" });
        return;
      case "authenticated": {
        this.setState({ kind: "Access checking", phase: "loading" });
        try {
          const capabilities = await getCurrentAccountCapabilities(signal);
          if (sequence !== this.sequence) {
            return;
          }
          if (capabilities.accountId !== session.accountId) {
            throw new ApiProtocolError();
          }
          this.setState({ kind: "Authenticated" });
        } catch (error) {
          if (sequence === this.sequence && !signal.aborted) {
            this.setState({
              kind: "Access checking",
              phase: "failed",
              error: toEntryFailure(error),
            });
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
          if (
            recovered.kind !== "mfa" &&
            recovered.kind !== "password-change"
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
        return confirmation.kind === "anonymous"
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
      } else if (this.recordedLogoutSuccess && session.kind === "anonymous") {
        this.setState({ kind: "Logout confirmed" });
      } else {
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
    this.state = state;
    for (const listener of this.listeners) {
      listener();
    }
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

function isDefinitiveMfaFailure(
  failure: EntryApiFailure,
): failure is Extract<EntryApiFailure, { readonly kind: "http" }> {
  return (
    failure.kind === "http" &&
    failure.disclosure.status < 500 &&
    failure.disclosure.status !== 401 &&
    failure.code !== "csrf_invalid" &&
    failure.code !== "auth_password_change_required"
  );
}

function mfaOutcomeKind(
  failure: Extract<EntryApiFailure, { readonly kind: "http" }>,
): MfaOutcome["kind"] {
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

function toEntryFailure(error: unknown): EntryApiFailure {
  if (
    error instanceof Error &&
    "kind" in error &&
    (error.kind === "http" ||
      error.kind === "protocol" ||
      error.kind === "transport")
  ) {
    return error;
  }
  return new ApiProtocolError();
}

function assertNever(value: never): never {
  throw new Error(`Unhandled entry session state: ${String(value)}`);
}
