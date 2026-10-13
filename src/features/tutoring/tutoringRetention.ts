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
// The same tab-local owner also fences a dispatched Finish whose response is
// unknown across in-tab route changes. Unlike the draft/stream, this marker is
// content-free and must survive navigation back to the same session; only
// definitive completion or a destroying security/scope teardown clears it.
let unresolvedFinish: {
  readonly account: string;
  readonly epoch: number;
  readonly session: string;
} | null = null;

function discardWorkspace() {
  entry?.stream.close();
  entry = null;
}

export const tutoringRetention = {
  finishUnresolved(account: string, epoch: number, session: string): boolean {
    return (
      unresolvedFinish !== null &&
      unresolvedFinish.account === account &&
      unresolvedFinish.epoch === epoch &&
      unresolvedFinish.session === session
    );
  },
  retainUnknownFinish(account: string, epoch: number, session: string) {
    unresolvedFinish = { account, epoch, session };
  },
  resolveFinish(account: string, epoch: number, session: string) {
    if (this.finishUnresolved(account, epoch, session)) unresolvedFinish = null;
  },
  observe(
    state: AuthenticationBootstrapState,
    route: string,
    access: AuthenticatedAccess | null,
  ) {
    if (unresolvedFinish !== null) {
      const checking =
        (state.kind === "Checking" || state.kind === "Access checking") &&
        state.phase !== "failed";
      const covered =
        state.kind === "Privacy shield" &&
        (state.reason === "lifecycle" ||
          state.reason === "recovery failed" ||
          state.phase === "checking");
      if (
        !checking &&
        !covered &&
        (state.kind !== "Authenticated" ||
          access?.accountId !== unresolvedFinish.account ||
          access.epoch !== unresolvedFinish.epoch)
      )
        unresolvedFinish = null;
    }
    if (entry === null) return;
    if (route !== entry.route || !route.startsWith("/learn/sessions/")) {
      discardWorkspace();
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
    ) {
      discardWorkspace();
    }
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
    discardWorkspace();
    unresolvedFinish = null;
  },
};
