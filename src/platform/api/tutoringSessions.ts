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
  toTutoringSessionId,
  utcInstant,
  type CourseId,
  type MaterialId,
  type TutoringSessionId,
} from "./entry";
import type { operations } from "./generated";

// The opaque session identity brand lives with the other route-identity
// brands in ./entry so eager route parsing never pulls this module's parsers
// into the initial bundle; re-exported here for the tutoring consumers.
export { toTutoringSessionId, type TutoringSessionId };

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

// Story 6.2: one student message with its nested initial tutor response. The
// minimal projection (identity, sequence, escaped content, creation instant,
// response identity/attempt/state/content) is shared by the mutation document,
// the queued-work slot and request-ID reconciliation; every other field is
// stripped at the boundary. 6.3–6.5 extend this schema, never fork it.
const tutorResponseResource = z.object({
  type: z.literal("tutor-responses"),
  id: resourceId,
  attributes: z.object({
    session_id: resourceId,
    message_id: resourceId,
    attempt: z.number().int().min(1),
    state: z.enum(responseStates),
    content: z.string(),
  }),
});
export type TutorResponseProjection = {
  readonly id: string;
  readonly messageId: string;
  readonly attempt: number;
  readonly state: TutorResponseState;
  readonly content: string;
};
function toResponseProjection(
  session: TutoringSessionId,
  resource: z.infer<typeof tutorResponseResource>,
): TutorResponseProjection {
  if (resource.attributes.session_id !== session) throw new ApiProtocolError();
  return {
    id: resource.id,
    messageId: resource.attributes.message_id,
    attempt: resource.attributes.attempt,
    state: resource.attributes.state,
    content: resource.attributes.content,
  };
}
const studentMessageResource = z.object({
  type: z.literal("student-messages"),
  id: resourceId,
  attributes: z.object({
    session_id: resourceId,
    sequence: z.number().int().min(1),
    content: z.string(),
    created_at: utcInstant,
    response: tutorResponseResource,
  }),
});
export type StudentMessageProjection = {
  readonly id: string;
  readonly sequence: number;
  readonly content: string;
  readonly createdAt: number;
  readonly response: TutorResponseProjection;
};
function toMessageProjection(
  session: TutoringSessionId,
  resource: z.infer<typeof studentMessageResource>,
): StudentMessageProjection {
  const response = toResponseProjection(session, resource.attributes.response);
  if (
    resource.attributes.session_id !== session ||
    response.messageId !== resource.id
  )
    throw new ApiProtocolError();
  return {
    id: resource.id,
    sequence: resource.attributes.sequence,
    content: resource.attributes.content,
    createdAt: Date.parse(resource.attributes.created_at),
    response,
  };
}

// Machine 2 message send: one request-ID-bound immutable payload, dispatched
// at most once per attempt. 201 (new message with queued tutor response) and
// 200 (identical-request replay) are one definitive success (D9); the
// `links.current_work` URL is never consumed — the follow-up read is
// constructed locally from trusted branded identities (D4).
const messageMutationDocument = z.object({
  errors: z.never().optional(),
  data: studentMessageResource,
});
export async function createStudentMessage(
  session: TutoringSessionId,
  content: string,
  clientRequestId: string,
  csrfToken: string,
): Promise<StudentMessageProjection> {
  const body = {
    data: {
      type: "student-messages",
      attributes: { client_request_id: clientRequestId, content },
    },
  } satisfies operations["createStudentMessage"]["requestBody"]["content"][typeof jsonApiMediaType];
  const response = await sendUnsafeRequest({
    method: "POST",
    path: `/api/v1/tutoring-sessions/${encodeURIComponent(session)}/messages`,
    csrfToken,
    body: JSON.stringify(body),
  });
  const document = await parseJsonApiResponse(
    response,
    messageMutationDocument,
    response.status === 201 ? 201 : 200,
  );
  return toMessageProjection(session, document.data);
}

// BCG-012 Story 6.2 slice: the one authoritative per-session work read.
// Owner-only, non-refreshing, no-store; the optional well-formed request ID
// reconciles an ambiguous send (a null reconciled message is the authoritative
// not-committed answer; a malformed parameter is a 422 protocol rejection,
// never "not committed"). `latest_response`, `reconciled_response` and the
// stop/retry/reconnect/finish action fields are stripped for 6.3–6.5.
const workDocument = z.object({
  errors: z.never().optional(),
  data: z.object({
    type: z.literal("tutoring-work-states"),
    id: resourceId,
    attributes: z.object({
      session_state: z.enum(["active", "completed"]),
      state: z.enum([
        "idle",
        "generating",
        "queued",
        "generating_and_queued",
        "completed",
      ]),
      remaining_queue_capacity: z.number().int().min(0).max(1),
      generating_response: tutorResponseResource.nullable(),
      queued_work: studentMessageResource.nullable(),
      reconciled_message: studentMessageResource.nullable(),
      actions: z.object({
        submit: z.boolean(),
        queue: z.boolean(),
      }),
    }),
  }),
});
export type TutoringWorkState =
  "idle" | "generating" | "queued" | "generating_and_queued" | "completed";
export type TutoringWork = {
  readonly sessionState: "active" | "completed";
  readonly state: TutoringWorkState;
  readonly remainingQueueCapacity: number;
  readonly generating: TutorResponseProjection | null;
  readonly queued: StudentMessageProjection | null;
  // Server-authored eligibility only; never reconstructed locally.
  readonly actions: {
    readonly submit: boolean;
    readonly queue: boolean;
  };
  readonly reconciledMessage: StudentMessageProjection | null;
};
export async function getTutoringSessionCurrentWork(
  session: TutoringSessionId,
  reconcile: { readonly messageRequestId?: string } = {},
  signal: AbortSignal,
): Promise<TutoringWork> {
  const query =
    reconcile.messageRequestId === undefined
      ? ""
      : `?message_request_id=${encodeURIComponent(reconcile.messageRequestId)}`;
  const { data } = await readJsonApi({
    path: `/api/v1/tutoring-sessions/${encodeURIComponent(session)}/current-work${query}`,
    schema: workDocument,
    initiator: "user",
    signal,
  });
  if (data.id !== session) throw new ApiProtocolError();
  const { attributes: a } = data;
  const generating =
    a.generating_response === null
      ? null
      : toResponseProjection(session, a.generating_response);
  const queued =
    a.queued_work === null ? null : toMessageProjection(session, a.queued_work);
  const reconciledMessage =
    a.reconciled_message === null
      ? null
      : toMessageProjection(session, a.reconciled_message);
  // The state enum is atomic with the one-generating/one-queued invariants; a
  // contradiction is a protocol failure, never a guessed presentation.
  const consistent =
    (a.state === "idle" && generating === null && queued === null) ||
    (a.state === "generating" && generating !== null && queued === null) ||
    (a.state === "queued" && generating === null && queued !== null) ||
    (a.state === "generating_and_queued" &&
      generating !== null &&
      queued !== null) ||
    (a.state === "completed" &&
      a.session_state === "completed" &&
      generating === null &&
      queued === null);
  if (
    !consistent ||
    (a.state === "completed") !== (a.session_state === "completed")
  )
    throw new ApiProtocolError();
  return {
    sessionState: a.session_state,
    state: a.state,
    remainingQueueCapacity: a.remaining_queue_capacity,
    generating,
    queued,
    actions: { submit: a.actions.submit, queue: a.actions.queue },
    reconciledMessage,
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
