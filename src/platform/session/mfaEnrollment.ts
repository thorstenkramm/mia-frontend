import { ApiProtocolError, type ApiHttpError } from "../api/client";
import type { AccountId, EntryApiFailure } from "../api/entry";
import {
  cancelMfaEnrollment,
  getCurrentMfaState,
  startTotpEnrollment,
  verifyMfaEnrollment,
  type MfaEnrollmentId,
  type MfaState,
} from "../api/mfa";
import type { TotpProvisioning } from "../api/totpProvisioning";
import type {
  AuthenticatedMutationResult,
  SecurityTeardownScope,
  SessionController,
} from "./sessionController";

export const mfaPaths = {
  overview: "/profile/security/mfa",
  enroll: "/profile/security/mfa/enroll",
  verify: "/profile/security/mfa/verify",
  recoveryCodes: "/profile/security/mfa/recovery-codes",
} as const;

// The route-resource read for the current MFA surface. `path` binds the result
// to the surface that requested it.
export type MfaRead =
  | { readonly kind: "Checking" }
  | {
      readonly kind: "Check failed";
      readonly path: string;
      readonly error: EntryApiFailure;
    }
  | { readonly kind: "Ready"; readonly path: string; readonly state: MfaState };

export type MfaOutcome =
  | { readonly kind: "start-rejected"; readonly error: ApiHttpError }
  | { readonly kind: "start-throttled"; readonly error: ApiHttpError }
  | { readonly kind: "start-not-sent"; readonly error: EntryApiFailure }
  | { readonly kind: "start-unknown"; readonly error: EntryApiFailure }
  | { readonly kind: "pending-exists"; readonly error: ApiHttpError }
  | { readonly kind: "uri-rejected" }
  | { readonly kind: "code-invalid"; readonly error: ApiHttpError }
  | { readonly kind: "verify-throttled"; readonly error: ApiHttpError }
  | { readonly kind: "verify-rejected"; readonly error: ApiHttpError }
  | { readonly kind: "verify-not-sent"; readonly error: EntryApiFailure }
  | { readonly kind: "verify-unknown"; readonly error: EntryApiFailure }
  | { readonly kind: "codes-lost" }
  | { readonly kind: "cancelled" }
  | { readonly kind: "cancel-rejected"; readonly error: ApiHttpError }
  | { readonly kind: "cancel-not-sent"; readonly error: EntryApiFailure }
  | { readonly kind: "cancel-unknown"; readonly error: EntryApiFailure };

export type MfaActivity =
  | { readonly kind: "Idle" }
  | { readonly kind: "Starting" }
  | { readonly kind: "Verifying" }
  | { readonly kind: "Cancelling" }
  // An explicit MFA-state read after a mutation; the surface stays mounted.
  | { readonly kind: "Reconciling"; readonly outcome: MfaOutcome }
  | { readonly kind: "Settled"; readonly outcome: MfaOutcome }
  | {
      readonly kind: "Reconcile failed";
      readonly outcome: MfaOutcome;
      readonly error: EntryApiFailure;
    };

// FRONTEND-STATE-MACHINES.md §30 as seen by the verify surface.
export type MfaSetupView =
  | { readonly kind: "None" }
  | {
      readonly kind: "Visible";
      readonly enrollmentId: MfaEnrollmentId;
      readonly provisioning: TotpProvisioning;
    }
  // Masked by a lifecycle shield; Reveal needs a confirming read first.
  | {
      readonly kind: "Masked";
      readonly enrollmentId: MfaEnrollmentId;
      readonly confirmed: boolean;
    }
  | { readonly kind: "Rejected"; readonly enrollmentId: MfaEnrollmentId };

export type MfaCodesView =
  | { readonly kind: "None" }
  | { readonly kind: "Visible"; readonly codes: readonly string[] }
  | { readonly kind: "Masked"; readonly confirmed: boolean };

export type MfaEnrollmentSnapshot = {
  readonly read: MfaRead;
  readonly activity: MfaActivity;
  readonly setup: MfaSetupView;
  readonly codes: MfaCodesView;
};

type SecretBinding = {
  readonly accountId: AccountId;
  readonly epoch: number;
  readonly enrollmentId: MfaEnrollmentId;
};
type HeldSetup = SecretBinding &
  (
    | { readonly provisioning: TotpProvisioning }
    | { readonly provisioning: null }
  );
type HeldCodes = SecretBinding & { readonly codes: readonly string[] };

type MfaSession = Pick<
  SessionController,
  "getAuthenticatedAccess" | "readAuthenticated" | "runAuthenticatedMutation"
>;

const idle: MfaActivity = { kind: "Idle" };
const checking: MfaRead = { kind: "Checking" };

