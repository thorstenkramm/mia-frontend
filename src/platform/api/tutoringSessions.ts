import { z } from "zod";
import {
  ApiProtocolError,
  jsonApiMediaType,
  parseJsonApiResponse,
  readJsonApi,
  sendUnsafeRequest,
  type ApiFailure,
} from "./client";
import {
  collectionDocument,
  collectionNavigation,
  collectionQuery,
} from "./collectionNavigation";
import {
  resourceId,
  toCourseId,
  utcInstant,
  type CourseId,
  type MaterialId,
} from "./entry";
import type { operations } from "./generated";

declare const tutoringSessionIdBrand: unique symbol;
export type TutoringSessionId = string & {
  readonly [tutoringSessionIdBrand]: "TutoringSessionId";
};
// Opaque backend identity conversion; invalid values never become a route or
// request identity.
export function toTutoringSessionId(value: string): TutoringSessionId | null {
  return resourceId.safeParse(value).success
    ? (value as TutoringSessionId)
    : null;
}

// BCG-002 Story 6.1 slice: the one authoritative cross-course discovery read.
// Non-refreshing and no-store through the shared transport; only the minimal
// navigation projection leaves this boundary.
const activeSessionDocument = z.object({
  errors: z.never().optional(),
  data: z
    .object({
      type: z.literal("tutoring-sessions"),
      id: resourceId,
      attributes: z.object({
        course_id: resourceId,
        course_name: z.string(),
        state: z.literal("active"),
        started_at: utcInstant,
        last_activity_at: utcInstant,
      }),
    })
    .nullable(),
});
export type ActiveTutoringSession = {
  readonly id: TutoringSessionId;
  readonly courseId: CourseId;
  readonly courseName: string;
  readonly startedAt: number;
};

// Explicit null data is the authoritative no-active-session result, not a
// failure and never an inferred state.
export async function getActiveTutoringSession(
  signal: AbortSignal,
): Promise<ActiveTutoringSession | null> {
  const { data } = await readJsonApi({
    path: "/api/v1/users/me/active-tutoring-session",
    schema: activeSessionDocument,
    initiator: "user",
    signal,
  });
  if (data === null) return null;
  const id = toTutoringSessionId(data.id);
  if (id === null) throw new ApiProtocolError();
  return {
    id,
    courseId: toCourseId(data.attributes.course_id),
    courseName: data.attributes.course_name,
    startedAt: Date.parse(data.attributes.started_at),
  };
}

// Story 6.1 minimal learner projection: identity, course ownership, lifecycle
// state and activity instants. Summary, follow-up, lifecycle detail and every
// other field are stripped at the boundary; later stories own them.
const sessionResource = z.object({
  type: z.literal("tutoring-sessions"),
  id: resourceId,
  attributes: z.object({
    course_id: resourceId,
    state: z.enum(["active", "completed"]),
    started_at: utcInstant,
    last_activity_at: utcInstant,
  }),
});
const sessionDocument = z.object({
  errors: z.never().optional(),
  data: sessionResource,
});
export type TutoringSession = {
  readonly id: TutoringSessionId;
  readonly courseId: CourseId;
  readonly state: "active" | "completed";
  readonly startedAt: number;
  readonly lastActivityAt: number;
};
function toSession(resource: z.infer<typeof sessionResource>): TutoringSession {
  const id = toTutoringSessionId(resource.id);
  if (id === null) throw new ApiProtocolError();
  return {
    id,
    courseId: toCourseId(resource.attributes.course_id),
    state: resource.attributes.state,
    startedAt: Date.parse(resource.attributes.started_at),
    lastActivityAt: Date.parse(resource.attributes.last_activity_at),
  };
}

