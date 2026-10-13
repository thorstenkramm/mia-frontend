// Synthetic protocol documents only. Callers supply per-run protected markers;
// no fixture content belongs in snapshots, assertion messages or artifacts.
// Every document carries forbidden markers in fields the boundary must strip.
export function activeTutoringSessionDocument(
  courseName: string,
  forbidden: string,
  id = "session_1",
  course = "course_1",
) {
  return {
    data: {
      type: "tutoring-sessions",
      id,
      attributes: {
        course_id: course,
        course_name: courseName,
        state: "active",
        started_at: "2026-10-10T08:00:00.000000Z",
        last_activity_at: "2026-10-10T09:00:00.000000Z",
        summary: forbidden,
        student_id: forbidden,
      },
    },
  };
}
export function emptyActiveTutoringSessionDocument() {
  return { data: null };
}
export function tutoringSessionDocument(
  forbidden: string,
  id = "session_1",
  course = "course_1",
  state: "active" | "completed" = "active",
  student = "account-id",
) {
  return {
    data: {
      type: "tutoring-sessions",
      id,
      attributes: {
        course_id: course,
        student_id: student,
        state,
        summary: forbidden,
        follow_up: forbidden,
        summary_source: null,
        summary_updated_by: forbidden,
        summary_lifecycle: { state: "generated" },
        started_at: "2026-10-10T08:00:00.000000Z",
        last_activity_at: "2026-10-10T09:00:00.000000Z",
        completed_at:
          state === "completed" ? "2026-10-10T10:00:00.000000Z" : null,
        summary_updated_at: null,
      },
      relationships: {
        materials: { data: [{ type: "materials", id: "material_1" }] },
      },
    },
  };
}
export function tutoringTurn(
  forbidden: string,
  id = "response_1",
  session = "session_1",
  studentContent = "student text",
  responseState = "completed",
  responseContent = "tutor text",
) {
  return {
    type: "tutoring-turns",
    id,
    attributes: {
      student_message_id: forbidden,
      sequence: 1,
      student_content: studentContent,
      student_message_created_at: "2026-10-10T08:05:00.000000Z",
      response: {
        type: "tutor-responses",
        id,
        attributes: {
          session_id: session,
          message_id: forbidden,
          retry_of_response_id: null,
          attempt: 1,
          state: responseState,
          content: responseContent,
          failure_code: forbidden,
          created_at: "2026-10-10T08:05:01.000000Z",
          started_at: "2026-10-10T08:05:02.000000Z",
          finished_at: "2026-10-10T08:05:03.000000Z",
        },
      },
    },
  };
}
export function tutoringTurnsPage(
  forbidden: string,
  turns: readonly unknown[] = [tutoringTurn(forbidden)],
  hasMore = false,
) {
  return {
    data: turns,
    meta: { has_more: hasMore },
    ...(hasMore
      ? {
          links: {
            next: "/api/v1/tutoring-sessions/session_1/messages?page[limit]=25&page[offset]=25",
          },
        }
      : {}),
  };
}
// The second page proves explicit backward navigation on a nonzero offset.
export function tutoringTurnsSecondPage(forbidden: string) {
  return {
    data: [tutoringTurn(forbidden, "response_2")],
    meta: { has_more: false },
    links: {
      prev: "/api/v1/tutoring-sessions/session_1/messages?page[limit]=25&page[offset]=0",
    },
  };
}

// Story 6.2: one student message with its nested initial tutor response, as
// the message mutation document, the queued-work slot, or the reconciled
// message. Fields the boundary must strip carry the per-run forbidden marker.
export function tutorResponseResource(
  forbidden: string,
  id = "response_new",
  session = "session_1",
  message = "message_new",
  state = "queued",
  content = "",
  attempt = 1,
  retryOf: string | null = null,
) {
  return {
    type: "tutor-responses",
    id,
    attributes: {
      session_id: session,
      message_id: message,
      retry_of_response_id: retryOf,
      attempt,
      state,
      content,
      failure_code: forbidden,
      created_at: "2026-10-10T08:05:01.000000Z",
      started_at: null,
      finished_at:
        state === "completed" || state === "interrupted" || state === "failed"
          ? "2026-10-10T08:05:03.000000Z"
          : null,
    },
  };
}
export function studentMessageResource(
  forbidden: string,
  id = "message_new",
  session = "session_1",
  content = "composed question",
  response = "response_new",
  responseState = "queued",
) {
  return {
    type: "student-messages",
    id,
    attributes: {
      session_id: session,
      sequence: 2,
      content,
      created_at: "2026-10-10T08:05:00.000000Z",
      response: tutorResponseResource(
        forbidden,
        response,
        session,
        id,
        responseState,
      ),
      client_request_id: forbidden,
    },
  };
}
export function studentMessageMutationDocument(
  forbidden: string,
  content = "composed question",
) {
  return {
    data: studentMessageResource(
      forbidden,
      "message_new",
      "session_1",
      content,
    ),
    links: {
      current_work: `/api/v1/tutoring-sessions/session_1/current-work?message_request_id=${forbidden}`,
    },
  };
}

// The current-work document in one of the five states. Stripped projections
// (`latest_response`, summary) carry the forbidden marker. Capacity/eligibility default to the
// documented per-state truth; callers may override to test contradictions.
export function tutoringWorkDocument(
  forbidden: string,
  {
    session = "session_1",
    sessionState = "active",
    state = "idle",
    generating = null as unknown,
    queued = null as unknown,
    reconciled = null as unknown,
    reconciledResponse = null as unknown,
    submit,
    queue,
    stopIds,
    retryId = null,
    latest = null as unknown,
    reconnectId,
    finish,
  }: {
    session?: string;
    sessionState?: string;
    state?: string;
    generating?: unknown;
    queued?: unknown;
    reconciled?: unknown;
    reconciledResponse?: unknown;
    submit?: boolean | undefined;
    queue?: boolean | undefined;
    stopIds?: readonly string[];
    retryId?: string | null;
    latest?: unknown;
    reconnectId?: string | null;
    finish?: boolean;
  } = {},
) {
  const generatingId = (generating as { id?: string } | null)?.id ?? null;
  const queuedId =
    (queued as { attributes?: { response?: { id?: string } } } | null)
      ?.attributes?.response?.id ?? null;
  const activeIds = [generatingId, queuedId].filter(
    (id): id is string => id !== null,
  );
  const reconnect =
    reconnectId === undefined ? (generatingId ?? queuedId) : reconnectId;
  return {
    data: {
      type: "tutoring-work-states",
      id: session,
      attributes: {
        session_state: sessionState,
        state,
        remaining_queue_capacity:
          state === "idle" || state === "generating" ? 1 : 0,
        generating_response: generating,
        queued_work: queued,
        latest_response:
          latest === null && retryId !== null
            ? tutorResponseResource(
                forbidden,
                retryId,
                session,
                "message_gen",
                "interrupted",
              )
            : latest,
        reconciled_message: reconciled,
        reconciled_response: reconciledResponse,
        actions: {
          submit: submit ?? state === "idle",
          queue: queue ?? state === "generating",
          stop: (stopIds ?? activeIds).length > 0,
          stop_response_ids: stopIds ?? activeIds,
          retry: retryId !== null,
          retry_response_id: retryId,
          reconnect: reconnect !== null,
          reconnect_response_id: reconnect,
          finish: finish ?? (sessionState === "active" && state === "idle"),
        },
      },
    },
  };
}
