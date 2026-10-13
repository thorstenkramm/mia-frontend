import { http, HttpResponse } from "msw";
import { expect, it } from "vitest";
import { server } from "../../../test/server";
import {
  activeTutoringSessionDocument,
  emptyActiveTutoringSessionDocument,
  studentMessageMutationDocument,
  studentMessageResource,
  tutorResponseResource,
  tutoringSessionDocument,
  tutoringTurn,
  tutoringTurnsPage,
  tutoringWorkDocument,
} from "../../../test/tutoringFixtures";
import {
  courseUnitCheckpoint,
  courseUnitFixture,
} from "../../../scripts/secret-hygiene-evidence";
import { ApiHttpError, ApiProtocolError, jsonApiMediaType } from "./client";
import { toCourseId, toMaterialId } from "./entry";
import {
  completeTutoringSession,
  createStudentMessage,
  createTutoringSession,
  getActiveTutoringSession,
  getTutoringSession,
  getTutoringSessionCurrentWork,
  getTutoringResponseCurrentWork,
  retryTutorResponse,
  stopTutorResponse,
  isHiddenTutoringFailure,
  listSessionTurns,
  toTutoringSessionId,
} from "./tutoringSessions";

const json = (body: unknown, status = 200) =>
  new HttpResponse(JSON.stringify(body), {
    status,
    headers: { "Content-Type": jsonApiMediaType },
  });
const course = toCourseId("course_1");
const session = toTutoringSessionId("session_1");
if (session === null) throw new Error("Fixture session identity is invalid.");
const signal = () => new AbortController().signal;

it("Tutoring Finish requires atomic server eligibility and the exact definitive completion document", async () => {
  const seed = courseUnitFixture();
  let workFinish = false;
  let status = 200;
  let responseSession = "session_1";
  let responseState: "active" | "completed" = "completed";
  let responseLink = "/api/v1/tutoring-sessions/session_1/current-work";
  let dispatched = 0;
  let correctWire = false;
  server.use(
    http.get("/api/v1/tutoring-sessions/session_1/current-work", () =>
      json(tutoringWorkDocument(seed.rawError, { finish: workFinish })),
    ),
    http.post(
      "/api/v1/tutoring-sessions/session_1/completion",
      async ({ request }) => {
        dispatched++;
        correctWire =
          request.headers.get("X-CSRF-Token") === seed.csrf &&
          (await request.text()) === "";
        return json(
          {
            ...tutoringSessionDocument(
              seed.rawError,
              responseSession,
              "course_1",
              responseState,
            ),
            links: { current_work: responseLink },
          },
          status,
        );
      },
    ),
  );
  const denied = await getTutoringSessionCurrentWork(session, {}, signal());
  expect(denied.state === "idle" && !denied.actions.finish).toBe(true);
  workFinish = true;
  expect(
    (await getTutoringSessionCurrentWork(session, {}, signal())).actions.finish,
  ).toBe(true);
  const result = await completeTutoringSession(session, seed.csrf);
  expect(
    dispatched === 1 &&
      correctWire &&
      result.id === session &&
      result.state === "completed" &&
      !JSON.stringify(result).includes(seed.rawError),
  ).toBe(true);
  responseSession = "session_other";
  expect(
    await protocolRejected(completeTutoringSession(session, seed.csrf)),
  ).toBe(true);
  responseSession = "session_1";
  responseState = "active";
  expect(
    await protocolRejected(completeTutoringSession(session, seed.csrf)),
  ).toBe(true);
  responseState = "completed";
  responseLink = "/api/v1/tutoring-sessions/session_other/current-work";
  expect(
    await protocolRejected(completeTutoringSession(session, seed.csrf)),
  ).toBe(true);
  responseLink = "/api/v1/tutoring-sessions/session_1/current-work";
  status = 204;
  expect(
    await protocolRejected(completeTutoringSession(session, seed.csrf)),
  ).toBe(true);
  courseUnitCheckpoint("tutoring-finish-document");
});

