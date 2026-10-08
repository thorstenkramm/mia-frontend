import { z } from "zod";
import type { operations } from "./generated";
import {
  ApiProtocolError,
  jsonApiMediaType,
  parseJsonApiResponse,
  readJsonApi,
  sendUnsafeRequest,
  type ApiFailure,
} from "./client";
import {
  resourceId,
  utcInstant,
  toCourseId,
  toAccountId,
  type CourseId,
  type AccountId,
} from "./entry";
import { collectionNavigation, collectionQuery } from "./collectionNavigation";

// Parse only this surface's projection. Unused teaching/readiness/deletion fields
// are stripped at the API boundary, never passed into a feature or retained.
const courseSchema = z.object({
  type: z.literal("courses"),
  id: resourceId,
  attributes: z.object({
    name: z.string(),
    state: z.enum(["inactive", "active"]),
    created_at: utcInstant,
  }),
  relationships: z.object({
    supervisors: z.object({
      data: z
        .array(z.object({ type: z.literal("users"), id: resourceId }))
        .min(1),
    }),
  }),
});
type CourseDocument =
  operations["getCourse"]["responses"][200]["content"][typeof jsonApiMediaType];
// The minimized schema deliberately validates the view, not unused teaching fields.
type CourseProjection = Pick<
  CourseDocument["data"],
  "type" | "id" | "relationships"
> & {
  attributes: Pick<
    CourseDocument["data"]["attributes"],
    "name" | "state" | "created_at"
  >;
};
const documentSchema = z.object({
  errors: z.never().optional(),
  data: courseSchema,
}) satisfies z.ZodType<{ data: CourseProjection }>;
type CourseCollection =
  operations["listCourses"]["responses"][200]["content"][typeof jsonApiMediaType];
const pageSchema = z.object({
  errors: z.never().optional(),
  data: z.array(courseSchema).max(25),
  meta: z.object({ has_more: z.boolean() }),
  links: z
    .object({
      prev: z.string().exactOptional(),
      next: z.string().exactOptional(),
    })
    .exactOptional(),
}) satisfies z.ZodType<
  Pick<CourseCollection, "meta" | "links"> & { data: CourseProjection[] }
>;
export type Course = {
  readonly id: CourseId;
  readonly name: string;
  readonly state: "inactive" | "active";
  readonly supervisors: readonly AccountId[];
  readonly createdAt: number;
};
export type CoursePage = {
  readonly courses: readonly Course[];
  readonly offset: number;
  readonly previousOffset: number | null;
  readonly nextOffset: number | null;
};
const path = "/api/v1/courses";

function toCourse(resource: z.infer<typeof courseSchema>): Course {
  const supervisors = resource.relationships.supervisors.data.map((user) =>
    toAccountId(user.id),
  );
  if (new Set(supervisors).size !== supervisors.length)
    throw new ApiProtocolError();
  return {
    id: toCourseId(resource.id),
    name: resource.attributes.name,
    state: resource.attributes.state,
    supervisors,
    createdAt: Date.parse(resource.attributes.created_at),
  };
}
export async function listCourses(
  offset: number,
  signal: AbortSignal,
): Promise<CoursePage> {
  const document = await readJsonApi({
    path: `${path}?${collectionQuery(offset)}`,
    schema: pageSchema,
    initiator: "user",
    signal,
  });
  if (
    new Set(document.data.map((course) => course.id)).size !==
    document.data.length
  )
    throw new ApiProtocolError();
  return {
    courses: document.data.map(toCourse),
    offset,
    ...collectionNavigation(
      path,
      offset,
      document.meta.has_more,
      document.links,
    ),
  };
}
export async function getCourse(
  id: CourseId,
  signal: AbortSignal,
): Promise<Course> {
  const document = await readJsonApi({
    path: `${path}/${encodeURIComponent(id)}`,
    schema: documentSchema,
    initiator: "user",
    signal,
  });
  if (document.data.id !== id) throw new ApiProtocolError();
  return toCourse(document.data);
}
export async function createCourse(
  name: string,
  supervisors: readonly AccountId[],
  csrfToken: string,
): Promise<Course> {
  const body = {
    data: {
      type: "courses",
      attributes: { name },
      relationships: {
        supervisors: {
          data: supervisors.map((id) => ({ type: "users" as const, id })),
        },
      },
    },
  } satisfies operations["createCourse"]["requestBody"]["content"][typeof jsonApiMediaType];
  const response = await sendUnsafeRequest({
    method: "POST",
    path,
    csrfToken,
    body: JSON.stringify(body),
  });
  const document = await parseJsonApiResponse(response, documentSchema, 201);
  const course = toCourse(document.data);
  if (
    course.state !== "inactive" ||
    course.supervisors.length !== supervisors.length ||
    supervisors.some((id) => !course.supervisors.includes(id))
  )
    throw new ApiProtocolError();
  return course;
}
export function isHiddenCourseFailure(failure: ApiFailure): boolean {
  return (
    failure.kind === "http" &&
    (failure.disclosure.status === 404 ||
      failure.disclosure.status === 429 ||
      (failure.disclosure.status === 403 &&
        (failure.code === "course_unauthorized" ||
          failure.code === "user_administration_unauthorized")))
  );
}
