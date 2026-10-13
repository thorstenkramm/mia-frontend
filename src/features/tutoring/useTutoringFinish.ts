import { useRef } from "react";
import { useNavigate } from "react-router";
import { useIntl } from "react-intl";
import {
  completeTutoringSession,
  getTutoringSession,
  getTutoringSessionCurrentWork,
  isHiddenTutoringFailure,
  type TutoringSession,
  type TutoringWork,
} from "../../platform/api/tutoringSessions";
import {
  discoverSession,
  getCurrentAccountCapabilities,
  type EntryApiFailure,
} from "../../platform/api/entry";
import {
  useAuthenticatedAccess,
  useSessionActions,
} from "../../platform/data/EntryDataProvider";
import { useAnnouncer } from "../../platform/announcer/AnnouncementRegion";
import { messages } from "../../platform/i18n/messages";
import { useRouteActivity } from "../../platform/ui/useRouteActivity";
import { tutoringRetention } from "./tutoringRetention";

type FinishState =
  | {
      readonly kind:
        | "Work checking"
        | "Prevalidating"
        | "Confirmable"
        | "Completing"
        | "State changed"
        | "Ineligible"
        | "Completed";
    }
  | {
      readonly kind: "Outcome unknown" | "Check failed";
      readonly error: EntryApiFailure | null;
    };