it("Tutoring terminal reconciliation accepts only the targeted persisted response", async () => {
  const seed = courseUnitFixture();
  let selected = "response_gen";
  let state = "completed";
  let query = "";
  server.use(
    http.get(
      "/api/v1/tutoring-sessions/session_1/current-work",
      ({ request }) => {
        query = new URL(request.url).searchParams.get("response_id") ?? "";
        return json(
          tutoringWorkDocument(seed.rawError, {
            reconciledResponse: tutorResponseResource(
              seed.rawError,
              selected,
              "session_1",
              "message_gen",
              state,
              seed.teachingText,
            ),
          }),
        );
      },
    ),
  );
  const result = await getTutoringResponseCurrentWork(
    session,
    "response_gen",
    signal(),
  );
  expect(
    query === "response_gen" &&
      result.response.id === query &&
      result.response.content === seed.teachingText,
  ).toBe(true);
  selected = "response_other";
  expect(
    await protocolRejected(
      getTutoringResponseCurrentWork(session, "response_gen", signal()),
    ),
  ).toBe(true);
  selected = "response_gen";
  state = "generating";
  expect(
    await protocolRejected(
      getTutoringResponseCurrentWork(session, "response_gen", signal()),
    ),
  ).toBe(true);
  courseUnitCheckpoint("tutoring-targeted-terminal");
});

it("Tutoring Stop accepts only 200 with a targeted interrupted response and independent current work", async () => {
  const seed = courseUnitFixture();
  const targeted = tutorResponseResource(
    seed.rawError,
    "response_gen",
    "session_1",
    "message_gen",
    "interrupted",
    seed.teachingText,
  );
  let status = 200;
  let target: unknown = targeted;
  let wire = false;
  server.use(
    http.post(
      "/api/v1/tutor-responses/response_gen/interruptions",
      ({ request }) => {
        wire = request.headers.get("X-CSRF-Token") === seed.csrf;
        return json(
          tutoringWorkDocument(seed.rawError, {
            state: "generating",
            generating: tutorResponseResource(
              seed.rawError,
              "response_other",
              "session_1",
              "message_other",
              "generating",
            ),
            reconciledResponse: target,
          }),
          status,
        );
      },
    ),
  );
  const result = await stopTutorResponse(session, "response_gen", seed.csrf);
  expect(
    wire &&
      result.response.id === "response_gen" &&
      result.response.content === seed.teachingText &&
      result.work.generating?.id === "response_other" &&
      !JSON.stringify(result).includes(seed.rawError),
  ).toBe(true);
  target = tutorResponseResource(
    seed.rawError,
    "response_other",
    "session_1",
    "message_gen",
    "interrupted",
  );
  expect(
    await protocolRejected(
      stopTutorResponse(session, "response_gen", seed.csrf),
    ),
  ).toBe(true);
  target = tutorResponseResource(
    seed.rawError,
    "response_gen",
    "session_1",
    "message_gen",
    "completed",
  );
  expect(
    await protocolRejected(
      stopTutorResponse(session, "response_gen", seed.csrf),
    ),
  ).toBe(true);
  target = targeted;
  status = 204;
  expect(
    await protocolRejected(
      stopTutorResponse(session, "response_gen", seed.csrf),
    ),
  ).toBe(true);
  courseUnitCheckpoint("tutoring-stop-document");
});

