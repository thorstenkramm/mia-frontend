import type { ApiHttpError } from "../api/client";
import type {
  EntryApiFailure,
  InvitationAcceptanceFields,
  InvitationRole,
  InvitationToken,
} from "../api/entry";
import { captureFragmentToken } from "./linkFragment";
import {
  isAnonymousState,
  isLogoutPending,
  isSignedInState,
  type AuthenticationBootstrapState,
  type PublicMutationResult,
} from "./sessionController";

export const invitationPath = "/invitation";
export const invitationAcceptPath = "/invitation/accept";
export const invitationPaths: readonly string[] = [
  invitationPath,
  invitationAcceptPath,
];

// A correctable acceptance rejection keeps the token for a deliberate resubmit.
export type AcceptanceRejection =
  | { readonly kind: "username taken"; readonly error: ApiHttpError }
  | { readonly kind: "password rejected"; readonly error: ApiHttpError }
  | { readonly kind: "request invalid"; readonly error: ApiHttpError }
  | { readonly kind: "throttled"; readonly error: ApiHttpError }
  | {
      readonly kind: "CSRF rejected";
      readonly error: ApiHttpError;
      readonly refreshError?: EntryApiFailure;
    };

// FRONTEND-STATE-MACHINES.md §27 public preview and acceptance, with its Story
// 1-7 amendment, plus the Story 1-6 signed-in interstitial states.
export type InvitationState =
  | { readonly kind: "Awaiting stage" }
  | { readonly kind: "Signed-in interstitial" }
  | { readonly kind: "Signing out" }
  // Anonymous, and the link's one preview has not been sent yet.
  | { readonly kind: "Preview due" }
  | { readonly kind: "Checking" }
  | { readonly kind: "Preview throttled"; readonly error: ApiHttpError }
  | {
      readonly kind: "Preview CSRF rejected";
      readonly error: ApiHttpError;
      readonly refreshError?: EntryApiFailure;
    }
  // Nothing was sent, so the token stays for a deliberate retry.
  | { readonly kind: "Preview not sent"; readonly error?: EntryApiFailure }
  | { readonly kind: "Preview lost"; readonly error: EntryApiFailure }
  | {
      readonly kind: "Acceptance ready";
      readonly role: InvitationRole;
      readonly rejection?: AcceptanceRejection;
    }
  | { readonly kind: "Acceptance submitting"; readonly role: InvitationRole }
  | {
      readonly kind: "Acceptance pre-dispatch failure";
      readonly role: InvitationRole;
      readonly error: EntryApiFailure;
    }
  | {
      readonly kind: "Acceptance rejected";
      readonly cause: "email registered" | "request rejected";
      readonly error: ApiHttpError;
    }
  | { readonly kind: "Acceptance succeeded" }
  // `error` is null after Stop waiting, which ends the wait without a response.
  | {
      readonly kind: "Acceptance outcome unknown";
      readonly error: EntryApiFailure | null;
    }
  // The one uniform result for every invalid cause and a missing or lost token.
  | { readonly kind: "Link invalid" };

export type PreviewRetryState = Extract<
  InvitationState,
  {
    readonly kind:
      "Preview throttled" | "Preview CSRF rejected" | "Preview not sent";
  }
>;

export type AcceptanceFormState = Extract<
  InvitationState,
  {
    readonly kind:
      | "Acceptance ready"
      | "Acceptance submitting"
      | "Acceptance pre-dispatch failure";
  }
>;

export type InvitationView =
  | { readonly kind: "interstitial"; readonly signingOut: boolean }
  | { readonly kind: "checking" }
  | { readonly kind: "preview retry"; readonly state: PreviewRetryState }
  | { readonly kind: "preview"; readonly role: InvitationRole }
  | { readonly kind: "form"; readonly state: AcceptanceFormState }
  | { readonly kind: "invalid" }
  | { readonly kind: "preview lost"; readonly error: EntryApiFailure }
  | {
      readonly kind: "acceptance rejected";
      readonly cause: "email registered" | "request rejected";
      readonly error: ApiHttpError;
    }
  | { readonly kind: "outcome unknown"; readonly error: EntryApiFailure | null }
  | { readonly kind: "account created" };