// An addressed read must return the addressed identity; anything else is a
// protocol failure, never a guess.
export async function getTutoringSession(
  id: TutoringSessionId,
  signal: AbortSignal,
): Promise<TutoringSession> {
  const { data } = await readJsonApi({
    path: `/api/v1/tutoring-sessions/${encodeURIComponent(id)}`,
    schema: sessionDocument,
    initiator: "user",
    signal,
  });
  const session = toSession(data);
  if (session.id !== id) throw new ApiProtocolError();
  return session;
}

// Machine 2: one request-ID-bound creation, dispatched at most once by the
// session owner. Both 201 (new) and 200 (identical-request replay) are the
// declared definitive success document; any other ok status is malformed.
export async function createTutoringSession(
  course: CourseId,
  material: MaterialId | null,
  clientRequestId: string,
  csrfToken: string,
): Promise<TutoringSession> {
  const body = {
    data: {
      type: "tutoring-sessions",
      attributes: { client_request_id: clientRequestId },
      ...(material === null
        ? {}
        : {
            relationships: {
              materials: { data: [{ type: "materials", id: material }] },
            },
          }),
    },
  } satisfies operations["createTutoringSession"]["requestBody"]["content"][typeof jsonApiMediaType];
  const response = await sendUnsafeRequest({
    method: "POST",
    path: `/api/v1/courses/${encodeURIComponent(course)}/tutoring-sessions`,
    csrfToken,
    body: JSON.stringify(body),
  });
  const document = await parseJsonApiResponse(
    response,
    sessionDocument,
    response.status === 201 ? 201 : 200,
  );
  const session = toSession(document.data);
  if (session.courseId !== course) throw new ApiProtocolError();
  return session;
}

const responseStates = [
  "queued",
  "generating",
  "completed",
  "interrupted",
  "failed",
] as const;
export type TutorResponseState = (typeof responseStates)[number];
export type SessionTurn = {
  // The paired tutor-response ID, unique across transcript turns (stable key).
  readonly id: string;
  readonly studentContent: string;
  readonly responseState: TutorResponseState;
  readonly responseContent: string;
};
export type SessionTurnPage = {
  readonly items: readonly SessionTurn[];
  readonly offset: number;
  readonly previousOffset: number | null;
  readonly nextOffset: number | null;
};
const turnResource = z.object({
  type: z.literal("tutoring-turns"),
  id: resourceId,
  attributes: z.object({
    student_content: z.string(),
    response: z.object({
      id: resourceId,
      attributes: z.object({
        session_id: resourceId,
        state: z.enum(responseStates),
        content: z.string(),
      }),
    }),
  }),
});

// One bounded transcript page. Turn/response identity and session ownership are
// protocol-checked; rendered text leaves the boundary as escaped plain text.
export async function listSessionTurns(
  session: TutoringSessionId,
  offset: number,
  signal: AbortSignal,
): Promise<SessionTurnPage> {
  const path = `/api/v1/tutoring-sessions/${encodeURIComponent(session)}/messages`;
  const document = await readJsonApi({
    path: `${path}?${collectionQuery(offset)}`,
    initiator: "user",
    signal,
    schema: collectionDocument(turnResource),
  });
  if (
    new Set(document.data.map((turn) => turn.id)).size !==
      document.data.length ||
    document.data.some(
      (turn) =>
        turn.attributes.response.id !== turn.id ||
        turn.attributes.response.attributes.session_id !== session,
    )
  )
    throw new ApiProtocolError();
  return {
    items: document.data.map((turn) => ({
      id: turn.id,
      studentContent: turn.attributes.student_content,
      responseState: turn.attributes.response.attributes.state,
      responseContent: turn.attributes.response.attributes.content,
    })),
    offset,
    ...collectionNavigation(
      path,
      offset,
      document.meta.has_more,
      document.links,
    ),
  };
}

// Existence hiding for tutoring reads: unknown, out-of-scope and throttled
// causes share one fixed neutral presentation.
export function isHiddenTutoringFailure(failure: ApiFailure): boolean {
  return (
    failure.kind === "http" &&
    [403, 404, 429].includes(failure.disclosure.status)
  );
}
