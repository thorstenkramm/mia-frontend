import { z } from "zod";
import { ApiProtocolError, readJsonApi, type ApiFailure } from "./client";
import {
  resourceId,
  toCourseId,
  toMaterialId,
  type CourseId,
  type MaterialId,
} from "./entry";
import {
  collectionDocument,
  collectionNavigation,
  collectionQuery,
} from "./collectionNavigation";

// BCG-020, owner exception 2026-10-10: only joined scope IDs are read.
// Separate from the staff parser; student-safe getCourse may omit supervisors.
// BCG-011 Story 6.1 slice: `readiness.new_session` is the server-authored
// student-safe new-session eligibility; nothing else is reconstructed locally.
const newSessionBlockers = z.enum([
  "learning_goals",
  "ai_tutor_instructions",
  "language",
  "supervisor_presence",
  "qualifying_material",
  "course_inactive",
  "course_not_ready",
  "course_membership_required",
  "active_tutoring_session",
]);
export type NewSessionBlocker = z.infer<typeof newSessionBlockers>;
export type NewSessionEligibility = {
  readonly eligible: boolean;
  readonly blockers: readonly NewSessionBlocker[];
};
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
        new_session: z.object({
          eligible: z.boolean(),
          blockers: z.array(newSessionBlockers),
          consequences: z.tuple([z.literal("start_tutoring_session")]),
        }),
      }),
    }),
  }),
});
export type LearnCourse = {
  readonly id: CourseId;
  readonly name: string;
  readonly accepting: boolean;
  readonly newSession: NewSessionEligibility;
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
      data.attributes.readiness.state.startsWith("active_") ||
    (data.attributes.readiness.new_session.eligible &&
      data.attributes.readiness.new_session.blockers.length > 0)
  )
    throw new ApiProtocolError();
  return data.attributes.state === "inactive"
    ? null
    : {
        id: toCourseId(data.id),
        name: data.attributes.name,
        accepting: data.attributes.readiness.state === "active_accepting",
        newSession: {
          eligible: data.attributes.readiness.new_session.eligible,
          blockers: data.attributes.readiness.new_session.blockers,
        },
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
  readonly id: MaterialId;
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
    schema: collectionDocument(metadataRow),
  });
  if (new Set(doc.data.map((row) => row.id)).size !== doc.data.length)
    throw new ApiProtocolError();
  const items: LearnMaterialMetadata[] = [];
  for (const row of doc.data) {
    if (row.relationships.course.data.id !== course)
      throw new ApiProtocolError();
    const { attributes: a } = row;
    if (a.scope !== "course-wide" || a.state !== "ready" || !a.approved)
      continue;
    const id = toMaterialId(row.id);
    // A rendered row identity must be a valid opaque material ID.
    if (id === null) throw new ApiProtocolError();
    items.push({ id, name: a.name, kind: a.kind, format: a.format });
  }
  return {
    items,
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
