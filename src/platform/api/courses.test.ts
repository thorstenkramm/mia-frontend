import { http, HttpResponse, type JsonBodyType } from "msw";
import { expect, it } from "vitest";
import { server } from "../../../test/server";
import { courseUnitFixture } from "../../../test/courseUnitFixture";
import {
  ApiProtocolError,
  ApiTransportError,
  jsonApiMediaType,
  ApiHttpError,
} from "./client";
import { toAccountId, toCourseId } from "./entry";
import {
  createCourse,
  activateCourse,
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
      activated_at: null,
      deactivated_at: null,
      created_at: "2026-10-08T10:00:00.000000Z",
      description: fixture.teachingText,
      curriculum: null,
      learning_goals: null,
      ai_tutor_instructions: null,
      language: null,
      readiness: {
        activation: {
          eligible: false,
          blockers: ["learning_goals", "qualifying_material"],
          consequences: ["activate_course"],
        },
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
                activation: data.attributes.readiness.activation,
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
  const persisted = await getCourse(
    toCourseId("course_1"),
    new AbortController().signal,
  );
  expect(
    persisted.name === fixture.name &&
      !("readiness" in persisted) &&
      !("description" in persisted),
  ).toBe(true);
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
});

it("activation sends a single bodyless contract request and validates active persisted truth", async () => {
  const { fixture, data, json } = preparationFixture();
  let sends = 0,
    valid = false;
  server.use(
    http.post("/api/v1/courses/course_1/activations", async ({ request }) => {
      sends++;
      valid =
        (await request.text()) === "" &&
        request.headers.get("Accept") === jsonApiMediaType &&
        request.headers.get("X-CSRF-Token") === fixture.csrf &&
        !request.headers.has("Content-Type") &&
        !request.headers.has("If-Match") &&
        !request.headers.has("Idempotency-Key");
      return json({
        data: {
          ...data,
          attributes: {
            ...data.attributes,
            state: "active",
            activated_at: "2026-10-09T12:00:00.000000Z",
            readiness: {
              ...data.attributes.readiness,
              state: "active_not_accepting",
              activation: {
                eligible: false,
                blockers: ["course_already_active", "qualifying_material"],
                consequences: ["activate_course"],
              },
            },
          },
        },
      });
    }),
  );
  const result = await activateCourse(toCourseId("course_1"), fixture.csrf);
  expect(
    valid &&
      sends === 1 &&
      result.course.state === "active" &&
      result.readiness.state === "active_not_accepting",
  ).toBe(true);
});

it("activation rejects contradictory protocol success without replay", async () => {
  const { fixture, data, json } = preparationFixture();
  let sends = 0;
  const active = {
    ...data,
    attributes: {
      ...data.attributes,
      state: "active",
      activated_at: "2026-10-09T12:00:00.000000Z",
      readiness: {
        state: "active_accepting",
        blockers: [],
        activation: {
          eligible: false,
          blockers: ["course_already_active"],
          consequences: ["activate_course"],
        },
      },
    },
  };
  for (const response of [
    json({ data }),
    json({ data: { ...active, id: "other" } }),
    json({ data: null }),
    json({ data: active }, 201),
    HttpResponse.json({ data: active }),
    json({
      data: {
        ...active,
        attributes: { ...active.attributes, activated_at: null },
      },
    }),
  ]) {
    server.use(
      http.post("/api/v1/courses/course_1/activations", () => {
        sends++;
        return response;
      }),
    );
    expect(
      await activateCourse(toCourseId("course_1"), fixture.csrf).then(
        () => false,
        (error: unknown) => error instanceof ApiProtocolError,
      ),
    ).toBe(true);
  }
  expect(sends === 6).toBe(true);
});

it("readiness retains server false independently of empty display blockers and rejects malformed action facts", async () => {
  const { data, json } = preparationFixture();
  const read = () =>
    getCoursePreparation(toCourseId("course_1"), new AbortController().signal);
  const attributes = {
    ...data.attributes,
    readiness: { ...data.attributes.readiness, blockers: [] },
  };
  server.use(
    http.get("/api/v1/courses/course_1", () =>
      json({ data: { ...data, attributes } }),
    ),
  );
  expect(!(await read()).readiness.activation.eligible).toBe(true);
  for (const activation of [
    undefined,
    {
      eligible: true,
      blockers: ["language"],
      consequences: ["activate_course"],
    },
    {
      eligible: false,
      blockers: ["language", "language"],
      consequences: ["activate_course"],
    },
    {
      eligible: false,
      blockers: ["invented"],
      consequences: ["activate_course"],
    },
    {
      eligible: false,
      blockers: ["language"],
      consequences: ["delete_course"],
    },
  ]) {
    server.use(
      http.get("/api/v1/courses/course_1", () =>
        json({
          data: {
            ...data,
            attributes: {
              ...attributes,
              readiness: { ...attributes.readiness, activation },
            },
          },
        }),
      ),
    );
    expect(
      await read().then(
        () => false,
        (error: unknown) => error instanceof ApiProtocolError,
      ),
    ).toBe(true);
  }
  for (const link of [
    null,
    "/api/v1/courses/other/materials",
    "/api/v1/courses/course_1/materials?x=1",
    "/api/v1/courses/course_1/materials#x",
    "https://example.test",
    "javascript:void(0)",
    "/api/v1/courses/course_1/materials",
  ]) {
    server.use(
      http.get("/api/v1/courses/course_1", () =>
        json({
          data: {
            ...data,
            attributes: {
              ...attributes,
              readiness: {
                ...attributes.readiness,
                blockers: [{ id: "qualifying_material", link }],
              },
            },
          },
        }),
      ),
    );
    expect(
      (await read()).readiness.blockers[0]?.materials ===
        (link === "/api/v1/courses/course_1/materials"),
    ).toBe(true);
  }
});
