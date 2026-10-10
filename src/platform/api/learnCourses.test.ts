import { http, HttpResponse } from "msw";
import { expect, it } from "vitest";
import { server } from "../../../test/server";
import {
  learnCourseDocument,
  learnMaterialRow,
} from "../../../test/learnFixtures";
import {
  courseUnitCheckpoint,
  courseUnitFixture,
} from "../../../scripts/secret-hygiene-evidence";
import { ApiProtocolError, jsonApiMediaType } from "./client";
import { toCourseId } from "./entry";
import {
  getLearnCourse,
  listApprovedCourseMaterialMetadata,
  listJoinedActiveCourses,
} from "./learnCourses";

const json = (body: unknown) =>
  new HttpResponse(JSON.stringify(body), {
    headers: { "Content-Type": jsonApiMediaType },
  });
const id = toCourseId("course_1");
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

it("Learn boundary discards brief and every non-rendered material field before state", async () => {
  const seed = courseUnitFixture();
  let wire = false;
  server.use(
    http.get("/api/v1/courses/course_1/materials", ({ request }) => {
      const params = new URL(request.url).searchParams;
      wire =
        request.method === "GET" &&
        request.headers.get("Accept") === jsonApiMediaType &&
        params.size === 2 &&
        params.get("page[limit]") === "25" &&
        params.get("page[offset]") === "0" &&
        !request.headers.has("X-CSRF-Token");
      return json({
        data: [
          learnMaterialRow(seed.name, seed.teachingText),
          learnMaterialRow(
            seed.name,
            seed.teachingText,
            "link",
            "course_1",
            "course-wide",
            "ready",
            true,
            "link",
          ),
          learnMaterialRow(
            seed.rawError,
            seed.teachingText,
            "private",
            "course_1",
            "student-private",
          ),
          learnMaterialRow(
            seed.rawError,
            seed.teachingText,
            "draft",
            "course_1",
            "course-wide",
            "draft",
          ),
          learnMaterialRow(
            seed.rawError,
            seed.teachingText,
            "unapproved",
            "course_1",
            "course-wide",
            "ready",
            false,
          ),
        ],
        meta: { has_more: false },
        included: [{ brief: seed.teachingText }],
      });
    }),
  );
  const page = await listApprovedCourseMaterialMetadata(id, 0, signal());
  expect(
    wire &&
      page.items.length === 2 &&
      page.items.every(
        (item) => Object.keys(item).sort().join() === "format,id,kind,name",
      ) &&
      !JSON.stringify(page).includes(seed.teachingText) &&
      !JSON.stringify(page).includes(seed.rawError),
  ).toBe(true);
  courseUnitCheckpoint("learn-boundary");
});

it("Learn course projection accepts student-safe empty supervisors and rejects wrong identity", async () => {
  const seed = courseUnitFixture();
  let wrong = false;
  server.use(
    http.get("/api/v1/courses/course_1", () =>
      json(
        learnCourseDocument(
          seed.name,
          seed.teachingText,
          wrong ? "other" : "course_1",
          "active",
          false,
        ),
      ),
    ),
  );
  const course = await getLearnCourse(id, signal());
  expect(
    course !== null &&
      course.name === seed.name &&
      !course.accepting &&
      Object.keys(course).sort().join() === "accepting,id,name" &&
      !JSON.stringify(course).includes(seed.teachingText),
  ).toBe(true);
  wrong = true;
  expect(await protocolRejected(getLearnCourse(id, signal()))).toBe(true);
  courseUnitCheckpoint("learn-course");
});

it("Learn joined batches advance by checked identities even when all first-page courses are inactive", async () => {
  const seed = courseUnitFixture();
  let reads = 0;
  server.use(
    http.get("/api/v1/courses/:id", ({ params }) => {
      reads++;
      return json(
        learnCourseDocument(
          seed.name,
          seed.teachingText,
          String(params.id),
          params.id === "c25" ? "active" : "inactive",
        ),
      );
    }),
  );
  const ids = Array.from({ length: 26 }, (_, i) => toCourseId(`c${i}`));
  const batch = await listJoinedActiveCourses(ids, 0, signal());
  expect(
    reads === 25 && batch.consumed === 25 && batch.courses.length === 0,
  ).toBe(true);
  const more = await listJoinedActiveCourses(ids, batch.consumed, signal());
  expect(
    reads === 26 && more.consumed === 26 && more.courses.length === 1,
  ).toBe(true);
  courseUnitCheckpoint("learn-batch");
});

it("Learn material pages retain navigation on filtered-empty pages and reject unsafe links", async () => {
  const seed = courseUnitFixture();
  let unsafe = false;
  server.use(
    http.get("/api/v1/courses/course_1/materials", () =>
      json({
        data: [
          learnMaterialRow(
            seed.name,
            seed.teachingText,
            "private",
            "course_1",
            "student-private",
          ),
        ],
        meta: { has_more: true },
        links: {
          next: unsafe
            ? "/api/v1/courses/other/materials?page[limit]=25&page[offset]=25"
            : "/api/v1/courses/course_1/materials?page[limit]=25&page[offset]=25",
        },
      }),
    ),
  );
  const page = await listApprovedCourseMaterialMetadata(id, 0, signal());
  expect(page.items.length === 0 && page.nextOffset === 25).toBe(true);
  unsafe = true;
  expect(
    await protocolRejected(listApprovedCourseMaterialMetadata(id, 0, signal())),
  ).toBe(true);
  courseUnitCheckpoint("learn-navigation");
});

it("Learn material boundary rejects cross-course duplicate and oversized documents without protected errors", async () => {
  const seed = courseUnitFixture();
  for (const rows of [
    [learnMaterialRow(seed.name, seed.teachingText, "m", "other")],
    [
      learnMaterialRow(seed.name, seed.teachingText),
      learnMaterialRow(seed.name, seed.teachingText),
    ],
    Array.from({ length: 26 }, (_, i) =>
      learnMaterialRow(seed.name, seed.teachingText, `m${i}`),
    ),
  ]) {
    server.use(
      http.get("/api/v1/courses/course_1/materials", () =>
        json({ data: rows, meta: { has_more: false } }),
      ),
    );
    expect(
      await protocolRejected(
        listApprovedCourseMaterialMetadata(id, 0, signal()),
      ),
    ).toBe(true);
  }
  courseUnitCheckpoint("learn-invalid");
});
