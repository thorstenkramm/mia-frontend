import { http, HttpResponse, type JsonBodyType } from "msw";
import { expect, it } from "vitest";
import { server } from "../../../test/server";
import {
  courseUnitCheckpoint,
  courseUnitFixture,
} from "../../../scripts/secret-hygiene-evidence";
import {
  ApiProtocolError,
  ApiTransportError,
  jsonApiMediaType,
  ApiHttpError,
} from "./client";
import { toAccountId, toCourseId } from "./entry";
import {
  createCourse,
  getCourse,
  getCoursePreparation,
  updateCourseTeachingField,
} from "./courses";

function preparationFixture() {
  const fixture = courseUnitFixture();
  const data = {
    type: "courses",
    id: "course_1",
    attributes: {
      name: fixture.name,
      state: "inactive",
      created_at: "2026-10-08T10:00:00.000000Z",
      description: fixture.teachingText,
      curriculum: null,
      learning_goals: null,
      ai_tutor_instructions: null,
      language: null,
      readiness: {
        state: "inactive_incomplete",
        blockers: [
          { id: "learning_goals", link: "/api/v1/courses/course_1" },
          {
            id: "qualifying_material",
            link: "/api/v1/courses/course_1/materials",
          },
        ],
      },
      logo_url: "/discard",
      delete: { discarded: true },
    },
    relationships: { supervisors: { data: [{ type: "users", id: "s1" }] } },
  };
  const json = (body: JsonBodyType, status = 200) =>
    HttpResponse.json(body, {
      status,
      headers: { "Content-Type": jsonApiMediaType },
    });
  return { fixture, data, json };
}

it("preparation reads readiness and persists only the chosen teaching field", async () => {
  const { fixture, data, json } = preparationFixture();
  let sends = 0,
    valid = false;
  server.use(
    http.get("/api/v1/courses/course_1", () => json({ data })),
    http.patch("/api/v1/courses/course_1", async ({ request }) => {
      sends++;
      valid =
        JSON.stringify(await request.json()) ===
          JSON.stringify({
            data: {
              type: "courses",
              id: "course_1",
              attributes: { learning_goals: fixture.teachingText },
            },
          }) &&
        request.headers.get("X-CSRF-Token") === fixture.csrf &&
        !request.headers.has("If-Match");
      return json({
        data: {
          ...data,
          attributes: {
            ...data.attributes,
            learning_goals: fixture.teachingText,
          },
        },
      });
    }),
  );
  const id = toCourseId("course_1");
  const current = await getCoursePreparation(id, new AbortController().signal);
  expect(
    current.fields.description === fixture.teachingText &&
      current.fields.curriculum === null &&
      current.readiness.state === "inactive_incomplete" &&
      current.readiness.blockers[0]?.field === "learningGoals" &&
      current.readiness.blockers[1]?.field === null &&
      !("logo_url" in current.fields),
  ).toBe(true);
  courseUnitCheckpoint("preparation-read");
  const saved = await updateCourseTeachingField(
    id,
    "learningGoals",
    fixture.teachingText,
    fixture.csrf,
  );
  expect(
    valid &&
      sends === 1 &&
      saved.fields.learningGoals === fixture.teachingText &&
      saved.fields.instructions === null,
  ).toBe(true);
  courseUnitCheckpoint("preparation-patch");
});

it("preparation rejects malformed readiness and never follows unsafe blocker links", async () => {
  const { data, json } = preparationFixture();
  let reads = 0;
  server.use(
    http.get("/api/v1/courses/course_1", () => {
      reads++;
      return json({ data });
    }),
  );
  for (const link of [
    null,
    "https://example.test",
    "/api/v1/courses/other",
    "/api/v1/courses/course_1?x=1",
    "javascript:void(0)",
  ]) {
    const original = data.attributes.readiness.blockers;
    server.use(
      http.get("/api/v1/courses/course_1", () => {
        reads++;
        return json({
          data: {
            ...data,
            attributes: {
              ...data.attributes,
              readiness: {
                state: "inactive_incomplete",
                blockers: [{ id: "learning_goals", link }],
              },
            },
          },
        });
      }),
    );
    const result = await getCoursePreparation(
      toCourseId("course_1"),
      new AbortController().signal,
    );
    expect(
      result.readiness.blockers[0]?.field === null && original.length === 2,
    ).toBe(true);
  }
  expect(reads === 5).toBe(true);
  courseUnitCheckpoint("preparation-links");
  server.use(
    http.get("/api/v1/courses/course_1", () =>
      json({
        data: {
          ...data,
          attributes: {
            ...data.attributes,
            readiness: { state: "unknown", blockers: [] },
          },
        },
      }),
    ),
  );
  expect(
    await getCoursePreparation(
      toCourseId("course_1"),
      new AbortController().signal,
    ).then(
      () => false,
      (error: unknown) => error instanceof ApiProtocolError,
    ),
  ).toBe(true);
});

