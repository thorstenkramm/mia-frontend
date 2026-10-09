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
export type CourseTeachingField =
  "description" | "curriculum" | "learningGoals" | "instructions" | "language";
const teachingAttributes = {
  description: "description",
  curriculum: "curriculum",
  learningGoals: "learning_goals",
  instructions: "ai_tutor_instructions",
  language: "language",
} as const;
const blockerId = z.enum([
  "learning_goals",
  "ai_tutor_instructions",
  "language",
  "supervisor_presence",
  "qualifying_material",
]);
const activationBlockerId = z.enum([
  ...blockerId.options,
  "course_already_active",
  "assigned_supervisor_required",
]);
const preparationSchema = courseSchema.extend({
  attributes: courseSchema.shape.attributes.extend({
    activated_at: utcInstant.nullable(),
    deactivated_at: utcInstant.nullable(),
    description: z.string().nullable(),
    curriculum: z.string().nullable(),
    learning_goals: z.string().nullable(),
    ai_tutor_instructions: z.string().nullable(),
    language: z.string().nullable(),
    readiness: z.object({
      activation: z.object({
        eligible: z.boolean(),
        blockers: z.array(activationBlockerId),
        consequences: z.tuple([z.literal("activate_course")]),
      }),
      state: z.enum([
        "inactive_incomplete",
        "inactive_activatable",
        "active_accepting",
        "active_not_accepting",
      ]),
      blockers: z.array(
        z.object({ id: blockerId, link: z.string().nullable() }),
      ),
    }),
  }),
});
const preparationDocument = z.object({
  errors: z.never().optional(),
  data: preparationSchema,
}) satisfies z.ZodType<{
  data: CourseProjection & {
    attributes: Pick<
      CourseDocument["data"]["attributes"],
      | "name"
      | "state"
      | "created_at"
      | "description"
      | "curriculum"
      | "learning_goals"
      | "ai_tutor_instructions"
      | "language"
      | "activated_at"
      | "deactivated_at"
    > & {
      readiness: Pick<
        CourseDocument["data"]["attributes"]["readiness"],
        "state" | "blockers" | "activation"
      >;
    };
  };
}>;
export type CoursePreparation = {
  readonly course: Course;
  readonly activatedAt: number | null;
  readonly deactivatedAt: number | null;
  readonly fields: Readonly<Record<CourseTeachingField, string | null>>;
  readonly readiness: {
    readonly activation: z.infer<
      typeof preparationSchema
    >["attributes"]["readiness"]["activation"];
    readonly state: z.infer<
      typeof preparationSchema
    >["attributes"]["readiness"]["state"];
    readonly blockers: readonly {
      readonly id: z.infer<typeof blockerId>;
      readonly field: CourseTeachingField | null;
      readonly materials: boolean;
    }[];
  };
};
const path = "/api/v1/courses";

function toPreparation(
  resource: z.infer<typeof preparationSchema>,
): CoursePreparation {
  const { attributes } = resource;
  const readiness = attributes.readiness;
  const activation = readiness.activation;
  const active = attributes.state === "active";
  if (
    new Set(readiness.blockers.map((item) => item.id)).size !==
      readiness.blockers.length ||
    new Set(activation.blockers).size !== activation.blockers.length ||
    activation.eligible !== (activation.blockers.length === 0) ||
    active !== readiness.state.startsWith("active_") ||
    (active &&
      (attributes.activated_at === null ||
        attributes.deactivated_at !== null ||
        activation.eligible)) ||
    (attributes.deactivated_at !== null && attributes.activated_at === null) ||
    (activation.eligible &&
      (readiness.state !== "inactive_activatable" ||
        readiness.blockers.length !== 0)) ||
    (readiness.state === "inactive_incomplete" && activation.eligible)
  )
    throw new ApiProtocolError();
  const course = toCourse(resource);
  const fieldBlockers = {
    learning_goals: "learningGoals",
    ai_tutor_instructions: "instructions",
    language: "language",
    supervisor_presence: null,
    qualifying_material: null,
  } as const;
  return {
    course,
    activatedAt:
      attributes.activated_at === null
        ? null
        : Date.parse(attributes.activated_at),
    deactivatedAt:
      attributes.deactivated_at === null
        ? null
        : Date.parse(attributes.deactivated_at),
    fields: {
      description: attributes.description,
      curriculum: attributes.curriculum,
      learningGoals: attributes.learning_goals,
      instructions: attributes.ai_tutor_instructions,
      language: attributes.language,
    },
    readiness: {
      activation,
      state: readiness.state,
      blockers: readiness.blockers.map((item) => ({
        id: item.id,
        // API resource links never become navigation hrefs. The approved slice
        // permits only this exact course link + stable field ID mapping.
        field:
          item.link === `${path}/${encodeURIComponent(course.id)}`
            ? fieldBlockers[item.id]
            : null,
        materials:
          item.id === "qualifying_material" &&
          item.link === `${path}/${encodeURIComponent(course.id)}/materials`,
      })),
    },
  };
}
// Scope restriction only; server eligibility remains the sole prerequisite authority.
export function canFirstActivate(preparation: CoursePreparation): boolean {
  return (
    preparation.course.state === "inactive" &&
    preparation.activatedAt === null &&
    preparation.deactivatedAt === null &&
    preparation.readiness.activation.eligible
  );
}
export async function activateCourse(
  id: CourseId,
  csrfToken: string,
): Promise<CoursePreparation> {
  const response = await sendUnsafeRequest({
    method: "POST",
    path: `${path}/${encodeURIComponent(id)}/activations`,
    csrfToken,
  });
  const document = await parseJsonApiResponse(
    response,
    preparationDocument,
    200,
  );
  if (document.data.id !== id || document.data.attributes.state !== "active")
    throw new ApiProtocolError();
  return toPreparation(document.data);
}
export async function getCoursePreparation(
  id: CourseId,
  signal: AbortSignal,
): Promise<CoursePreparation> {
  const document = await readJsonApi({
    path: `${path}/${encodeURIComponent(id)}`,
    schema: preparationDocument,
    initiator: "user",
    signal,
  });
  if (document.data.id !== id) throw new ApiProtocolError();
  return toPreparation(document.data);
}
export async function updateCourseTeachingField(
  id: CourseId,
  field: CourseTeachingField,
  value: string | null,
  csrfToken: string,
): Promise<CoursePreparation> {
  const body = {
    data: {
      type: "courses",
      id,
      attributes: { [teachingAttributes[field]]: value },
    },
  } satisfies operations["updateCourse"]["requestBody"]["content"][typeof jsonApiMediaType];
  const response = await sendUnsafeRequest({
    method: "PATCH",
    path: `${path}/${encodeURIComponent(id)}`,
    csrfToken,
    body: JSON.stringify(body),
  });
  const document = await parseJsonApiResponse(
    response,
    preparationDocument,
    200,
  );
  if (document.data.id !== id) throw new ApiProtocolError();
  return toPreparation(document.data);
}

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