it("Tutoring response retry accepts linked 201/200 but rejects wrong lineage and status", async () => {
  const seed = courseUnitFixture();
  let status = 201;
  let parent: string | null = "response_gen";
  let wire: unknown = null;
  server.use(
    http.post(
      "/api/v1/student-messages/message_gen/response-retries",
      async ({ request }) => {
        wire =
          request.headers.get("X-CSRF-Token") === seed.csrf
            ? await request.json()
            : null;
        return json(
          {
            data: tutorResponseResource(
              seed.rawError,
              "response_retry",
              "session_1",
              "message_gen",
              "queued",
              "",
              2,
              parent,
            ),
          },
          status,
        );
      },
    ),
  );
  const requestId = "0f3b4d2c-0000-4000-8000-0123456789ab";
  const first = await retryTutorResponse(
    session,
    "message_gen",
    "response_gen",
    requestId,
    seed.csrf,
  );
  expect(
    first.retryOfId === "response_gen" &&
      first.attempt === 2 &&
      JSON.stringify(wire) ===
        JSON.stringify({
          data: {
            type: "tutor-response-retries",
            attributes: { client_request_id: requestId },
          },
        }) &&
      !JSON.stringify(first).includes(seed.rawError),
  ).toBe(true);
  status = 200;
  expect(
    (
      await retryTutorResponse(
        session,
        "message_gen",
        "response_gen",
        requestId,
        seed.csrf,
      )
    ).id === first.id,
  ).toBe(true);
  parent = "response_other";
  expect(
    await protocolRejected(
      retryTutorResponse(
        session,
        "message_gen",
        "response_gen",
        requestId,
        seed.csrf,
      ),
    ),
  ).toBe(true);
  parent = "response_gen";
  status = 202;
  expect(
    await protocolRejected(
      retryTutorResponse(
        session,
        "message_gen",
        "response_gen",
        requestId,
        seed.csrf,
      ),
    ),
  ).toBe(true);
  courseUnitCheckpoint("tutoring-retry-document");
});

// A violated rejection assertion must not print a mistakenly returned protected
// value. Keep failure identity observable through a boolean, never the value.
async function protocolRejected(read: Promise<unknown>): Promise<boolean> {
  try {
    await read;
    return false;
  } catch (error) {
    return error instanceof ApiProtocolError;
  }
}

it("Tutoring discovery returns explicit none and strips every non-projection field", async () => {
  const seed = courseUnitFixture();
  let found = false;
  server.use(
    http.get("/api/v1/users/me/active-tutoring-session", ({ request }) => {
      expect(
        request.method === "GET" &&
          request.headers.get("Accept") === jsonApiMediaType &&
          !request.headers.has("X-CSRF-Token"),
      ).toBe(true);
      return json(
        found
          ? activeTutoringSessionDocument(seed.name, seed.teachingText)
          : emptyActiveTutoringSessionDocument(),
      );
    }),
  );
  expect(await getActiveTutoringSession(signal())).toBe(null);
  found = true;
  const active = await getActiveTutoringSession(signal());
  expect(
    active !== null &&
      active.courseName === seed.name &&
      Object.keys(active).sort().join() ===
        "courseId,courseName,id,startedAt" &&
      !JSON.stringify(active).includes(seed.teachingText),
  ).toBe(true);
  courseUnitCheckpoint("tutoring-discovery");
});

it("Tutoring discovery rejects malformed documents instead of guessing none", async () => {
  const seed = courseUnitFixture();
  for (const body of [
    {},
    { data: {} },
    { data: { type: "courses", id: "session_1", attributes: {} } },
    activeTutoringSessionDocument(seed.name, seed.teachingText, ""),
  ]) {
    server.use(
      http.get("/api/v1/users/me/active-tutoring-session", () => json(body)),
    );
    expect(await protocolRejected(getActiveTutoringSession(signal()))).toBe(
      true,
    );
  }
  courseUnitCheckpoint("tutoring-discovery-malformed");
});

