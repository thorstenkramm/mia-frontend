import { http, HttpResponse } from "msw";
import { expect, it } from "vitest";
import { server } from "../../../test/server";
import { courseUnitFixture } from "../../../test/courseUnitFixture";
import { toCourseId, toMaterialId } from "./entry";
import { jsonApiMediaType, ApiProtocolError } from "./client";
import {
  approveMaterial,
  finalizeMaterial,
  revokeMaterialApproval,
  updateMaterialBrief,
  listMaterialJobs,
} from "./materials";

it("lifecycle operations use exact identities bodies media fresh CSRF and one unsafe dispatch", async () => {
  const fixture = courseUnitFixture();
  const course = toCourseId("course_1"),
    id = toMaterialId("material_1");
  if (id === null) throw new Error("Invalid synthetic identity.");
  const brief = {
    version: 1 as const,
    summary: fixture.teachingText,
    subjects: [fixture.name],
    learning_goals: null,
    sections: null,
    warnings: null,
    educational_level: null,
  };
  const material = {
    type: "materials",
    id,
    attributes: {
      name: fixture.name,
      scope: "course-wide",
      kind: "worksheet",
      format: "pdf",
      state: "ready",
      approved: false,
      brief,
      brief_source: "generated",
      brief_updated_at: null,
      approved_at: null,
      failure_code: null,
      created_at: "2026-10-09T10:00:00.000000Z",
      updated_at: null,
    },
    relationships: { course: { data: { type: "courses", id: course } } },
  };
  let sends = 0,
    valid = true,
    lose = false;
  server.use(
    http.all(
      /\/api\/v1\/materials\/material_1(?:\/finalizations|\/approvals)?$/,
      async ({ request }) => {
        sends++;
        valid &&=
          request.headers.get("X-CSRF-Token") === fixture.csrf &&
          request.headers.get("Accept") === jsonApiMediaType;
        const body = await request.text();
        if (request.method === "PATCH")
          valid &&=
            body ===
              JSON.stringify({
                data: {
                  type: "materials",
                  id,
                  attributes: {
                    brief: {
                      version: 1,
                      summary: brief.summary,
                      subjects: brief.subjects,
                      educational_level: null,
                    },
                  },
                },
              }) && request.headers.get("Content-Type") === jsonApiMediaType;
        else valid &&= body === "";
        if (lose) return HttpResponse.error();
        return HttpResponse.json(
          { data: material },
          { headers: { "Content-Type": jsonApiMediaType } },
        );
      },
    ),
  );
  await finalizeMaterial(course, id, fixture.csrf);
  await updateMaterialBrief(course, id, brief, fixture.csrf);
  await approveMaterial(course, id, fixture.csrf);
  await revokeMaterialApproval(course, id, fixture.csrf);
  expect(valid && sends === 4).toBe(true);
  lose = true;
  try {
    await approveMaterial(course, id, fixture.csrf);
  } catch {
    /* Expected transport loss, checked by dispatch count. */
  }
  expect(sends === 5).toBe(true);
});
it("safe jobs follow scoped links and reject diagnostics malformed collections and cross-scope navigation", async () => {
  const id = toMaterialId("material_1");
  if (id === null) throw new Error("Invalid synthetic identity.");
  const job = {
    type: "jobs",
    id: "job_1",
    attributes: {
      job_type: "material-brief",
      subject_type: "material",
      subject_id: id,
      state: "queued",
      attempt_count: 1,
      created_at: "2026-10-09T10:00:00.000000Z",
      started_at: null,
      finished_at: null,
    },
  };
  let diagnostics = false;
  server.use(
    http.get("/api/v1/materials/material_1/jobs", () =>
      HttpResponse.json(
        {
          data: [
            {
              ...job,
              attributes: {
                ...job.attributes,
                ...(diagnostics ? { failure_code: "not-allowed" } : {}),
              },
            },
          ],
          meta: { has_more: true },
          links: {
            next: "/api/v1/materials/material_1/jobs?page[limit]=25&page[offset]=25",
          },
        },
        { headers: { "Content-Type": jsonApiMediaType } },
      ),
    ),
  );
  const page = await listMaterialJobs(id, 0, new AbortController().signal);
  expect(
    page.nextOffset === 25 &&
      page.items[0]?.state === "queued" &&
      Object.keys(page.items[0] ?? {}).join(",") === "id,state,attempts",
  ).toBe(true);
  diagnostics = true;
  let rejected = false;
  try {
    await listMaterialJobs(id, 0, new AbortController().signal);
  } catch (error) {
    rejected = error instanceof ApiProtocolError;
  }
  expect(rejected).toBe(true);
});
