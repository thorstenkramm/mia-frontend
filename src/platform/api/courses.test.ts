import { http, HttpResponse } from "msw";
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
} from "./client";
import { toAccountId, toCourseId } from "./entry";
import { createCourse, getCourse } from "./courses";

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