it("Tutoring creation binds the request ID and optional material in one exact payload", async () => {
  const seed = courseUnitFixture();
  const material = toMaterialId("material_1");
  if (material === null) throw new Error("Fixture material ID is invalid.");
  let wire: boolean | null = null;
  let payload: unknown = null;
  server.use(
    http.post(
      "/api/v1/courses/course_1/tutoring-sessions",
      async ({ request }) => {
        payload = await request.json();
        wire =
          request.headers.get("X-CSRF-Token") === seed.csrf &&
          request.headers.get("Content-Type") === jsonApiMediaType;
        return json(tutoringSessionDocument(seed.teachingText), 201);
      },
    ),
  );
  const created = await createTutoringSession(
    course,
    material,
    "0f3b4d2c-0000-4000-8000-0123456789ab",
    seed.csrf,
  );
  expect(
    wire === true &&
      created.id === session &&
      JSON.stringify(payload) ===
        JSON.stringify({
          data: {
            type: "tutoring-sessions",
            attributes: {
              client_request_id: "0f3b4d2c-0000-4000-8000-0123456789ab",
            },
            relationships: {
              materials: { data: [{ type: "materials", id: "material_1" }] },
            },
          },
        }) &&
      !JSON.stringify(created).includes(seed.teachingText),
  ).toBe(true);
  wire = null;
  payload = null;
  const without = await createTutoringSession(
    course,
    null,
    "0f3b4d2c-0000-4000-8000-0123456789ab",
    seed.csrf,
  );
  expect(
    wire === true &&
      without.id === session &&
      JSON.stringify(payload) ===
        JSON.stringify({
          data: {
            type: "tutoring-sessions",
            attributes: {
              client_request_id: "0f3b4d2c-0000-4000-8000-0123456789ab",
            },
          },
        }),
  ).toBe(true);
  courseUnitCheckpoint("tutoring-create");
});

it("Tutoring creation accepts only 200 or 201 and rejects cross-course or ambiguous success", async () => {
  const seed = courseUnitFixture();
  let status = 201;
  let other = false;
  server.use(
    http.post("/api/v1/courses/course_1/tutoring-sessions", () =>
      json(
        tutoringSessionDocument(
          seed.teachingText,
          "session_1",
          other ? "course_2" : "course_1",
        ),
        status,
      ),
    ),
  );
  const replayed = await createTutoringSession(
    course,
    null,
    "0f3b4d2c-0000-4000-8000-0123456789ab",
    seed.csrf,
  );
  expect(replayed.id === session && replayed.courseId === course).toBe(true);
  status = 200;
  expect(
    (await createTutoringSession(course, null, "id", seed.csrf)).id === session,
  ).toBe(true);
  status = 202;
  expect(
    await protocolRejected(
      createTutoringSession(course, null, "id", seed.csrf),
    ),
  ).toBe(true);
  status = 201;
  other = true;
  expect(
    await protocolRejected(
      createTutoringSession(course, null, "id", seed.csrf),
    ),
  ).toBe(true);
  courseUnitCheckpoint("tutoring-create-status");
});

it("Tutoring session read requires the addressed identity and strips summary fields", async () => {
  const seed = courseUnitFixture();
  let wrong = false;
  server.use(
    http.get("/api/v1/tutoring-sessions/session_1", () =>
      json(
        tutoringSessionDocument(
          seed.teachingText,
          wrong ? "session_2" : "session_1",
        ),
      ),
    ),
  );
  const read = await getTutoringSession(session, signal());
  expect(
    read.state === "active" &&
      Object.keys(read).sort().join() ===
        "courseId,id,lastActivityAt,startedAt,state,studentId" &&
      !JSON.stringify(read).includes(seed.teachingText),
  ).toBe(true);
  wrong = true;
  expect(await protocolRejected(getTutoringSession(session, signal()))).toBe(
    true,
  );
  courseUnitCheckpoint("tutoring-session");
});