// What an invitation path renders, and on which of the two routes; `null`
// means ordinary stage dispatch applies.
export type InvitationSurface = {
  readonly route: "invitation" | "invitationAccept";
  readonly view: InvitationView;
};

type PreviewAction = (
  token: InvitationToken,
  isCurrent: () => boolean,
  signal: AbortSignal,
) => Promise<PublicMutationResult<InvitationRole>>;

type AcceptAction = (
  token: InvitationToken,
  fields: InvitationAcceptanceFields,
  isCurrent: () => boolean,
  signal: AbortSignal,
) => Promise<PublicMutationResult>;

const linkInvalid: InvitationState = { kind: "Link invalid" };
const previewDue: InvitationState = { kind: "Preview due" };

// The single in-memory owner of a captured invitation token, shared by both
// invitation paths. It is created once at bootstrap and passed down by props;
// the token never enters React state, router state, history, storage, titles,
// announcements, errors, or logs.
export class InvitationLink {
  #token: InvitationToken | null;
  #state: InvitationState;
  #attemptAbort: AbortController | null = null;
  readonly #listeners = new Set<() => void>();

  constructor(token: InvitationToken | null) {
    this.#token = token;
    this.#state = token === null ? linkInvalid : { kind: "Awaiting stage" };
  }

  getSnapshot = (): InvitationState => this.#state;

  subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  };

  // Formalizes the transition the surface already derives from the session.
  observeSession(session: AuthenticationBootstrapState): void {
    this.#set(nextInvitationState(this.#state, session));
  }

  // Leaving both invitation paths drops the token, whatever the flow state was.
  depart(): void {
    this.#set(linkInvalid);
  }

  beginSignOut(): void {
    if (this.#state.kind === "Signed-in interstitial")
      this.#set({ kind: "Signing out" });
  }

  goBack(): void {
    this.#set(linkInvalid);
  }

  // Opening the link is the activation for its single preview; every later
  // preview needs a deliberate Try again from a state that kept the token.
  preview(action: PreviewAction): Promise<void> {
    const state = this.#state;
    if (state.kind !== "Preview due" && !isPreviewRetryState(state))
      return Promise.resolve();
    return this.#run({ kind: "Checking" }, (token, isCurrent, signal) =>
      action(token, isCurrent, signal).then(previewResultState),
    );
  }

  // Not async: the fields are handed to the request and not kept in a frame
  // that outlives this call.
  accept(
    fields: InvitationAcceptanceFields,
    action: AcceptAction,
  ): Promise<void> {
    const state = this.#state;
    if (
      state.kind !== "Acceptance ready" &&
      state.kind !== "Acceptance pre-dispatch failure"
    )
      return Promise.resolve();
    const { role } = state;
    return this.#run(
      { kind: "Acceptance submitting", role },
      (token, isCurrent, signal) =>
        action(token, fields, isCurrent, signal).then((result) =>
          acceptanceResultState(result, role),
        ),
    );
  }

  // Ends the local wait. Whatever the request did is unknown, so the token is
  // dropped and a late response is ignored.
  stopWaiting(): void {
    if (this.#state.kind === "Acceptance submitting")
      this.#set({ kind: "Acceptance outcome unknown", error: null });
  }

  #run(
    attempt: InvitationState,
    send: (
      token: InvitationToken,
      isCurrent: () => boolean,
      signal: AbortSignal,
    ) => Promise<InvitationState>,
  ): Promise<void> {
    const token = this.#token;
    if (token === null) return Promise.resolve();
    const abort = new AbortController();
    this.#attemptAbort = abort;
    this.#set(attempt);
    return this.#settle(
      attempt,
      send(token, () => this.#state === attempt, abort.signal),
    ).finally(() => {
      if (this.#attemptAbort === abort) this.#attemptAbort = null;
    });
  }

  async #settle(
    attempt: InvitationState,
    pending: Promise<InvitationState>,
  ): Promise<void> {
    const next = await pending;
    // Departure, Stop waiting, or an auth change already ended this attempt.
    if (this.#state !== attempt) return;
    this.#set(next);
  }

  // jscpd:ignore-start
  // Mirrors PasswordResetLink's token drop: the two links are separate state
  // machines (FRONTEND-STATE-MACHINES.md §1 and §27) whose owners merely share
  // this lifecycle rule; a common base would couple their contracts.
  #set(state: InvitationState): void {
    if (state === this.#state) return;
    if (!holdsToken(state)) {
      this.#token = null;
      this.#attemptAbort?.abort();
      this.#attemptAbort = null;
    }
    this.#state = state;
    for (const listener of this.#listeners) listener();
  }
  // jscpd:ignore-end
}

// Synchronous pre-application bootstrap (see linkFragment.ts). Only the emailed
// `/invitation#token=` link carries a token; a fragment on the acceptance path
// is removed and never captured.
export function captureInvitationLink(
  location: Location,
  history: History,
): InvitationLink {
  const token = captureFragmentToken(
    location,
    history,
    invitationPath,
    invitationPaths,
  );
  return new InvitationLink(token === null ? null : toInvitationToken(token));
}

function toInvitationToken(value: string): InvitationToken {
  return value as InvitationToken;
}

export function invitationSurface(
  session: AuthenticationBootstrapState,
  flow: InvitationState,
  pathname: string,
): InvitationSurface | null {
  if (!invitationPaths.includes(pathname)) return null;
  const here = pathname === invitationPath ? "invitation" : "invitationAccept";
  const anonymous = isAnonymousState(session);
  // Everything but the interstitial renders only while this tab is anonymous.
  const shown = (
    route: InvitationSurface["route"],
    view: InvitationView,
  ): InvitationSurface | null => (anonymous ? { route, view } : null);
  const state = nextInvitationState(flow, session);
  switch (state.kind) {
    case "Awaiting stage":
      return null;
    case "Signed-in interstitial":
      return { route: here, view: { kind: "interstitial", signingOut: false } };
    case "Signing out":
      return { route: here, view: { kind: "interstitial", signingOut: true } };
    // Preview-phase states belong to `/invitation`; the acceptance path
    // redirects there.
    case "Preview due":
    case "Checking":
      return shown("invitation", { kind: "checking" });
    case "Preview throttled":
    case "Preview CSRF rejected":
    case "Preview not sent":
      return shown("invitation", { kind: "preview retry", state });
    case "Acceptance ready":
    case "Acceptance submitting":
    case "Acceptance pre-dispatch failure":
      return here === "invitation"
        ? shown(here, { kind: "preview", role: state.role })
        : shown(here, { kind: "form", state });
    case "Preview lost":
      return shown(here, { kind: "preview lost", error: state.error });
    case "Acceptance rejected":
      return shown(here, {
        kind: "acceptance rejected",
        cause: state.cause,
        error: state.error,
      });
    case "Acceptance succeeded":
      return shown(here, { kind: "account created" });
    case "Acceptance outcome unknown":
      return shown(here, { kind: "outcome unknown", error: state.error });
    // The uniform invalid result has one fixed URL: the acceptance path
    // redirects to `/invitation` before it renders.
    case "Link invalid":
      return shown("invitation", { kind: "invalid" });
    default:
      return assertNever(state);
  }
}

function nextInvitationState(
  state: InvitationState,
  session: AuthenticationBootstrapState,
): InvitationState {
  switch (state.kind) {
    case "Awaiting stage":
      if (isAnonymousState(session)) return previewDue;
      return isSignedInState(session)
        ? { kind: "Signed-in interstitial" }
        : state;
    case "Signed-in interstitial":
      return isSignedInState(session) ? state : linkInvalid;
    case "Signing out":
      if (session.kind === "Logout confirmed") return previewDue;
      return isLogoutPending(session) ? state : linkInvalid;
    case "Preview due":
    case "Checking":
    case "Preview throttled":
    case "Preview CSRF rejected":
    case "Preview not sent":
    case "Acceptance ready":
    case "Acceptance submitting":
    case "Acceptance pre-dispatch failure":
      return isAnonymousState(session) ? state : linkInvalid;
    case "Preview lost":
    case "Acceptance rejected":
    case "Acceptance succeeded":
    case "Acceptance outcome unknown":
    case "Link invalid":
      return state;
    default:
      return assertNever(state);
  }
}

function previewResultState(
  result: PublicMutationResult<InvitationRole>,
): InvitationState {
  switch (result.kind) {
    case "completed":
      return { kind: "Acceptance ready", role: result.value };
    case "rejected": {
      const { failure } = result;
      if (failure.code === "invitation_invalid") return linkInvalid;
      if (failure.disclosure.status === 429)
        return { kind: "Preview throttled", error: failure };
      return { kind: "Preview lost", error: failure };
    }
    case "csrf-rejected":
      return {
        kind: "Preview CSRF rejected",
        error: result.failure,
        ...(result.refreshFailure === undefined
          ? {}
          : { refreshError: result.refreshFailure }),
      };
    case "unknown":
      return { kind: "Preview lost", error: result.failure };
    case "not-sent":
      return { kind: "Preview not sent", error: result.failure };
    case "superseded":
      return { kind: "Preview not sent" };
    default:
      return assertNever(result);
  }
}

function acceptanceResultState(
  result: PublicMutationResult,
  role: InvitationRole,
): InvitationState {
  const rejected = (rejection: AcceptanceRejection): InvitationState => ({
    kind: "Acceptance ready",
    role,
    rejection,
  });
  switch (result.kind) {
    case "completed":
      return { kind: "Acceptance succeeded" };
    case "rejected": {
      const { failure: error } = result;
      switch (error.code) {
        case "invitation_invalid":
          return linkInvalid;
        case "invitation_email_registered":
          return {
            kind: "Acceptance rejected",
            cause: "email registered",
            error,
          };
        case "username_taken":
          return rejected({ kind: "username taken", error });
        case "auth_invalid_password":
          return rejected({ kind: "password rejected", error });
        case "auth_invalid_request":
          return rejected({ kind: "request invalid", error });
        default:
          return error.disclosure.status === 429
            ? rejected({ kind: "throttled", error })
            : { kind: "Acceptance rejected", cause: "request rejected", error };
      }
    }
    case "csrf-rejected":
      return rejected({
        kind: "CSRF rejected",
        error: result.failure,
        ...(result.refreshFailure === undefined
          ? {}
          : { refreshError: result.refreshFailure }),
      });
    case "unknown":
      return { kind: "Acceptance outcome unknown", error: result.failure };
    case "not-sent":
      return {
        kind: "Acceptance pre-dispatch failure",
        role,
        error: result.failure,
      };
    case "superseded":
      return { kind: "Acceptance ready", role };
    default:
      return assertNever(result);
  }
}

function isPreviewRetryState(state: InvitationState): boolean {
  return (
    state.kind === "Preview throttled" ||
    state.kind === "Preview CSRF rejected" ||
    state.kind === "Preview not sent"
  );
}

function holdsToken(state: InvitationState): boolean {
  return (
    state.kind !== "Link invalid" &&
    state.kind !== "Preview lost" &&
    state.kind !== "Acceptance rejected" &&
    state.kind !== "Acceptance succeeded" &&
    state.kind !== "Acceptance outcome unknown"
  );
}

function assertNever(value: never): never {
  throw new Error(`Unhandled invitation state: ${String(value)}`);
}
