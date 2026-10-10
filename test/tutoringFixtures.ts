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
) {
  return {
    data: {
      type: "tutoring-sessions",
      id,
      attributes: {
        course_id: course,
        student_id: forbidden,
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
