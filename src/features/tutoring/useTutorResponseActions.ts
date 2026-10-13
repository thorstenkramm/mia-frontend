import { useLayoutEffect, useRef } from "react";
import { useIntl } from "react-intl";
import type { EntryApiFailure } from "../../platform/api/entry";
import {
  getTutoringSessionCurrentWork,
  isHiddenTutoringFailure,
  retryTutorResponse,
  stopTutorResponse,
  type TutorResponseProjection,
  type TutoringSessionId,
  type TutoringWork,
} from "../../platform/api/tutoringSessions";
import { useAnnouncer } from "../../platform/announcer/AnnouncementRegion";
import { useSessionActions } from "../../platform/data/EntryDataProvider";
import { messages } from "../../platform/i18n/messages";
import { useRouteActivity } from "../../platform/ui/useRouteActivity";
import type { TutoringRetentionEntry } from "./tutoringRetention";

// Separate domain mutation owner: Stop has no request ID; response retry binds
// one immutable request ID to one message/parent pair. Neither shares SSE's
// external store or the composer's message-send attempt.
type ActionState =
  | {
      readonly kind:
        "ready" | "checking" | "stopping" | "retrying" | "reconciling";
    }
  | {
      readonly kind:
        "stop unknown" | "retry unknown" | "work unknown" | "rejected";
      readonly error: EntryApiFailure | null;
    };
const ready: ActionState = { kind: "ready" };
type RetryBound = {
  readonly messageId: string;
  readonly parentId: string;
  readonly requestId: string;
};

