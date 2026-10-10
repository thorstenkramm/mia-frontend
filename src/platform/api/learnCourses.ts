import { z } from "zod";
import { ApiProtocolError, readJsonApi, type ApiFailure } from "./client";
import { resourceId, toCourseId, toMaterialId, type CourseId } from "./entry";
import { collectionNavigation, collectionQuery } from "./collectionNavigation";

// BCG-020, owner exception 2026-10-10: only joined scope IDs are read.
// Separate from the staff parser; student-safe getCourse may omit supervisors.
const courseDocument = z.object({
  errors: z.never().optional(),
  data: z.object({
    type: z.literal("courses"),
    id: resourceId,
    attributes: z.object({
      name: z.string(),
      state: z.enum(["inactive", "active"]),
      readiness: z.object({
        state: z.enum([
          "inactive_incomplete",
          "inactive_activatable",
          "active_accepting",
          "active_not_accepting",
        ]),
      }),
    }),
  }),
});
export type LearnCourse = {
  readonly id: CourseId;
  readonly name: string;
  readonly accepting: boolean;
};
export async function getLearnCourse(
  id: CourseId,
  signal: AbortSignal,
): Promise<LearnCourse | null> {
  const { data } = await readJsonApi({
    path: `/api/v1/courses/${encodeURIComponent(id)}`,
    schema: courseDocument,
    initiator: "user",
    signal,
  });
  if (
    data.id !== id ||
    (data.attributes.state === "active") !==
      data.attributes.readiness.state.startsWith("active_")
  )
    throw new ApiProtocolError();
  return data.attributes.state === "inactive"
    ? null
    : {
        id: toCourseId(data.id),
        name: data.attributes.name,
        accepting: data.attributes.readiness.state === "active_accepting",
      };
}
export type JoinedCourseBatch = {
  readonly courses: readonly LearnCourse[];
  readonly consumed: number;
};
export async function listJoinedActiveCourses(
  ids: readonly CourseId[],
  offset: number,
  signal: AbortSignal,
): Promise<JoinedCourseBatch> {
  const courses: LearnCourse[] = [];
  const batch = ids.slice(offset, offset + 25);
  for (const id of batch) {
    const course = await getLearnCourse(id, signal);
    if (course !== null) courses.push(course);
  }
  return { courses, consumed: offset + batch.length };
}

// BCG-020 mitigation: NEVER parse broad Material or its brief. Nested objects
// strip every unused field at the transport boundary. Eligibility/binding are
// checked here; only rendered metadata plus opaque row identity leave it.
const metadataRow = z.object({
  type: z.literal("materials"),
  id: resourceId,
  attributes: z.object({
    name: z.string(),
    kind: z.enum(["text-book", "exam", "worksheet", "website", "youtube"]),
    format: z.enum(["pdf", "jpeg", "png", "text", "markdown", "docx", "link"]),
    scope: z.enum(["course-wide", "student-private"]),
    state: z.enum(["draft", "processing", "ready", "failed"]),
    approved: z.boolean(),
  }),
  relationships: z.object({
    course: z.object({
      data: z.object({ type: z.literal("courses"), id: resourceId }),
    }),
  }),
});
export type LearnMaterialMetadata = {
  readonly id: ReturnType<typeof toMaterialId>;
  readonly name: string;
  readonly kind: z.infer<typeof metadataRow>["attributes"]["kind"];
  readonly format: z.infer<typeof metadataRow>["attributes"]["format"];
};
export type LearnMaterialPage = {
  readonly items: readonly LearnMaterialMetadata[];
  readonly offset: number;
  readonly previousOffset: number | null;
  readonly nextOffset: number | null;
};
export async function listApprovedCourseMaterialMetadata(
  course: CourseId,
  offset: number,
  signal: AbortSignal,
): Promise<LearnMaterialPage> {
  const path = `/api/v1/courses/${encodeURIComponent(course)}/materials`;
  const doc = await readJsonApi({
    path: `${path}?${collectionQuery(offset)}`,
    initiator: "user",
    signal,
    schema: z.object({
      errors: z.never().optional(),
      data: z.array(metadataRow).max(25),
      meta: z.object({ has_more: z.boolean() }),
      links: z
        .object({
          next: z.string().exactOptional(),
          prev: z.string().exactOptional(),
        })
        .exactOptional(),
    }),
  });
  if (
    new Set(doc.data.map((row) => row.id)).size !== doc.data.length ||
    doc.data.some((row) => row.relationships.course.data.id !== course)
  )
    throw new ApiProtocolError();
  return {
    items: doc.data
      .filter(
        ({ attributes: a }) =>
          a.scope === "course-wide" && a.state === "ready" && a.approved,
      )
      .map(({ id, attributes: a }) => ({
        id: toMaterialId(id),
        name: a.name,
        kind: a.kind,
        format: a.format,
      })),
    offset,
    ...collectionNavigation(path, offset, doc.meta.has_more, doc.links),
  };
}
export function isHiddenLearnFailure(failure: ApiFailure): boolean {
  return (
    failure.kind === "http" &&
    [403, 404, 429].includes(failure.disclosure.status)
  );
}
