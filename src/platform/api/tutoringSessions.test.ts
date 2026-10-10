import { http, HttpResponse } from "msw";
import { expect, it } from "vitest";
import { server } from "../../../test/server";
import {
  activeTutoringSessionDocument,
  emptyActiveTutoringSessionDocument,
  tutoringSessionDocument,
  tutoringTurn,
  tutoringTurnsPage,
} from "../../../test/tutoringFixtures";
import {
  courseUnitCheckpoint,
  courseUnitFixture,
} from "../../../scripts/secret-hygiene-evidence";
import { ApiHttpError, ApiProtocolError, jsonApiMediaType } from "./client";
import { toCourseId, toMaterialId } from "./entry";
import {
  createTutoringSession,
  getActiveTutoringSession,
  getTutoringSession,
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
        "courseId,id,lastActivityAt,startedAt,state" &&
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
