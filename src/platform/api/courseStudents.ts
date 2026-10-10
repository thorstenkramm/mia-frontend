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
  toAccountId,
  toCourseId,
  type AccountId,
  type CourseId,
} from "./entry";
import { collectionNavigation, collectionQuery } from "./collectionNavigation";

declare const membershipBrand: unique symbol;
export type MembershipId = string & {
  readonly [membershipBrand]: "MembershipId";
};
const membershipSchema = z.object({
  type: z.literal("course-students"),
  id: resourceId,
  attributes: z.object({ username: z.string().min(1), joined_at: utcInstant }),
  relationships: z.object({
    course: z.object({
      data: z.object({ type: z.literal("courses"), id: resourceId }),
    }),
    student: z.object({
      data: z.object({ type: z.literal("users"), id: resourceId }),
    }),
  }),
});
type Document =
  operations["addCourseStudent"]["responses"][201]["content"][typeof jsonApiMediaType];
const documentSchema = z.object({
  errors: z.never().optional(),
  data: membershipSchema,
}) satisfies z.ZodType<Document>;
const pageSchema = z.object({
  errors: z.never().optional(),
  data: z.array(membershipSchema).max(25),
  meta: z.object({ has_more: z.boolean() }),
  links: z
    .object({
      prev: z.string().exactOptional(),
      next: z.string().exactOptional(),
    })
    .exactOptional(),
});
export type StudentMembership = {
  readonly id: MembershipId;
  readonly courseId: CourseId;
  readonly studentId: AccountId;
  readonly username: string;
  readonly joinedAt: number;
};
export type StudentPage = {
  readonly memberships: readonly StudentMembership[];
  readonly offset: number;
  readonly previousOffset: number | null;
  readonly nextOffset: number | null;
};
function path(id: CourseId): string {
  return `/api/v1/courses/${encodeURIComponent(id)}/students`;
}
function project(
  resource: z.infer<typeof membershipSchema>,
  course: CourseId,
  student?: AccountId,
): StudentMembership {
  if (
    resource.relationships.course.data.id !== course ||
    (student !== undefined &&
      resource.relationships.student.data.id !== student)
  )
    throw new ApiProtocolError();
  return {
    id: resource.id as MembershipId,
    courseId: toCourseId(resource.relationships.course.data.id),
    studentId: toAccountId(resource.relationships.student.data.id),
    username: resource.attributes.username,
    joinedAt: Date.parse(resource.attributes.joined_at),
  };
}
// A synchronous one-shot send: this frame never awaits with chosen credentials.
// No confirmation, client ID, correlation key or retryable request object.
export function provisionCourseStudent(
  course: CourseId,
  input: {
    readonly username: string;
    readonly temporaryPassword: string;
    readonly language: string;
    readonly country: string;
    readonly timeZone: string;
  },
  csrfToken: string,
): Promise<StudentMembership> {
  const body = {
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
  } satisfies operations["addCourseStudent"]["requestBody"]["content"][typeof jsonApiMediaType];
  return sendUnsafeRequest({
    method: "POST",
    path: path(course),
    csrfToken,
    body: JSON.stringify(body),
  })
    .then((response) => parseJsonApiResponse(response, documentSchema, 201))
    .then((document) => project(document.data, course));
}
export async function listCourseStudents(
  course: CourseId,
  offset: number,
  signal: AbortSignal,
): Promise<StudentPage> {
  const document = await readJsonApi({
    path: `${path(course)}?${collectionQuery(offset)}`,
    schema: pageSchema,
    initiator: "user",
    signal,
  });
  const memberships = document.data.map((resource) =>
    project(resource, course),
  );
  if (
    new Set(memberships.map((item) => item.id)).size !== memberships.length ||
    new Set(memberships.map((item) => item.studentId)).size !==
      memberships.length
  )
    throw new ApiProtocolError();
  return {
    memberships,
    offset,
    ...collectionNavigation(
      path(course),
      offset,
      document.meta.has_more,
      document.links,
    ),
  };
}
export async function getCourseStudentMembership(
  course: CourseId,
  student: AccountId,
  signal: AbortSignal,
): Promise<StudentMembership> {
  const document = await readJsonApi({
    path: `${path(course)}/${encodeURIComponent(student)}`,
    schema: documentSchema,
    initiator: "user",
    signal,
  });
  // Review-only removal metadata/ETag are deliberately not retained.
  return project(document.data, course, student);
}
export function isHiddenStudentFailure(error: ApiFailure): boolean {
  return (
    error.kind === "http" && [403, 404, 429].includes(error.disclosure.status)
  );
}