export function useTutorResponseActions({
  session,
  work,
  install,
  linked,
  unavailable,
  retention,
}: {
  readonly session: TutoringSessionId;
  readonly work: TutoringWork;
  readonly install: (
    work: TutoringWork,
    response?: TutorResponseProjection,
  ) => void;
  readonly linked: (response: TutorResponseProjection) => void;
  readonly unavailable: (failure: EntryApiFailure) => void;
  readonly retention: TutoringRetentionEntry;
}) {
  const { readAuthenticated, runAuthenticatedMutation } = useSessionActions();
  const { announce } = useAnnouncer();
  const intl = useIntl();
  const { state, stateRef, mounted, update } = useRouteActivity<ActionState>(
    retention.unknownAction === null
      ? ready
      : { kind: retention.unknownAction.kind, error: null },
  );
  const attempt = useRef<symbol | null>(null);
  const target = useRef<string | null>(retention.unknownAction?.target ?? null);
  const retryBound = useRef<RetryBound | null>(
    retention.unknownAction?.retry ?? null,
  );
  useLayoutEffect(
    () => () => {
      // A shield unmount cannot turn an in-flight unsafe POST into a clean
      // attempt. Keep its immutable identity only while this keyed page lives.
      if (
        stateRef.current.kind === "stopping" ||
        stateRef.current.kind === "retrying"
      ) {
        if (target.current !== null)
          retention.unknownAction = {
            kind:
              stateRef.current.kind === "stopping"
                ? "stop unknown"
                : "retry unknown",
            target: target.current,
            ...(stateRef.current.kind === "retrying" &&
            retryBound.current !== null
              ? { retry: retryBound.current }
              : {}),
          };
      }
    },
    [retention, stateRef],
  );
  const settle = () => {
    retention.unknownAction = null;
    update(ready);
  };
  const known = useRef(work);
  known.current = work;
  const current = (id: symbol) => mounted.current && attempt.current === id;
  const hidden = (failure: EntryApiFailure) => {
    if (!isHiddenTutoringFailure(failure)) return false;
    attempt.current = null;
    retryBound.current = null;
    retention.unknownAction = null;
    unavailable(failure);
    return true;
  };
  const fail = (kind: ActionState["kind"], error: EntryApiFailure | null) => {
    if (
      kind !== "stop unknown" &&
      kind !== "retry unknown" &&
      kind !== "work unknown" &&
      kind !== "rejected"
    )
      return;
    if (
      kind === "stop unknown" ||
      kind === "retry unknown" ||
      kind === "work unknown"
    ) {
      if (target.current === null) return;
      retention.unknownAction = {
        kind,
        target: target.current,
        ...(kind === "retry unknown" && retryBound.current !== null
          ? { retry: retryBound.current }
          : {}),
      };
    }
    update({ kind, error });
    announce(
      intl.formatMessage(
        kind === "stop unknown"
          ? messages.tutoringStopUnknown
          : kind === "retry unknown"
            ? messages.tutoringResponseRetryUnknown
            : kind === "work unknown"
              ? messages.tutoringCheckFailed
              : messages.tutoringActionRejected,
      ),
      "urgent",
    );
  };
  const reconcile = async () => {
    if (
      attempt.current !== null ||
      (stateRef.current.kind !== "stop unknown" &&
        stateRef.current.kind !== "retry unknown" &&
        stateRef.current.kind !== "work unknown" &&
        stateRef.current.kind !== "rejected")
    )
      return;
    const previous = stateRef.current.kind;
    const id = Symbol("response-reconcile");
    attempt.current = id;
    update({ kind: "reconciling" });
    const responseId = target.current;
    const result = await readAuthenticated((signal) =>
      getTutoringSessionCurrentWork(
        session,
        responseId === null ? {} : { responseId },
        signal,
      ),
    );
    if (result.kind === "failed" && hidden(result.failure)) return;
    if (!current(id)) return;
    attempt.current = null;
    if (result.kind !== "completed") {
      fail(previous, result.kind === "failed" ? result.failure : null);
      return;
    }
    // Stop: the targeted response is independently authoritative. Retry:
    // lineage may be visible, but it never identifies this lost request ID.
    const targeted = result.value.reconciledResponse;
    if (previous === "work unknown" && targeted?.id === responseId)
      linked(targeted);
    install(
      result.value,
      (previous === "stop unknown" || previous === "rejected") &&
        targeted !== null &&
        targeted !== undefined &&
        (targeted.state === "completed" ||
          targeted.state === "interrupted" ||
          targeted.state === "failed")
        ? targeted
        : undefined,
    );
    if (
      previous === "work unknown" &&
      responseId !== null &&
      (result.value.reconciledResponse?.id === responseId ||
        result.value.generating?.id === responseId ||
        result.value.queued?.response.id === responseId)
    ) {
      target.current = null;
      settle();
    } else if (
      previous === "stop unknown" &&
      result.value.reconciledResponse !== null &&
      result.value.reconciledResponse !== undefined &&
      (result.value.reconciledResponse.state === "interrupted" ||
        result.value.reconciledResponse.state === "completed" ||
        result.value.reconciledResponse.state === "failed")
    ) {
      target.current = null;
      settle();
    } else if (
      previous === "stop unknown" &&
      target.current !== null &&
      result.value.actions.stopResponseIds.includes(target.current) &&
      (targeted?.state === "queued" || targeted?.state === "generating")
    ) {
      target.current = null;
      settle();
    } else if (previous === "rejected") settle();
    else fail(previous, null);
  };
  const stop = async (responseId: string) => {
    if (
      attempt.current !== null ||
      stateRef.current.kind !== "ready" ||
      !known.current.actions.stopResponseIds.includes(responseId)
    )
      return;
    const id = Symbol("response-stop");
    attempt.current = id;
    target.current = responseId;
    update({ kind: "stopping" });
    const result = await runAuthenticatedMutation(
      {
        send: (csrf) => stopTutorResponse(session, responseId, csrf),
      },
      () => current(id),
    );
    if (result.kind === "rejected" && hidden(result.failure)) return;
    if (!current(id)) return;
    attempt.current = null;
    if (result.kind === "completed") {
      install(result.value.work, result.value.response);
      target.current = null;
      settle();
      announce(intl.formatMessage(messages.tutoringResponseStopped));
    } else if (result.kind === "unknown") fail("stop unknown", result.failure);
    else if (result.kind === "rejected" || result.kind === "not-sent")
      fail("rejected", result.failure);
  };
  const retry = async (messageId: string, parentId: string) => {
    const previous = stateRef.current.kind;
    if (
      attempt.current !== null ||
      (previous !== "ready" && previous !== "retry unknown")
    )
      return;
    if (
      previous === "ready" &&
      known.current.actions.retryResponseId !== parentId
    )
      return;
    if (
      previous === "retry unknown" &&
      (retryBound.current?.messageId !== messageId ||
        retryBound.current.parentId !== parentId)
    )
      return;
    const bound = retryBound.current ?? {
      messageId,
      parentId,
      requestId: crypto.randomUUID(),
    };
    retryBound.current = bound;
    target.current = parentId;
    const id = Symbol("response-retry");
    attempt.current = id;
    update({ kind: "checking" });
    const check = await readAuthenticated((signal) =>
      getTutoringSessionCurrentWork(session, { responseId: parentId }, signal),
    );
    if (check.kind === "failed" && hidden(check.failure)) return;
    if (!current(id)) return;
    if (
      check.kind !== "completed" ||
      check.value.sessionState !== "active" ||
      (previous === "ready" && check.value.actions.retryResponseId !== parentId)
    ) {
      attempt.current = null;
      if (previous === "ready") retryBound.current = null;
      fail(
        previous === "retry unknown" ? "retry unknown" : "rejected",
        check.kind === "failed" ? check.failure : null,
      );
      return;
    }
    install(check.value);
    if (check.value.latest?.id === parentId) linked(check.value.latest);
    update({ kind: "retrying" });
    const result = await runAuthenticatedMutation(
      {
        send: (csrf) =>
          retryTutorResponse(
            session,
            bound.messageId,
            bound.parentId,
            bound.requestId,
            csrf,
          ),
      },
      () => current(id),
    );
    if (result.kind === "rejected" && hidden(result.failure)) return;
    if (!current(id)) return;
    attempt.current = null;
    if (result.kind === "completed") {
      retryBound.current = null;
      target.current = result.value.id;
      retention.unknownAction = {
        kind: "work unknown",
        target: result.value.id,
      };
      update({ kind: "reconciling" });
      linked(result.value);
      // The definitive linked response may already be generating. The one
      // work read governs new composer/reconnect eligibility, never this POST.
      const followUp = await readAuthenticated((signal) =>
        getTutoringSessionCurrentWork(
          session,
          { responseId: result.value.id },
          signal,
        ),
      );
      if (!mounted.current) return;
      if (followUp.kind === "completed") {
        if (followUp.value.reconciledResponse?.id === result.value.id)
          linked(followUp.value.reconciledResponse);
        install(followUp.value);
      } else if (followUp.kind === "failed" && hidden(followUp.failure)) return;
      if (
        followUp.kind === "completed" &&
        (followUp.value.reconciledResponse?.id === result.value.id ||
          followUp.value.generating?.id === result.value.id ||
          followUp.value.queued?.response.id === result.value.id)
      ) {
        target.current = null;
        settle();
      } else
        fail(
          "work unknown",
          followUp.kind === "failed" ? followUp.failure : null,
        );
      announce(intl.formatMessage(messages.tutoringResponseRetryQueued));
    } else if (result.kind === "unknown") fail("retry unknown", result.failure);
    else if (result.kind === "rejected" || result.kind === "not-sent") {
      if (previous === "retry unknown") fail("retry unknown", result.failure);
      else {
        retryBound.current = null;
        fail("rejected", result.failure);
      }
    }
  };
  return {
    state,
    stop,
    retry,
    reconcile,
    stopWaiting: () => {
      if (
        stateRef.current.kind !== "stopping" &&
        stateRef.current.kind !== "retrying"
      )
        return;
      attempt.current = null;
      fail(
        stateRef.current.kind === "stopping" ? "stop unknown" : "retry unknown",
        null,
      );
    },
    retryBound: retryBound.current,
  };
}