it("Tutoring turn pages reject duplicate wrong-identity and cross-session rows", async () => {
  const seed = courseUnitFixture();
  for (const rows of [
    [tutoringTurn(seed.teachingText), tutoringTurn(seed.teachingText)],
    [tutoringTurn(seed.teachingText, "response_1", "session_2")],
    [
      {
        ...tutoringTurn(seed.teachingText),
        attributes: {
          ...tutoringTurn(seed.teachingText).attributes,
          response: {
            ...tutoringTurn(seed.teachingText).attributes.response,
            id: "other",
          },
        },
      },
    ],
    Array.from({ length: 26 }, (_, index) =>
      tutoringTurn(seed.teachingText, `response_${index}`),
    ),
  ]) {
    server.use(
      http.get("/api/v1/tutoring-sessions/session_1/messages", () =>
        json(tutoringTurnsPage(seed.teachingText, rows)),
      ),
    );
    expect(await protocolRejected(listSessionTurns(session, 0, signal()))).toBe(
      true,
    );
  }
  courseUnitCheckpoint("tutoring-turns");
});

it("Tutoring turn pages keep bounded escaped text and reject unsafe navigation", async () => {
  const seed = courseUnitFixture();
  let unsafe = false;
  server.use(
    http.get("/api/v1/tutoring-sessions/session_1/messages", () => {
      const page: Record<string, unknown> = {
        data: [
          tutoringTurn(seed.teachingText, "response_1", "session_1", seed.name),
        ],
        meta: { has_more: true },
        links: {
          next: unsafe
            ? "https://example.test/api/v1/tutoring-sessions/session_1/messages?page[limit]=25&page[offset]=25"
            : "/api/v1/tutoring-sessions/session_1/messages?page[limit]=25&page[offset]=25",
        },
      };
      return json(page);
    }),
  );
  const page = await listSessionTurns(session, 0, signal());
  expect(
    page.items.length === 1 &&
      page.nextOffset === 25 &&
      page.previousOffset === null &&
      Object.keys(page.items[0] ?? {})
        .sort()
        .join() === "id,responseContent,responseState,studentContent" &&
      page.items[0]?.studentContent === seed.name &&
      !JSON.stringify(page).includes(seed.teachingText),
  ).toBe(true);
  unsafe = true;
  expect(await protocolRejected(listSessionTurns(session, 0, signal()))).toBe(
    true,
  );
  courseUnitCheckpoint("tutoring-turn-pages");
});

it("Tutoring message send binds the request ID and exact bytes in one payload", async () => {
  const seed = courseUnitFixture();
  const content = `compose ${seed.name}\nsecond line <b>raw</b>`;
  let wire: boolean | null = null;
  let payload: unknown = null;
  server.use(
    http.post(
      "/api/v1/tutoring-sessions/session_1/messages",
      async ({ request }) => {
        payload = await request.json();
        wire =
          request.headers.get("X-CSRF-Token") === seed.csrf &&
          request.headers.get("Content-Type") === jsonApiMediaType;
        return json(
          studentMessageMutationDocument(seed.rawError, content),
          201,
        );
      },
    ),
  );
  const sent = await createStudentMessage(
    session,
    content,
    "0f3b4d2c-0000-4000-8000-0123456789ab",
    seed.csrf,
  );
  expect(
    wire === true &&
      JSON.stringify(payload) ===
        JSON.stringify({
          data: {
            type: "student-messages",
            attributes: {
              client_request_id: "0f3b4d2c-0000-4000-8000-0123456789ab",
              content,
            },
          },
        }) &&
      sent.content === content &&
      Object.keys(sent).sort().join() ===
        "content,createdAt,id,response,sequence" &&
      Object.keys(sent.response).sort().join() ===
        "attempt,content,id,messageId,retryOfId,state" &&
      !JSON.stringify(sent).includes(seed.rawError),
  ).toBe(true);
  courseUnitCheckpoint("tutoring-message-send");
});