// The single in-memory owner of TOTP setup data and one-time recovery codes,
// keyed by account, enrollment, and security epoch. Like the reset and
// invitation link owners, it lives outside React so a response that settles
// behind a lifecycle shield is not lost; nothing it holds enters React state,
// router state, history, storage, titles, errors, or logs.
export class MfaEnrollment {
  readonly #session: MfaSession;
  #setup: HeldSetup | null = null;
  #codes: HeldCodes | null = null;
  #masked = false;
  #confirmed = false;
  #read: MfaRead = checking;
  #readSequence = 0;
  #activity: MfaActivity = idle;
  #path = "";
  #pathSequence = 0;
  #snapshot: MfaEnrollmentSnapshot;
  readonly #listeners = new Set<() => void>();

  constructor(session: MfaSession) {
    this.#session = session;
    this.#snapshot = this.#project();
  }

  getSnapshot = (): MfaEnrollmentSnapshot => this.#snapshot;

  subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  };

  // Setup data lives only on the verify route; codes only until the codes
  // route is left. Every other path is a departure.
  observePath(pathname: string): void {
    if (pathname === this.#path) return;
    this.#path = pathname;
    this.#pathSequence++;
    if (pathname !== mfaPaths.verify) this.#setup = null;
    if (pathname !== mfaPaths.verify && pathname !== mfaPaths.recoveryCodes)
      this.#codes = null;
    this.#read = checking;
    this.#readSequence++;
    if (
      !isInFlight(this.#activity) &&
      !(
        "outcome" in this.#activity &&
        this.#activity.outcome.kind === "codes-lost"
      )
    )
      this.#activity = idle;
    this.#emit();
  }

  observeTeardown(scope: SecurityTeardownScope): void {
    if (scope === "destroy") {
      this.destroy();
      return;
    }
    this.#masked = true;
    this.#confirmed = false;
    this.#read = checking;
    this.#readSequence++;
    if (this.#activity.kind === "Reconciling")
      this.#activity = { kind: "Settled", outcome: this.#activity.outcome };
    this.#emit();
  }

  // Reload, a non-persisted pagehide, or any destroying teardown.
  destroy(): void {
    this.#setup = null;
    this.#codes = null;
    this.#masked = false;
    this.#confirmed = false;
    this.#read = checking;
    this.#readSequence++;
    if (!isInFlight(this.#activity)) this.#activity = idle;
    this.#emit();
  }

  // The surface's route-resource read; it also serves as the reveal check.
  check(path: string): Promise<void> {
    // The surface's own effect runs before the app-level path observer.
    this.observePath(path);
    if (this.#activity.kind === "Reconciling")
      this.#activity = { kind: "Settled", outcome: this.#activity.outcome };
    this.#read = checking;
    this.#emit();
    return this.#readState(path, null);
  }

  reveal(): void {
    if (!this.#masked || !this.#confirmed) return;
    this.#masked = false;
    this.#emit();
  }

  finishCodes(): void {
    this.#codes = null;
    this.#emit();
  }

  start(): Promise<void> {
    const state = this.#readyState();
    const access = this.#session.getAuthenticatedAccess();
    if (
      state === null ||
      access === null ||
      isInFlight(this.#activity) ||
      !state.actions.enroll ||
      state.pendingEnrollment !== null ||
      state.activeFactor !== null
    )
      return Promise.resolve();
    const attempt: MfaActivity = { kind: "Starting" };
    const pathSequence = this.#pathSequence;
    this.#setActivity(attempt);
    return this.#session
      .runAuthenticatedMutation(
        { send: (csrf) => startTotpEnrollment(csrf) },
        () => this.#activity === attempt && this.#path === mfaPaths.enroll,
      )
      .then((result) => {
        if (this.#activity !== attempt) return;
        switch (result.kind) {
          case "completed": {
            // Leaving the start route before the response drops its URI.
            if (
              this.#path !== mfaPaths.enroll ||
              this.#pathSequence !== pathSequence
            ) {
              this.#setActivity(idle);
              return this.check(this.#path);
            }
            this.#setup = {
              accountId: access.accountId,
              epoch: access.epoch,
              enrollmentId: result.value.enrollmentId,
              provisioning: result.value.provisioning,
            };
            this.#confirmed = false;
            // A rejected URI is a protocol failure: no QR or manual value,
            // and the pending enrollment it created is read for Cancel.
            if (result.value.provisioning === null)
              return this.#reconcile({ kind: "uri-rejected" });
            this.#setActivity(idle);
            return;
          }
          case "rejected":
            if (result.failure.code === "auth_mfa_enrollment_pending")
              return this.#reconcile({
                kind: "pending-exists",
                error: result.failure,
              });
            this.#setActivity({
              kind: "Settled",
              outcome:
                result.failure.disclosure.status === 429
                  ? { kind: "start-throttled", error: result.failure }
                  : { kind: "start-rejected", error: result.failure },
            });
            return;
          case "unknown":
            return this.#reconcile({
              kind: "start-unknown",
              error: result.failure,
            });
          case "not-sent":
            this.#setActivity({
              kind: "Settled",
              outcome: { kind: "start-not-sent", error: result.failure },
            });
            return;
          case "superseded":
            this.#setActivity(idle);
            return;
          default:
            return assertNever(result);
        }
      });
  }

  verify(code: string): Promise<void> {
    const state = this.#readyState();
    const access = this.#session.getAuthenticatedAccess();
    const pending = state?.pendingEnrollment;
    if (
      state === null ||
      access === null ||
      pending === null ||
      pending === undefined ||
      pending.method !== "totp" ||
      !state.actions.verify ||
      isInFlight(this.#activity)
    )
      return Promise.resolve();
    const attempt: MfaActivity = { kind: "Verifying" };
    const pathSequence = this.#pathSequence;
    this.#setActivity(attempt);
    return this.#session
      .runAuthenticatedMutation(
        { send: (csrf) => verifyMfaEnrollment(pending.id, code, csrf) },
        () => this.#activity === attempt && this.#path === mfaPaths.verify,
      )
      .then((result) => {
        if (this.#activity !== attempt) return;
        switch (result.kind) {
          case "completed":
            this.#setup = null;
            // Departure before the response is a departure from the codes.
            if (
              this.#path === mfaPaths.verify &&
              this.#pathSequence === pathSequence
            ) {
              this.#codes = {
                accountId: access.accountId,
                epoch: access.epoch,
                enrollmentId: pending.id,
                codes: result.value,
              };
              // Initial disclosure, like lifecycle re-reveal, needs an explicit
              // Reveal after the codes route confirms the active factor.
              this.#masked = true;
              this.#confirmed = false;
            } else return this.#reconcile({ kind: "codes-lost" });
            this.#setActivity(idle);
            return;
          case "rejected":
            return this.#verifyRejected(result.failure);
          case "unknown":
            return this.#reconcile({
              kind: "verify-unknown",
              error: result.failure,
            });
          case "not-sent":
            this.#setActivity({
              kind: "Settled",
              outcome: { kind: "verify-not-sent", error: result.failure },
            });
            return;
          case "superseded":
            this.#setActivity(idle);
            return;
          default:
            return assertNever(result);
        }
      });
  }

  cancel(): Promise<void> {
    const state = this.#readyState();
    const pending = state?.pendingEnrollment;
    if (
      state === null ||
      pending === null ||
      pending === undefined ||
      !state.actions.cancel ||
      isInFlight(this.#activity)
    )
      return Promise.resolve();
    const attempt: MfaActivity = { kind: "Cancelling" };
    this.#setActivity(attempt);
    return this.#session
      .runAuthenticatedMutation(
        { send: (csrf) => cancelMfaEnrollment(pending.id, csrf) },
        () => this.#activity === attempt,
      )
      .then((result: AuthenticatedMutationResult<void>) => {
        if (this.#activity !== attempt) return;
        switch (result.kind) {
          case "completed":
            if (this.#setup?.enrollmentId === pending.id) this.#setup = null;
            return this.#reconcile({ kind: "cancelled" });
          case "rejected":
            // An enrollment that is already gone is rejected as `422`.
            if (result.failure.disclosure.status === 422)
              return this.#reconcile({
                kind: "cancel-rejected",
                error: result.failure,
              });
            this.#setActivity({
              kind: "Settled",
              outcome: { kind: "cancel-rejected", error: result.failure },
            });
            return;
          case "unknown":
            return this.#reconcile({
              kind: "cancel-unknown",
              error: result.failure,
            });
          case "not-sent":
            this.#setActivity({
              kind: "Settled",
              outcome: { kind: "cancel-not-sent", error: result.failure },
            });
            return;
          case "superseded":
            this.#setActivity(idle);
            return;
          default:
            return assertNever(result);
        }
      });
  }

  // Explicit retry of a failed reconciliation read.
  recheck(): Promise<void> {
    if (this.#activity.kind !== "Reconcile failed") return Promise.resolve();
    return this.#reconcile(this.#activity.outcome);
  }

  #verifyRejected(failure: ApiHttpError): Promise<void> {
    if (
      failure.code === "auth_invalid_mfa_code" ||
      failure.code === "auth_mfa_challenge_expired" ||
      failure.code === "auth_invalid_request"
    )
      return this.#reconcile({ kind: "code-invalid", error: failure });
    this.#setActivity({
      kind: "Settled",
      outcome:
        failure.disclosure.status === 429
          ? { kind: "verify-throttled", error: failure }
          : { kind: "verify-rejected", error: failure },
    });
    return Promise.resolve();
  }

  async #reconcile(outcome: MfaOutcome): Promise<void> {
    if (!this.#session.getAuthenticatedAccess()?.ownProfileView) {
      this.#read = checking;
      this.#setActivity({ kind: "Settled", outcome });
      return;
    }
    const attempt: MfaActivity = { kind: "Reconciling", outcome };
    this.#setActivity(attempt);
    const path = this.#read.kind === "Checking" ? this.#path : this.#read.path;
    await this.#readState(path, attempt);
  }

  async #readState(
    path: string,
    reconciliation: Extract<MfaActivity, { kind: "Reconciling" }> | null,
  ): Promise<void> {
    const sequence = ++this.#readSequence;
    const access = this.#session.getAuthenticatedAccess();
    if (!access?.ownProfileView) return;
    const result = await this.#session.readAuthenticated(getCurrentMfaState);
    if (sequence !== this.#readSequence || result.kind === "superseded") return;
    const settled =
      reconciliation !== null && this.#activity === reconciliation;
    if (
      result.kind === "completed" &&
      result.value.accountId === access?.accountId
    ) {
      this.#applyState(result.value);
      this.#read = { kind: "Ready", path, state: result.value };
      if (settled)
        this.#activity = { kind: "Settled", outcome: reconciliation.outcome };
      this.#emit();
      return;
    }
    const error =
      result.kind === "failed" ? result.failure : new ApiProtocolError();
    if (result.kind === "completed") {
      // A response for another account is not authority for this surface or
      // for keeping secrets, including during mutation reconciliation.
      this.destroy();
      this.#activity = idle;
      this.#read = { kind: "Check failed", path, error };
      this.#emit();
      return;
    }
    if (settled)
      this.#activity = {
        kind: "Reconcile failed",
        outcome: reconciliation.outcome,
        error,
      };
    else this.#read = { kind: "Check failed", path, error };
    this.#emit();
  }

  // A fresh authoritative read keeps a secret only while it still describes
  // the same enrollment or the newly active factor; anything else destroys it.
  #applyState(state: MfaState): void {
    const pending = state.pendingEnrollment;
    if (
      this.#setup !== null &&
      (pending === null ||
        pending.id !== this.#setup.enrollmentId ||
        this.#setup.accountId !== state.accountId ||
        !state.actions.verify)
    )
      this.#setup = null;
    if (
      this.#codes !== null &&
      (state.activeFactor === null || this.#codes.accountId !== state.accountId)
    )
      this.#codes = null;
    // A completed full gate with nothing held ends an empty lifecycle mask.
    // An admitted mutation can still deliver a secret behind that mask.
    if (
      this.#setup === null &&
      this.#codes === null &&
      !isInFlight(this.#activity)
    )
      this.#masked = false;
    this.#confirmed = this.#masked;
  }

  #readyState(): MfaState | null {
    return this.#read.kind === "Ready" && this.#read.path === this.#path
      ? this.#read.state
      : null;
  }

  #setActivity(activity: MfaActivity): void {
    this.#activity = activity;
    this.#emit();
  }

  #emit(): void {
    this.#snapshot = this.#project();
    for (const listener of this.#listeners) listener();
  }

  #project(): MfaEnrollmentSnapshot {
    const access = this.#session.getAuthenticatedAccess();
    const current = (binding: SecretBinding | null) =>
      binding !== null &&
      access !== null &&
      access.accountId === binding.accountId &&
      access.epoch === binding.epoch;
    const retainMasked = access === null && this.#masked;
    const setup = current(this.#setup) || retainMasked ? this.#setup : null;
    const codes = current(this.#codes) || retainMasked ? this.#codes : null;
    return {
      read: this.#read,
      activity: this.#activity,
      setup:
        setup === null
          ? { kind: "None" }
          : setup.provisioning === null
            ? { kind: "Rejected", enrollmentId: setup.enrollmentId }
            : this.#masked
              ? {
                  kind: "Masked",
                  enrollmentId: setup.enrollmentId,
                  confirmed: this.#confirmed && current(setup),
                }
              : {
                  kind: "Visible",
                  enrollmentId: setup.enrollmentId,
                  provisioning: setup.provisioning,
                },
      codes:
        codes === null
          ? { kind: "None" }
          : this.#masked
            ? { kind: "Masked", confirmed: this.#confirmed && current(codes) }
            : { kind: "Visible", codes: codes.codes },
    };
  }
}

function isInFlight(activity: MfaActivity): boolean {
  return (
    activity.kind === "Starting" ||
    activity.kind === "Verifying" ||
    activity.kind === "Cancelling"
  );
}

function assertNever(value: never): never {
  throw new Error(`Unhandled MFA enrollment result: ${String(value)}`);
}
