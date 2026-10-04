import type { ApiHttpError } from "../api/client";
import type { EntryApiFailure, PasswordResetToken } from "../api/entry";
import { captureFragmentToken } from "./linkFragment";
import {
  isAnonymousState,
  isLogoutPending,
  isSignedInState,
  type AuthenticationBootstrapState,
  type PublicMutationResult,
} from "./sessionController";

export const passwordResetPath = "/password-reset";

// FRONTEND-STATE-MACHINES.md §1, Story 1-6 reset states.
export type PasswordResetState =
  | { readonly kind: "Awaiting stage" }
  | { readonly kind: "Signed-in interstitial" }
  | { readonly kind: "Signing out" }
  | { readonly kind: "Form ready" }
  | { readonly kind: "Submitting" }
  | { readonly kind: "Password rejected"; readonly error: ApiHttpError }
  | { readonly kind: "Throttled"; readonly error: ApiHttpError }
  | {
      readonly kind: "CSRF rejected";
      readonly error: ApiHttpError;
      readonly refreshError?: EntryApiFailure;
    }
  // A definitive pre-dispatch failure: nothing was sent, so the token stays.
  | { readonly kind: "Failed"; readonly error: EntryApiFailure }
  // Decision 7: a definitive generic rejection (400/406/413/415) drops the token.
  | { readonly kind: "Request rejected"; readonly error: ApiHttpError }
  | { readonly kind: "Link unusable" }
  | { readonly kind: "Outcome unknown"; readonly error: EntryApiFailure }
  | { readonly kind: "Password changed" };

export type PasswordResetFormState = Extract<
  PasswordResetState,
  {
    readonly kind:
      | "Form ready"
      | "Submitting"
      | "Password rejected"
      | "Throttled"
      | "CSRF rejected"
      | "Failed";
  }
>;

// What the reset path renders; `null` means ordinary stage dispatch applies.
export type PasswordResetSurface =
  | { readonly kind: "interstitial"; readonly signingOut: boolean }
  | { readonly kind: "form"; readonly state: PasswordResetFormState }
  | { readonly kind: "link unusable" }
  | { readonly kind: "request rejected"; readonly error: ApiHttpError }
  | { readonly kind: "outcome unknown"; readonly error: EntryApiFailure }
  | { readonly kind: "password changed" };

type ResetAction = (
  token: PasswordResetToken,
  password: string,
  passwordConfirmation: string,
  isCurrent: () => boolean,
  signal: AbortSignal,
) => Promise<PublicMutationResult>;

const linkUnusable: PasswordResetState = { kind: "Link unusable" };
const formReady: PasswordResetState = { kind: "Form ready" };

// The single in-memory owner of a captured reset token. It is created once at
// bootstrap and passed down by props; the token never enters React state,
// router state, history, storage, titles, errors, or logs.
export class PasswordResetLink {
  #token: PasswordResetToken | null;
  #state: PasswordResetState;
  #attemptAbort: AbortController | null = null;
  readonly #listeners = new Set<() => void>();

  constructor(token: PasswordResetToken | null) {
    this.#token = token;
    this.#state = token === null ? linkUnusable : { kind: "Awaiting stage" };
  }

  getSnapshot = (): PasswordResetState => this.#state;

  subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  };

  // Formalizes the transition the surface already derives from the session.
  observeSession(session: AuthenticationBootstrapState): void {
    this.#set(nextResetState(this.#state, session));
  }

  // Leaving the reset path drops the token, whatever the flow state was.
  depart(): void {
    this.#set(linkUnusable);
  }

  beginSignOut(): void {
    if (this.#state.kind === "Signed-in interstitial")
      this.#set({ kind: "Signing out" });
  }

  goBack(): void {
    this.#set(linkUnusable);
  }

  // Not async: the secrets are handed to the request and not kept in a frame
  // that outlives this call. The attempt lives only while it is current.
  submit(
    password: string,
    passwordConfirmation: string,
    reset: ResetAction,
  ): Promise<void> {
    const token = this.#token;
    if (token === null || !isSubmittable(this.#state)) return Promise.resolve();
    const attempt: PasswordResetState = { kind: "Submitting" };
    const abort = new AbortController();
    this.#attemptAbort = abort;
    this.#set(attempt);
    return this.#settle(
      attempt,
      reset(
        token,
        password,
        passwordConfirmation,
        () => this.#state === attempt,
        abort.signal,
      ),
    ).finally(() => {
      if (this.#attemptAbort === abort) this.#attemptAbort = null;
    });
  }

  async #settle(
    attempt: PasswordResetState,
    pending: Promise<PublicMutationResult>,
  ): Promise<void> {
    const result = await pending;
    // Departure or an auth change during the request already dropped the token.
    if (this.#state !== attempt) return;
    this.#set(resultState(result));
  }

  // The invitation link repeats this token drop; its duplication marker and
  // reason live in invitationLink.ts.
  #set(state: PasswordResetState): void {
    if (state === this.#state) return;
    if (!holdsToken(state)) {
      this.#token = null;
      this.#attemptAbort?.abort();
      this.#attemptAbort = null;
    }
    this.#state = state;
    for (const listener of this.#listeners) listener();
  }
}

// Synchronous pre-application bootstrap (see linkFragment.ts).
export function capturePasswordResetLink(
  location: Location,
  history: History,
): PasswordResetLink {
  const token = captureFragmentToken(location, history, passwordResetPath, [
    passwordResetPath,
  ]);
  return new PasswordResetLink(
    token === null ? null : toPasswordResetToken(token),
  );
}

function toPasswordResetToken(value: string): PasswordResetToken {
  return value as PasswordResetToken;
}

export function passwordResetSurface(
  session: AuthenticationBootstrapState,
  flow: PasswordResetState,
  pathname: string,
): PasswordResetSurface | null {
  if (pathname !== passwordResetPath) return null;
  const state = nextResetState(flow, session);
  switch (state.kind) {
    case "Awaiting stage":
      return null;
    case "Signed-in interstitial":
      return { kind: "interstitial", signingOut: false };
    case "Signing out":
      return { kind: "interstitial", signingOut: true };
    case "Form ready":
    case "Submitting":
    case "Password rejected":
    case "Throttled":
    case "CSRF rejected":
    case "Failed":
      return isAnonymousState(session) ? { kind: "form", state } : null;
    case "Link unusable":
      return isAnonymousState(session) ? { kind: "link unusable" } : null;
    case "Request rejected":
      return isAnonymousState(session)
        ? { kind: "request rejected", error: state.error }
        : null;
    case "Outcome unknown":
      return isAnonymousState(session)
        ? { kind: "outcome unknown", error: state.error }
        : null;
    case "Password changed":
      return isAnonymousState(session) ? { kind: "password changed" } : null;
    default:
      return assertNever(state);
  }
}

function nextResetState(
  state: PasswordResetState,
  session: AuthenticationBootstrapState,
): PasswordResetState {
  switch (state.kind) {
    case "Awaiting stage":
      if (isAnonymousState(session)) return formReady;
      return isSignedInState(session)
        ? { kind: "Signed-in interstitial" }
        : state;
    case "Signed-in interstitial":
      return isSignedInState(session) ? state : linkUnusable;
    case "Signing out":
      if (session.kind === "Logout confirmed") return formReady;
      return isLogoutPending(session) ? state : linkUnusable;
    case "Form ready":
    case "Submitting":
    case "Password rejected":
    case "Throttled":
    case "CSRF rejected":
    case "Failed":
      return isAnonymousState(session) ? state : linkUnusable;
    case "Link unusable":
    case "Request rejected":
    case "Outcome unknown":
    case "Password changed":
      return state;
    default:
      return assertNever(state);
  }
}

function resultState(result: PublicMutationResult): PasswordResetState {
  switch (result.kind) {
    case "completed":
      return { kind: "Password changed" };
    case "rejected": {
      const { failure } = result;
      if (failure.code === "auth_invalid_reset_token") return linkUnusable;
      if (failure.code === "auth_invalid_password")
        return { kind: "Password rejected", error: failure };
      if (failure.disclosure.status === 429)
        return { kind: "Throttled", error: failure };
      return { kind: "Request rejected", error: failure };
    }
    case "csrf-rejected":
      return {
        kind: "CSRF rejected",
        error: result.failure,
        ...(result.refreshFailure === undefined
          ? {}
          : { refreshError: result.refreshFailure }),
      };
    case "unknown":
      return { kind: "Outcome unknown", error: result.failure };
    case "not-sent":
      return { kind: "Failed", error: result.failure };
    case "superseded":
      return formReady;
    default:
      return assertNever(result);
  }
}

function holdsToken(state: PasswordResetState): boolean {
  return (
    state.kind !== "Link unusable" &&
    state.kind !== "Request rejected" &&
    state.kind !== "Outcome unknown" &&
    state.kind !== "Password changed"
  );
}

function isSubmittable(state: PasswordResetState): boolean {
  return (
    state.kind === "Form ready" ||
    state.kind === "Password rejected" ||
    state.kind === "Throttled" ||
    state.kind === "CSRF rejected" ||
    state.kind === "Failed"
  );
}

function assertNever(value: never): never {
  throw new Error(`Unhandled password-reset state: ${String(value)}`);
}
