import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
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
import type { TutoringRetentionEntry } from "./tutoringRetention";

// One route-local external store; the existing session owner fences dependent
// reads on scope/security changes, and route teardown closes EventSource.
export function useTutorStream({
  session,
  work,
  installWork,
  unavailable,
  retention,
}: {
  readonly session: TutoringSessionId;
  readonly work: TutoringWork | null;
  readonly installWork: (value: TutoringWork) => void;
  readonly unavailable: (failure: EntryApiFailure) => void;
  readonly retention: TutoringRetentionEntry;
}) {
  const controller = retention.stream;
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
    readonly revision: number;
  } | null>(null);
  const terminalRead = useRef(false);
  // A terminal GET can have been issued before a definitive Stop/retry work
  // document. Its targeted persisted response remains useful; its older work
  // snapshot must not replace the later mutation truth.
  const workRevision = useRef(0);
  const { announce } = useAnnouncer();
  const intl = useIntl();
  const { readAuthenticated, checkRouteAdmission, markRevalidationNeeded } =
    useSessionActions();

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
      if (!retention.covered) controller.close();
      openedResponses.clear();
      announcementLedger.clear();
      deferredResult.current = null;
      activeRead.current = false;
    };
  }, [controller, retention]);

  const generating = work?.generating ?? null;
  const queued = work?.queued?.response ?? null;
  const response = generating ?? queued;
  const responseId = response?.id ?? null;
  const terminal = useRef<(id: string) => void>(() => undefined);
  terminal.current = (id: string) => {
    const revision = workRevision.current;
    terminalRead.current = true;
    if (!controller.getSnapshot().paused) setPending(true);
    void (async () => {
      const result = await callbacks.current.readAuthenticated((signal) =>
        getTutoringResponseCurrentWork(session, id, signal),
      );
      if (!alive.current || controller.getSnapshot().responseId !== id) return;
      terminalRead.current = false;
      if (result.kind === "completed") {
        if (controller.getSnapshot().paused) {
          deferred.current = { ...result.value, revision };
          return;
        }
        setPending(false);
        setPersisted(result.value.response);
        if (workRevision.current === revision)
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
  };
  useEffect(() => {
    if (responseId === null) {
      if (retention.reconnectRequested) {
        retention.reconnectRequested = false;
        retention.covered = false;
        controller.checkFailed();
        return;
      }
      if (retention.covered) return;
      // A terminal GET already in flight owns the old response article even
      // when a later Stop removed the queued work. Do not erase its identity
      // before that targeted persisted response can settle.
      if (
        terminalRead.current &&
        controller.getSnapshot().kind === "Terminal known"
      )
        return;
      if (
        persisted?.id === controller.getSnapshot().responseId &&
        controller.getSnapshot().kind === "Terminal known"
      )
        return;
      controller.close();
      return;
    }
    if (retention.covered && !retention.reconnectRequested) return;
    if (opened.current.has(responseId)) return;
    opened.current.add(responseId);
    // Admitted static progress is not a transition. Only a queued attempt
    // changing to generating during this page lifetime may be announced.
    if (generating?.id === responseId)
      ledger.current.add(`${responseId}:generating`);
    deferred.current = null;
    terminalRead.current = false;
    if (retention.reconnectRequested) {
      retention.reconnectRequested = false;
      retention.covered = false;
      if (work?.actions.reconnectResponseId === responseId)
        controller.reopen(responseId, (id) => terminal.current(id));
      else controller.checkFailed();
    } else controller.open(responseId, (id) => terminal.current(id));
  }, [
    controller,
    generating?.id,
    persisted,
    responseId,
    session,
    retention,
    work?.actions.reconnectResponseId,
  ]);

  useLayoutEffect(() => {
    if (view.kind === "Transport lost" || view.kind === "Protocol error")
      markRevalidationNeeded();
  }, [view.kind, markRevalidationNeeded]);

  // Reconnect requires a user action and the full existing session/capability
  // gate, then an authorized route-resource/current-work read. No timer or
  // lifecycle handler calls this function.
  const tryNow = () => {
    if (retention.covered) controller.resumeRetries();
    if (!controller.tryNow()) return;
    retention.reconnectRequested = true;
    void checkRouteAdmission();
  };

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
        if (workRevision.current === result.revision)
          callbacks.current.installWork(result.work);
      } else if (terminalRead.current) setPending(true);
    },
    tryNow,
    stopWaiting: () => controller.stopWaiting(),
    resumeRetries: () => controller.resumeRetries(),
    newBound: () => controller.newBound(),
    recordTerminal: (response: TutorResponseProjection) => {
      controller.close();
      setPersisted(response);
    },
    fenceWork: () => {
      workRevision.current++;
    },
  };
}
