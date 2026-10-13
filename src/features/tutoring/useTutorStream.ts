import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useIntl } from "react-intl";
import type { EntryApiFailure } from "../../platform/api/entry";
import {
  getTutoringResponseCurrentWork,
  isHiddenTutoringFailure,
  type TutorResponseProjection,
  type TutoringSessionId,
  type TutoringWork,
} from "../../platform/api/tutoringSessions";
import { useAnnouncer } from "../../platform/announcer/AnnouncementRegion";
import { useSessionActions } from "../../platform/data/EntryDataProvider";
import { messages } from "../../platform/i18n/messages";
import { TutorStreamController } from "./tutorStreamController";

// One route-local external store; the existing session owner fences dependent
// reads on scope/security changes, and route teardown closes EventSource.
export function useTutorStream({
  session,
  work,
  installWork,
  unavailable,
}: {
  readonly session: TutoringSessionId;
  readonly work: TutoringWork | null;
  readonly installWork: (value: TutoringWork) => void;
  readonly unavailable: (failure: EntryApiFailure) => void;
}) {
  const [controller] = useState(() => new TutorStreamController());
  const view = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );
  const [persisted, setPersisted] = useState<TutorResponseProjection | null>(
    null,
  );
  const [pending, setPending] = useState(false);
  const opened = useRef(new Set<string>());
  const ledger = useRef(new Set<string>());
  const alive = useRef(false);
  const deferred = useRef<{
    readonly work: TutoringWork;
    readonly response: TutorResponseProjection;
  } | null>(null);
  const terminalRead = useRef(false);
  const { announce } = useAnnouncer();
  const intl = useIntl();
  const { readAuthenticated } = useSessionActions();

  // Reads/announcements must use the currently mounted callbacks without
  // closing an SSE connection merely because the composer rerendered.
  const callbacks = useRef({
    installWork,
    unavailable,
    announce,
    intl,
    readAuthenticated,
  });
  callbacks.current = {
    installWork,
    unavailable,
    announce,
    intl,
    readAuthenticated,
  };
  useEffect(() => {
    alive.current = true;
    const openedResponses = opened.current;
    const announcementLedger = ledger.current;
    const deferredResult = deferred;
    const activeRead = terminalRead;
    return () => {
      alive.current = false;
      controller.close();
      openedResponses.clear();
      announcementLedger.clear();
      deferredResult.current = null;
      activeRead.current = false;
    };
  }, [controller]);

  const generating = work?.generating ?? null;
  const queued = work?.queued?.response ?? null;
  const response = generating ?? queued;
  const responseId = response?.id ?? null;
  useEffect(() => {
    if (responseId === null) {
      if (
        persisted?.id === controller.getSnapshot().responseId &&
        controller.getSnapshot().kind === "Terminal known"
      )
        return;
      controller.close();
      return;
    }
    if (opened.current.has(responseId)) return;
    opened.current.add(responseId);
    // Admitted static progress is not a transition. Only a queued attempt
    // changing to generating during this page lifetime may be announced.
    if (generating?.id === responseId)
      ledger.current.add(`${responseId}:generating`);
    deferred.current = null;
    terminalRead.current = false;
    controller.open(responseId, (id) => {
      terminalRead.current = true;
      if (!controller.getSnapshot().paused) setPending(true);
      void (async () => {
        const result = await callbacks.current.readAuthenticated((signal) =>
          getTutoringResponseCurrentWork(session, id, signal),
        );
        if (!alive.current || controller.getSnapshot().responseId !== id)
          return;
        terminalRead.current = false;
        if (result.kind === "completed") {
          if (controller.getSnapshot().paused) {
            deferred.current = result.value;
            return;
          }
          setPending(false);
          setPersisted(result.value.response);
          callbacks.current.installWork(result.value.work);
        } else if (
          result.kind === "failed" &&
          isHiddenTutoringFailure(result.failure)
        ) {
          callbacks.current.unavailable(result.failure);
        } else if (!controller.getSnapshot().paused) {
          setPending(false);
        }
      })();
    });
  }, [controller, generating?.id, persisted, responseId, session]);

  useEffect(() => {
    if (view.responseId === null || view.paused) return;
    let message: (typeof messages)[keyof typeof messages] | null = null;
    let key: string | null = null;
    if (view.kind === "Transport lost" || view.kind === "Protocol error") {
      key = `${view.responseId}:loss`;
      message =
        view.kind === "Transport lost"
          ? messages.tutoringStreamLost
          : messages.tutoringStreamInvalid;
    } else if (
      view.kind === "Terminal known" &&
      persisted?.id === view.responseId
    ) {
      key = `${view.responseId}:${persisted.state}`;
      message =
        persisted.state === "completed"
          ? messages.tutoringResponseComplete
          : persisted.state === "failed"
            ? messages.tutoringResponseFailed
            : messages.tutoringResponseInterrupted;
    } else if (view.state === "generating") {
      key = `${view.responseId}:generating`;
      message = messages.tutoringResponseGenerating;
    }
    if (message === null || key === null || ledger.current.has(key)) return;
    ledger.current.add(key);
    callbacks.current.announce(
      callbacks.current.intl.formatMessage(message),
      persisted?.state === "failed" || view.kind === "Protocol error"
        ? "urgent"
        : "polite",
    );
  }, [view, persisted]);

  return {
    view,
    persisted,
    pending,
    pause: () => controller.pause(),
    resume: () => {
      controller.resume();
      if (deferred.current !== null) {
        const result = deferred.current;
        deferred.current = null;
        setPending(false);
        setPersisted(result.response);
        callbacks.current.installWork(result.work);
      } else if (terminalRead.current) setPending(true);
    },
  };
}