// Machine 8 owns only this route-local attempt. A lost POST has no request-ID
// replay contract; an explicit read may establish completed resource truth,
// never attribution of this attempt's outcome.
export function useTutoringFinish(
  session: TutoringSession,
  admitted: TutoringWork | null,
  workspace: string,
  unavailable: (error: EntryApiFailure | null) => void,
) {
  const { readAuthenticated, runAuthenticatedMutation } = useSessionActions();
  const access = useAuthenticatedAccess();
  const navigate = useNavigate();
  const intl = useIntl();
  const { announce } = useAnnouncer();
  const { state, stateRef, mounted, update } = useRouteActivity<FinishState>(
    access !== null &&
      tutoringRetention.finishUnresolved(
        access.accountId,
        access.epoch,
        session.id,
      )
      ? { kind: "Outcome unknown", error: null }
      : admitted?.actions.finish === true && admitted.state === "idle"
        ? { kind: "Work checking" }
        : { kind: "Ineligible" },
  );
  const unresolved = () =>
    access !== null &&
    tutoringRetention.finishUnresolved(
      access.accountId,
      access.epoch,
      session.id,
    );
  const retainUnknown = () => {
    if (access !== null)
      tutoringRetention.retainUnknownFinish(
        access.accountId,
        access.epoch,
        session.id,
      );
  };
  const resolveUnknown = () => {
    if (access !== null)
      tutoringRetention.resolveFinish(
        access.accountId,
        access.epoch,
        session.id,
      );
  };
  const attempt = useRef<symbol | null>(null);
  const current = (id: symbol) => mounted.current && attempt.current === id;
  const hidden = (failure: EntryApiFailure) => {
    if (!isHiddenTutoringFailure(failure)) return false;
    attempt.current = null;
    unavailable(failure);
    return true;
  };
  const read = () =>
    readAuthenticated(async (signal) => {
      const stage = await discoverSession(signal);
      if (
        stage.kind !== "authenticated" ||
        stage.accountId !== access?.accountId
      )
        return { kind: "access changed" as const };
      const capability = await getCurrentAccountCapabilities(signal);
      if (
        capability.accountId !== stage.accountId ||
        !capability.learningParticipation ||
        !capability.joinedCourseIds.includes(session.courseId)
      )
        return { kind: "access changed" as const };
      const freshSession = await getTutoringSession(session.id, signal);
      if (
        freshSession.courseId !== session.courseId ||
        freshSession.studentId !== stage.accountId
      )
        return { kind: "access changed" as const };
      if (freshSession.state === "completed")
        return { kind: "completed" as const };
      const work = await getTutoringSessionCurrentWork(session.id, {}, signal);
      return { kind: "active" as const, work };
    });
  const eligible = (work: TutoringWork) =>
    work.sessionState === "active" &&
    work.state === "idle" &&
    work.generating === null &&
    work.queued === null &&
    work.actions.finish;
  const refresh = async () => {
    if (attempt.current !== null || stateRef.current.kind === "Completing")
      return;
    const id = Symbol("finish-check");
    attempt.current = id;
    update({ kind: "Prevalidating" });
    const result = await read();
    if (result.kind === "failed" && hidden(result.failure)) return;
    if (!current(id)) return;
    attempt.current = null;
    if (result.kind === "superseded") return;
    if (result.kind === "failed") {
      // A failed read cannot settle a previously dispatched Finish.
      update(
        unresolved()
          ? { kind: "Outcome unknown", error: result.failure }
          : { kind: "Check failed", error: result.failure },
      );
      announce(intl.formatMessage(messages.tutoringCheckFailed), "urgent");
    } else if (result.value.kind === "access changed") unavailable(null);
    else if (result.value.kind === "completed") {
      resolveUnknown();
      update({ kind: "Completed" });
      void navigate(workspace, { replace: true });
    } else if (eligible(result.value.work)) {
      // Even a fresh active/idle current-work read cannot prove a lost POST
      // was never committed; only definitive first-attempt truth unlocks it.
      update(
        unresolved()
          ? { kind: "Outcome unknown", error: null }
          : { kind: "Confirmable" },
      );
    } else {
      update(
        unresolved()
          ? { kind: "Outcome unknown", error: null }
          : { kind: "State changed" },
      );
      announce(intl.formatMessage(messages.tutoringFinishChanged), "urgent");
    }
  };
  const confirm = async () => {
    if (
      attempt.current !== null ||
      stateRef.current.kind !== "Confirmable" ||
      unresolved()
    )
      return;
    const id = Symbol("finish-post");
    attempt.current = id;
    update({ kind: "Completing" });
    let dispatched = false;
    const result = await runAuthenticatedMutation(
      {
        send: (csrf) => {
          // The lease has admitted this one dispatch. Preserve its interlock
          // even if the route is abandoned before the response arrives.
          dispatched = true;
          retainUnknown();
          return completeTutoringSession(session.id, csrf);
        },
      },
      () => current(id) && !unresolved(),
    );
    // A late definitive result can resolve the held attempt even after Stop
    // waiting or route departure. It never navigates or installs success in
    // an unmounted route; unknown/ambiguous results leave the interlock set.
    if (
      result.kind === "completed" ||
      result.kind === "rejected" ||
      result.kind === "not-sent"
    )
      resolveUnknown();
    if (!dispatched && result.kind === "superseded") resolveUnknown();
    if (result.kind === "rejected" && current(id) && hidden(result.failure))
      return;
    if (!current(id)) return;
    attempt.current = null;
    if (result.kind === "completed") {
      update({ kind: "Completed" });
      announce(intl.formatMessage(messages.tutoringSessionFinished), "polite");
      void navigate(workspace, { replace: true });
    } else if (result.kind === "unknown") {
      retainUnknown();
      update({ kind: "Outcome unknown", error: result.failure });
      announce(intl.formatMessage(messages.tutoringFinishUnknown), "urgent");
    } else if (
      result.kind === "rejected" &&
      result.failure.disclosure.status === 409
    ) {
      update({ kind: "State changed" });
      announce(intl.formatMessage(messages.tutoringFinishChanged), "urgent");
      // A definitive conflict permits its dependent non-refreshing read.
      // It never attributes another tab's completed state to this POST.
      await refresh();
    } else if (result.kind === "rejected" || result.kind === "not-sent") {
      update({ kind: "Check failed", error: result.failure });
    }
  };
  const stopWaiting = () => {
    if (stateRef.current.kind !== "Completing") return;
    attempt.current = null;
    retainUnknown();
    update({ kind: "Outcome unknown", error: null });
  };
  return { state, unresolved: unresolved(), refresh, confirm, stopWaiting };
}