it("preparation lost PATCH response never replays and preserves error identity", async () => {
  const { fixture, json } = preparationFixture();
  let sends = 0;
  server.use(
    http.patch("/api/v1/courses/course_1", () => {
      sends++;
      return HttpResponse.error();
    }),
  );
  const send = () =>
    updateCourseTeachingField(
      toCourseId("course_1"),
      "instructions",
      fixture.teachingText,
      fixture.csrf,
    );
  expect(
    await send().then(
      () => false,
      (error: unknown) => error instanceof ApiTransportError,
    ),
  ).toBe(true);
  expect(sends === 1).toBe(true);
  courseUnitCheckpoint("preparation-unknown");
  server.use(
    http.patch("/api/v1/courses/course_1", () => {
      sends++;
      return json(
        {
          errors: [
            { status: "422", code: "course_invalid", detail: fixture.rawError },
          ],
        },
        422,
      );
    }),
  );
  expect(
    await send().then(
      () => false,
      (error: unknown) =>
        error instanceof ApiHttpError &&
        error.disclosure.body.includes(fixture.rawError),
    ),
  ).toBe(true);
  expect(sends === 2).toBe(true);
  courseUnitCheckpoint("preparation-error");
});

it("sends one atomic create and reads the persisted minimized course", async () => {
  const fixture = courseUnitFixture();
  const data = {
    type: "courses",
    id: "course_1",
    attributes: {
      name: fixture.name,
      state: "inactive",
      created_at: "2026-10-08T10:00:00.000000Z",
      description: "discarded",
      readiness: {},
    },
    relationships: { supervisors: { data: [{ type: "users", id: "s1" }] } },
  };
  let sends = 0;
  let requestValid = false;
  server.use(
    http.post("/api/v1/courses", async ({ request }) => {
      sends++;
      const body: unknown = await request.json();
      requestValid =
        JSON.stringify(body) ===
          JSON.stringify({
            data: {
              type: "courses",
              attributes: { name: fixture.name },
              relationships: {
                supervisors: { data: [{ type: "users", id: "s1" }] },
              },
            },
          }) && request.headers.get("X-CSRF-Token") === fixture.csrf;
      return HttpResponse.json(
        { data },
        { status: 201, headers: { "Content-Type": jsonApiMediaType } },
      );
    }),
    http.get("/api/v1/courses/course_1", () =>
      HttpResponse.json(
        { data },
        { headers: { "Content-Type": jsonApiMediaType } },
      ),
    ),
  );
  const course = await createCourse(
    fixture.name,
    [toAccountId("s1")],
    fixture.csrf,
  );
  expect(
    requestValid &&
      sends === 1 &&
      course.name === fixture.name &&
      course.supervisors[0] === "s1",
  ).toBe(true);
  courseUnitCheckpoint("atomic-payload");
  const persisted = await getCourse(
    toCourseId("course_1"),
    new AbortController().signal,
  );
  expect(
    persisted.name === fixture.name &&
      !("readiness" in persisted) &&
      !("description" in persisted),
  ).toBe(true);
  courseUnitCheckpoint("persisted-projection");
});

it("does not replay a create after response loss or malformed success", async () => {
  const fixture = courseUnitFixture();
  let sends = 0;
  server.use(
    http.post("/api/v1/courses", () => {
      sends++;
      return HttpResponse.error();
    }),
  );
  expect(
    await createCourse(fixture.name, [toAccountId("s1")], fixture.csrf).then(
      () => false,
      (error: unknown) => error instanceof ApiTransportError,
    ),
  ).toBe(true);
  expect(sends === 1).toBe(true);
  courseUnitCheckpoint("lost-response");
  server.use(
    http.post("/api/v1/courses", () => {
      sends++;
      return HttpResponse.json(
        { data: null },
        { status: 201, headers: { "Content-Type": jsonApiMediaType } },
      );
    }),
  );
  expect(
    await createCourse(fixture.name, [toAccountId("s1")], fixture.csrf).then(
      () => false,
      (error: unknown) => error instanceof ApiProtocolError,
    ),
  ).toBe(true);
  expect(sends === 2).toBe(true);
  courseUnitCheckpoint("malformed-success");
});
