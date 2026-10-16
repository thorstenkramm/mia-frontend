import { http, HttpResponse } from "msw";
import { expect, it } from "vitest";
import { server } from "../../../test/server";
import { courseUnitFixture } from "../../../test/courseUnitFixture";
import { ApiProtocolError, jsonApiMediaType } from "./client";
import { toAccountId, toCourseId } from "./entry";
import {
  provisionCourseStudent,
  listCourseStudents,
  getCourseStudentMembership,
} from "./courseStudents";

const course = toCourseId("course_1");
const student = toAccountId("student_1");
const path = "/api/v1/courses/course_1/students";
function fixture() {
  const seed = courseUnitFixture();
  const data = {
    type: "course-students",
    id: "membership_1",
    attributes: {
      username: seed.username,
      joined_at: "2026-10-10T10:00:00.000000Z",
    },
    relationships: {
      course: { data: { type: "courses", id: course } },
      student: { data: { type: "users", id: student } },
    },
  };
  const input = {
    username: seed.username,
    temporaryPassword: ` ${seed.teachingText} 密 `,
    language: "de-DE",
    country: "DE",
    timeZone: "Europe/Berlin",
  };
  return { seed, data, input };
}
const json = (body: unknown, status = 200, media = jsonApiMediaType) =>
  new HttpResponse(JSON.stringify(body), {
    status,
    headers: { "Content-Type": media, "Cache-Control": "no-store" },
  });

it("student transport sends one exact provision branch and retains only relationship truth", async () => {
  const { seed, data, input } = fixture();
  let sends = 0,
    valid = false;
  server.use(
    http.post(path, async ({ request }) => {
      sends++;
      valid =
        request.headers.get("Accept") === jsonApiMediaType &&
        request.headers.get("Content-Type") === jsonApiMediaType &&
        request.headers.get("X-CSRF-Token") === seed.csrf &&
        !request.headers.has("If-Match") &&
        JSON.stringify(await request.json()) ===
          JSON.stringify({
            data: {
              type: "course-students",
              attributes: {
                mode: "provision",
                username: input.username,
                temporary_password: input.temporaryPassword,
                preferred_language: input.language,
                country: input.country,
                time_zone: input.timeZone,
              },
            },
          });
      return json(
        {
          data: {
            ...data,
            attributes: {
              ...data.attributes,
              remove: { secret: seed.rawError },
            },
          },
        },
        201,
      );
    }),
  );
  const saved = await provisionCourseStudent(course, input, seed.csrf);
  expect(
    valid &&
      sends === 1 &&
      saved.studentId === student &&
      String(saved.id) !== String(saved.studentId) &&
      Object.keys(saved).sort().join() ===
        "courseId,id,joinedAt,studentId,username" &&
      !JSON.stringify(saved).includes(input.temporaryPassword),
  ).toBe(true);
});

it("student transport rejects ambiguous successes without unsafe replay", async () => {
  const { seed, data, input } = fixture();
  let sends = 0;
  for (const response of [
    () => HttpResponse.error(),
    () => json({ data }, 200),
    () => json({ data }, 201, "application/json"),
    () => json({ data: null }, 201),
    () =>
      json(
        {
          data: {
            ...data,
            relationships: {
              ...data.relationships,
              course: { data: { type: "courses", id: "other" } },
            },
          },
        },
        201,
      ),
    () => json({ errors: [{ status: "503", detail: seed.rawError }] }, 503),
  ]) {
    server.use(
      http.post(path, () => {
        sends++;
        return response();
      }),
    );
    let failed = false;
    try {
      await provisionCourseStudent(course, input, seed.csrf);
    } catch {
      failed = true;
    }
    expect(failed).toBe(true);
  }
  expect(sends === 6).toBe(true);
});

it("student roster bounds pages and rejects unsafe navigation and duplicate identities", async () => {
  const { data } = fixture();
  const link = (offset: number) =>
    `${path}?page[limit]=25&page[offset]=${offset}`;
  let valid = false;
  server.use(
    http.get(path, ({ request }) => {
      const url = new URL(request.url);
      valid =
        url.searchParams.size === 2 &&
        url.searchParams.get("page[limit]") === "25" &&
        !request.headers.has("X-CSRF-Token");
      return json({
        data: [data],
        meta: { has_more: true },
        links: { next: link(25) },
      });
    }),
  );
  const page = await listCourseStudents(
    course,
    0,
    new AbortController().signal,
  );
  expect(
    valid &&
      page.nextOffset === 25 &&
      page.previousOffset === null &&
      page.memberships.length === 1,
  ).toBe(true);
  for (const body of [
    {
      data: [data],
      meta: { has_more: true },
      links: { next: "https://example.test" },
    },
    {
      data: [data],
      meta: { has_more: true },
      links: {
        next: "/api/v1/courses/other/students?page[limit]=25&page[offset]=25",
      },
    },
    {
      data: [data],
      meta: { has_more: true },
      links: { next: `${link(25)}&filter[username]=x` },
    },
    { data: [data], meta: { has_more: true }, links: { next: link(10025) } },
    { data: [data, data], meta: { has_more: false } },
    { data: Array.from({ length: 26 }, () => data), meta: { has_more: false } },
  ]) {
    server.use(http.get(path, () => json(body)));
    let rejected = false;
    try {
      await listCourseStudents(course, 0, new AbortController().signal);
    } catch (error) {
      rejected = error instanceof ApiProtocolError;
    }
    expect(rejected).toBe(true);
  }
});

it("student membership uses the users relationship and rejects mismatched pair data", async () => {
  const { data } = fixture();
  server.use(http.get(`${path}/${student}`, () => json({ data })));
  const membership = await getCourseStudentMembership(
    course,
    student,
    new AbortController().signal,
  );
  expect(
    membership.studentId === student && membership.id === "membership_1",
  ).toBe(true);
  for (const wrong of [
    {
      ...data,
      attributes: { ...data.attributes, joined_at: "2026-10-10T10:00:00Z" },
    },
    {
      ...data,
      relationships: {
        ...data.relationships,
        student: { data: { type: "users", id: "other" } },
      },
    },
  ]) {
    server.use(http.get(`${path}/${student}`, () => json({ data: wrong })));
    await expect(
      getCourseStudentMembership(course, student, new AbortController().signal),
    ).rejects.toBeInstanceOf(ApiProtocolError);
  }
});

it("student empty and previous roster pages preserve absence without fabricated totals", async () => {
  fixture();
  server.use(
    http.get(path, () =>
      json({
        data: [],
        meta: { has_more: false },
        links: { prev: `${path}?page[limit]=25&page[offset]=0` },
      }),
    ),
  );
  const page = await listCourseStudents(
    course,
    25,
    new AbortController().signal,
  );
  expect(
    page.memberships.length === 0 &&
      page.previousOffset === 0 &&
      page.nextOffset === null &&
      !("total" in page),
  ).toBe(true);
});