it("Tutoring message send accepts only 200 or 201 and rejects cross-identity success", async () => {
  const seed = courseUnitFixture();
  let status = 201;
  server.use(
    http.post("/api/v1/tutoring-sessions/session_1/messages", () =>
      json(studentMessageMutationDocument(seed.rawError), status),
    ),
  );
  const first = await createStudentMessage(session, "q", "id", seed.csrf);
  expect(
    first.id === "message_new" && first.response.id === "response_new",
  ).toBe(true);
  status = 200;
  expect(
    (await createStudentMessage(session, "q", "id", seed.csrf)).id ===
      "message_new",
  ).toBe(true);
  status = 202;
  expect(
    await protocolRejected(createStudentMessage(session, "q", "id", seed.csrf)),
  ).toBe(true);
  // Cross-session and mismatched nested identity are protocol failures.
  const crossed = JSON.parse(
    JSON.stringify(studentMessageMutationDocument(seed.rawError)),
  ) as {
    data: { attributes: { session_id: string; response: { id: string } } };
  };
  crossed.data.attributes.session_id = "session_2";
  server.use(
    http.post("/api/v1/tutoring-sessions/session_1/messages", () =>
      json(crossed),
    ),
  );
  expect(
    await protocolRejected(createStudentMessage(session, "q", "id", seed.csrf)),
  ).toBe(true);
  crossed.data.attributes.session_id = "session_1";
  crossed.data.attributes.response.id = "";
  server.use(
    http.post("/api/v1/tutoring-sessions/session_1/messages", () =>
      json(crossed),
    ),
  );
  expect(
    await protocolRejected(createStudentMessage(session, "q", "id", seed.csrf)),
  ).toBe(true);
  courseUnitCheckpoint("tutoring-message-status");
});

it("Tutoring current work parses every state and strips unused projections", async () => {
  const seed = courseUnitFixture();
  const generating = tutorResponseResource(
    seed.rawError,
    "response_g",
    "session_1",
    "message_g",
    "generating",
    seed.teachingText,
  );
  const queued = studentMessageResource(
    seed.rawError,
    "message_q",
    "session_1",
    seed.name,
    "response_q",
  );
  const reconciled = studentMessageResource(
    seed.rawError,
    "message_r",
    "session_1",
    "reconciled question",
    "response_r",
    "completed",
  );
  let document: unknown = tutoringWorkDocument(seed.rawError);
  server.use(
    http.get("/api/v1/tutoring-sessions/session_1/current-work", () =>
      json(document),
    ),
  );
  const idle = await getTutoringSessionCurrentWork(session, {}, signal());
  expect(
    idle.state === "idle" &&
      idle.sessionState === "active" &&
      idle.remainingQueueCapacity === 1 &&
      idle.generating === null &&
      idle.queued === null &&
      idle.reconciledMessage === null &&
      idle.actions.submit === true &&
      idle.actions.queue === false &&
      Object.keys(idle).sort().join() ===
        "actions,generating,latest,queued,reconciledMessage,remainingQueueCapacity,sessionState,state" &&
      Object.keys(idle.actions).sort().join() ===
        "finish,queue,reconnectResponseId,retryResponseId,stopResponseIds,submit" &&
      !JSON.stringify(idle).includes(seed.rawError),
  ).toBe(true);
  document = tutoringWorkDocument(seed.rawError, {
    state: "generating",
    generating,
    submit: false,
    queue: true,
  });
  const busy = await getTutoringSessionCurrentWork(session, {}, signal());
  expect(
    busy.state === "generating" &&
      busy.generating?.content === seed.teachingText &&
      busy.actions.queue === true &&
      busy.actions.submit === false &&
      !JSON.stringify(busy).includes(seed.rawError),
  ).toBe(true);
  document = tutoringWorkDocument(seed.rawError, {
    state: "queued",
    queued,
    submit: false,
  });
  const held = await getTutoringSessionCurrentWork(session, {}, signal());
  expect(
    held.state === "queued" &&
      held.queued?.content === seed.name &&
      held.queued?.response.state === "queued" &&
      held.remainingQueueCapacity === 0,
  ).toBe(true);
  document = tutoringWorkDocument(seed.rawError, {
    state: "generating_and_queued",
    generating,
    queued,
    submit: false,
  });
  const both = await getTutoringSessionCurrentWork(session, {}, signal());
  expect(both.state === "generating_and_queued").toBe(true);
  document = tutoringWorkDocument(seed.rawError, {
    sessionState: "completed",
    state: "completed",
    submit: false,
  });
  const done = await getTutoringSessionCurrentWork(session, {}, signal());
  expect(done.state === "completed" && done.sessionState === "completed").toBe(
    true,
  );
  courseUnitCheckpoint("tutoring-work-states");
  // Request-ID reconciliation: the query carries only the retained ID, and a
  // well-formed unknown ID is 200 with an explicit null, never an error.
  let seenQuery: string | null = null;
  document = tutoringWorkDocument(seed.rawError, { reconciled });
  server.use(
    http.get(
      "/api/v1/tutoring-sessions/session_1/current-work",
      ({ request }) => {
        seenQuery = new URL(request.url).searchParams.get("message_request_id");
        return json(document);
      },
    ),
  );
  const found = await getTutoringSessionCurrentWork(
    session,
    { messageRequestId: "0f3b4d2c-0000-4000-8000-0123456789ab" },
    signal(),
  );
  expect(
    seenQuery === "0f3b4d2c-0000-4000-8000-0123456789ab" &&
      found.reconciledMessage?.id === "message_r" &&
      found.reconciledMessage.response.state === "completed",
  ).toBe(true);
  document = tutoringWorkDocument(seed.rawError);
  const missing = await getTutoringSessionCurrentWork(
    session,
    { messageRequestId: "0f3b4d2c-0000-4000-8000-0123456789ab" },
    signal(),
  );
  expect(missing.reconciledMessage === null).toBe(true);
  courseUnitCheckpoint("tutoring-work-reconcile");
});

