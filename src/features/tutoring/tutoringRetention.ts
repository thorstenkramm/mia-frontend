import type { AuthenticationBootstrapState } from "../../platform/session/sessionController";
import type { AuthenticatedAccess } from "../../platform/session/sessionController";
import type { TutorStreamController } from "./tutorStreamController";

// One page-memory tutoring owner above App's protected-route unmount boundary.
// Never persisted. Only the exact account/scope/route/session can reclaim it.
export type TutoringRetentionEntry = {
  readonly route: string;
  readonly account: string;
  readonly epoch: number;
  readonly session: string;
  readonly stream: TutorStreamController;
  draft: string;
  covered: boolean;
  reconnectRequested: boolean;
  unknownAction: {
    readonly kind: "stop unknown" | "retry unknown" | "work unknown";
    readonly target: string;
    readonly retry?: {
      readonly messageId: string;
      readonly parentId: string;
      readonly requestId: string;
    };
  } | null;
};
let entry: TutoringRetentionEntry | null = null;

export const tutoringRetention = {
  observe(
    state: AuthenticationBootstrapState,
    route: string,
    access: AuthenticatedAccess | null,
  ) {
    if (entry === null) return;
    if (route !== entry.route || !route.startsWith("/learn/sessions/")) {
      this.destroy();
      return;
    }
    if (
      state.kind === "Privacy shield" &&
      (state.reason === "lifecycle" ||
        state.reason === "recovery failed" ||
        state.phase === "checking")
    ) {
      if (state.reason === "lifecycle" && entry.reconnectRequested) {
        entry.reconnectRequested = false;
        entry.stream.stopWaiting();
      }
      if (!entry.covered) {
        entry.covered = true;
        entry.stream.suspend();
      }
      return;
    }
    if (state.kind === "Checking" || state.kind === "Access checking") {
      if (state.phase === "failed") {
        this.destroy();
      } else if (!entry.covered) {
        entry.covered = true;
        entry.stream.suspend();
      }
      return;
    }
    if (
      state.kind !== "Authenticated" ||
      access === null ||
      access.accountId !== entry.account ||
      access.epoch !== entry.epoch
    ) {
      this.destroy();
    }
  },
  claim(
    route: string,
    account: string,
    epoch: number,
    session: string,
    createStream: () => TutorStreamController,
  ) {
    if (
      entry !== null &&
      (entry.route !== route ||
        entry.account !== account ||
        entry.epoch !== epoch ||
        entry.session !== session)
    )
      this.destroy();
    entry ??= {
      route,
      account,
      epoch,
      session,
      stream: createStream(),
      draft: "",
      covered: false,
      reconnectRequested: false,
      unknownAction: null,
    };
    return entry;
  },
  destroy() {
    entry?.stream.close();
    entry = null;
  },
};
