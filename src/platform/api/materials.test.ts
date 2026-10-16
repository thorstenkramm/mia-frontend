import { http, HttpResponse } from "msw";
import { expect, it } from "vitest";
import { server } from "../../../test/server";
import { courseUnitFixture } from "../../../test/courseUnitFixture";
import { toCourseId, toMaterialId } from "./entry";
import { jsonApiMediaType, ApiProtocolError } from "./client";
import {
  createMaterial,
  getMaterial,
  listMaterialFiles,
  matchesMaterialFormat,
  uploadAdvice,
  listMaterials,
  parseUploadedFile,
  deleteMaterialFile,
} from "./materials";

it("material create is one dispatch and relationship admission rejects cross-course data", async () => {
  const fixture = courseUnitFixture();
  const course = toCourseId("course_1");
  const id = toMaterialId("material_1");
  if (id === null) throw new Error("Invalid synthetic identity.");
  let sends = 0;
  let valid = false;
  const data = {
    type: "materials",
    id,
    attributes: {
      name: fixture.name,
      scope: "course-wide",
      kind: "worksheet",
      format: "pdf",
      state: "draft",
      approved: false,
      brief: null,
      brief_source: null,
      brief_updated_at: null,
      approved_at: null,
      failure_code: null,
      created_at: "2026-10-09T10:00:00.000000Z",
      updated_at: null,
    },
    relationships: { course: { data: { type: "courses", id: course } } },
  };
  server.use(
    http.post("/api/v1/courses/course_1/materials", async ({ request }) => {
      sends++;
      const body: unknown = await request.json();
      valid =
        JSON.stringify(body) ===
          JSON.stringify({
            data: {
              type: "materials",
              attributes: {
                name: fixture.name,
                kind: "worksheet",
                format: "pdf",
                scope: "course-wide",
              },
            },
          }) && request.headers.get("X-CSRF-Token") === fixture.csrf;
      return HttpResponse.json(
        { data },
        { status: 201, headers: { "Content-Type": jsonApiMediaType } },
      );
    }),
    http.get("/api/v1/materials/material_1", () =>
      HttpResponse.json(
        { data },
        { headers: { "Content-Type": jsonApiMediaType } },
      ),
    ),
  );
  const saved = await createMaterial(
    course,
    { name: fixture.name, kind: "worksheet", format: "pdf" },
    fixture.csrf,
  );
  expect(
    valid &&
      sends === 1 &&
      saved.name === fixture.name &&
      saved.courseId === course,
  ).toBe(true);
  let rejected = false;
  try {
    await getMaterial(toCourseId("other"), id, new AbortController().signal);
  } catch (error) {
    rejected = error instanceof ApiProtocolError;
  }
  expect(rejected).toBe(true);
});

it("material protocol validates file identity byte metadata status and scoped navigation", async () => {
  const fixture = courseUnitFixture();
  const id = toMaterialId("material_1");
  if (id === null) throw new Error("Invalid synthetic identity.");
  const file = {
    type: "material-files",
    id: "file_1",
    attributes: {
      original_filename: `${fixture.name}.pdf`,
      media_type: "application/pdf",
      size_bytes: 4,
      page_count: 0,
      state: "draft",
      failure_code: null,
    },
    relationships: { material: { data: { type: "materials", id } } },
  };
  const response = (
    data: unknown,
    status = 201,
    contentType = jsonApiMediaType,
  ) =>
    new Response(JSON.stringify({ data }), {
      status,
      headers: { "Content-Type": contentType },
    });
  const saved = await parseUploadedFile(response(file), id);
  expect(
    saved.failureCode === null &&
      saved.pages === 0 &&
      saved.name === `${fixture.name}.pdf`,
  ).toBe(true);
  for (const result of [
    response(file, 200),
    response(file, 201, "application/json"),
    response({
      ...file,
      relationships: { material: { data: { type: "materials", id: "other" } } },
    }),
    response({ ...file, attributes: { ...file.attributes, size_bytes: -1 } }),
  ]) {
    let rejected = false;
    try {
      await parseUploadedFile(result, id);
    } catch (error) {
      rejected = error instanceof ApiProtocolError;
    }
    expect(rejected).toBe(true);
  }
  let noQuery = false;
  server.use(
    http.get("/api/v1/materials/material_1/files", ({ request }) => {
      noQuery = new URL(request.url).search === "";
      return HttpResponse.json(
        { data: [file, file] },
        { headers: { "Content-Type": jsonApiMediaType } },
      );
    }),
    http.get("/api/v1/courses/course_1/materials", () =>
      HttpResponse.json(
        {
          data: [],
          meta: { has_more: true },
          links: {
            next: "/api/v1/courses/other/materials?page[limit]=25&page[offset]=25",
          },
        },
        { headers: { "Content-Type": jsonApiMediaType } },
      ),
    ),
    http.delete(
      "/api/v1/material-files/file_1",
      () => new HttpResponse(null, { status: 200 }),
    ),
  );
  for (const operation of [
    () => listMaterialFiles(id, new AbortController().signal),
    () =>
      listMaterials(toCourseId("course_1"), 0, new AbortController().signal),
    () => deleteMaterialFile(saved.id, fixture.csrf),
  ]) {
    let rejected = false;
    try {
      await operation();
    } catch (error) {
      rejected = error instanceof ApiProtocolError;
    }
    expect(rejected).toBe(true);
  }
  expect(noQuery).toBe(true);
});

it("material files reject null collections and advice never decides server acceptance", async () => {
  const id = toMaterialId("material_1");
  if (id === null) throw new Error("Invalid synthetic identity.");
  server.use(
    http.get("/api/v1/materials/material_1/files", () =>
      HttpResponse.json(
        { data: null },
        { headers: { "Content-Type": jsonApiMediaType } },
      ),
    ),
  );
  let rejected = false;
  try {
    await listMaterialFiles(id, new AbortController().signal);
  } catch (error) {
    rejected = error instanceof ApiProtocolError;
  }
  expect(rejected).toBe(true);
  expect(uploadAdvice(104857601, 209715201, 201).fileDefaultExceeded).toBe(
    true,
  );
  expect(
    matchesMaterialFormat({ name: "synthetic.PDF", type: "" }, "pdf"),
  ).toBe(true);
  expect(
    matchesMaterialFormat({ name: "synthetic.png", type: "image/png" }, "pdf"),
  ).toBe(false);
});
