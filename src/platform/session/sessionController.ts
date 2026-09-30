import {
  discoverSession,
  getCurrentAccountCapabilities,
  logoutCurrentBrowser,
  loginWithPassword,
  type EntryApiFailure,
  type EntrySession,
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
  | { readonly kind: "MFA required" }
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
      readonly phase: "submitting" | "reconciling" | "reconciliation failed";
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
  { readonly kind: "MFA required" } | { readonly kind: "Password change" } {
  return state.kind === "MFA required" || state.kind === "Password change";
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
    this.setState({ kind: "Rotating", phase: "submitting" });
    const work = this.runLogin(username, password, sequence);
    this.trackSettlement(work);
    return work;
  }

  async recheckLogin(): Promise<void> {
    if (
      this.state.kind !== "Restricted expired" &&
      (this.state.kind !== "Rotating" ||
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
        if (sequence !== this.sequence) {
          this.observeLateLogin();
          return;
        }
        const controller = new AbortController();
        this.activeRead = controller;
        const applied = this.applySession(session, sequence, controller.signal);
        this.loginRecoveryOrigin = "none";
        this.broadcast("security-epoch");
        await applied;
        if (this.activeRead === controller) this.activeRead = null;
      });
    } catch (error) {
      if (sequence !== this.sequence) {
        if (this.state.kind.startsWith("Logout"))
          this.markLogoutReconciliationNeeded();
        return;
      }
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
          phase: "reconciliation failed",
          ...(recovery.error ? { error: recovery.error } : {}),
          reconciliationError: toEntryFailure(failure),
        });
      }
    } finally {
      if (this.activeRead === controller) this.activeRead = null;
    }
  }

  private observeLateLogin(): void {
    if (this.state.kind.startsWith("Logout"))
      this.markLogoutReconciliationNeeded();
    this.broadcast("security-epoch");
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
        this.setState({ kind: "MFA required" });
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