it("Tutoring current work rejects contradictions and wrong identities", async () => {
  const seed = courseUnitFixture();
  const queued = studentMessageResource(seed.rawError);
  for (const document of [
    // Addressed identity mismatch.
    tutoringWorkDocument(seed.rawError, { session: "session_2" }),
    // Idle with present work, and queued state without queued work.
    tutoringWorkDocument(seed.rawError, { queued }),
    tutoringWorkDocument(seed.rawError, { state: "queued" }),
    // Completed work on an active session, and work on a completed session.
    tutoringWorkDocument(seed.rawError, { state: "completed" }),
    tutoringWorkDocument(seed.rawError, {
      sessionState: "completed",
      state: "queued",
      queued,
      submit: false,
    }),
    // Out-of-range capacity.
    {
      ...tutoringWorkDocument(seed.rawError),
      data: {
        ...tutoringWorkDocument(seed.rawError).data,
        attributes: {
          ...tutoringWorkDocument(seed.rawError).data.attributes,
          remaining_queue_capacity: 2,
        },
      },
    },
  ]) {
    server.use(
      http.get("/api/v1/tutoring-sessions/session_1/current-work", () =>
        json(document),
      ),
    );
    expect(
      await protocolRejected(
        getTutoringSessionCurrentWork(session, {}, signal()),
      ),
    ).toBe(true);
  }
  courseUnitCheckpoint("tutoring-work-invalid");
});

it("Tutoring hidden failures cover exactly denial unknown and throttled statuses", () => {
  const http = (status: number) =>
    new ApiHttpError({ status, body: JSON.stringify({ errors: [] }) });
  expect(
    isHiddenTutoringFailure(http(403)) &&
      isHiddenTutoringFailure(http(404)) &&
      isHiddenTutoringFailure(http(429)) &&
      !isHiddenTutoringFailure(http(400)) &&
      !isHiddenTutoringFailure(http(409)) &&
      !isHiddenTutoringFailure(http(422)) &&
      !isHiddenTutoringFailure(http(500)) &&
      !isHiddenTutoringFailure(new ApiProtocolError()),
  ).toBe(true);
  courseUnitCheckpoint("tutoring-hidden");
});
