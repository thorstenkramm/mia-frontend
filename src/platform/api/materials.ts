import { z } from "zod";
import type { operations } from "./generated";
import {
  resourceId,
  type CourseId,
  type MaterialId,
  type MaterialFileId,
} from "./entry";
export type { MaterialId, MaterialFileId } from "./entry";
import { collectionNavigation, collectionQuery } from "./collectionNavigation";
import {
  ApiProtocolError,
  jsonApiMediaType,
  parseJsonApiResponse,
  readJsonApi,
  sendUnsafeRequest,
  type ApiFailure,
} from "./client";

const formats = ["pdf", "jpeg", "png", "text", "markdown", "docx"] as const;
export type FileFormat = (typeof formats)[number];
// BCG-018 owner exception: documented defaults/caps, NOT discovery.
export const documentedUploadContract = {
  formats,
  fileBytes: { default: 104857600, hard: 536870912 },
  materialBytes: { default: 209715200, hard: 536870912 },
  pages: { default: 1000, hard: 2000 },
  files: 200,
  imageMegapixels: { default: 40, hard: 100 },
  imageDimension: 20000,
  docx: {
    entries: 10000,
    totalBytes: 536870912,
    entryBytes: 104857600,
    ratio: 100,
  },
  accepted: {
    pdf: { extensions: [".pdf"], media: "application/pdf" },
    jpeg: { extensions: [".jpg", ".jpeg"], media: "image/jpeg" },
    png: { extensions: [".png"], media: "image/png" },
    text: { extensions: [".txt"], media: "text/plain" },
    markdown: { extensions: [".md"], media: "text/markdown" },
    docx: {
      extensions: [".docx"],
      media:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    },
  },
} as const;
export function uploadAdvice(size: number, combined: number, count: number) {
  return {
    fileDefaultExceeded: size > documentedUploadContract.fileBytes.default,
    materialDefaultExceeded:
      combined > documentedUploadContract.materialBytes.default,
    countExceeded: count > documentedUploadContract.files,
  };
}
export function matchesMaterialFormat(
  file: Pick<File, "name" | "type">,
  format: FileFormat,
): boolean {
  const accepted = documentedUploadContract.accepted[format];
  return (
    accepted.extensions.some((extension) =>
      file.name.toLowerCase().endsWith(extension),
    ) &&
    (file.type === "" || file.type === accepted.media)
  );
}
const materialSchema = z.object({
  type: z.literal("materials"),
  id: resourceId,
  attributes: z.object({
    name: z.string(),
    scope: z.enum(["course-wide", "student-private"]),
    kind: z.enum(["text-book", "exam", "worksheet", "website", "youtube"]),
    format: z.enum([...formats, "link"]),
    state: z.enum(["draft", "processing", "ready", "failed"]),
    approved: z.boolean(),
  }),
  relationships: z.object({
    course: z.object({
      data: z.object({ type: z.literal("courses"), id: resourceId }),
    }),
  }),
});
const fileSchema = z.object({
  type: z.literal("material-files"),
  id: resourceId,
  attributes: z.object({
    original_filename: z.string(),
    media_type: z.string(),
    size_bytes: z.number().int().nonnegative().safe(),
    page_count: z.number().int().nonnegative(),
    state: z.enum(["draft", "processing", "processed", "failed"]),
    failure_code: z.string().nullable(),
  }),
  relationships: z.object({
    material: z.object({
      data: z.object({ type: z.literal("materials"), id: resourceId }),
    }),
  }),
});
const materialDocument = z.object({ data: materialSchema });
const fileDocument = z.object({ data: fileSchema });
function projectMaterial(data: z.infer<typeof materialSchema>) {
  return {
    id: data.id as MaterialId,
    courseId: data.relationships.course.data.id as CourseId,
    ...data.attributes,
  };
}
function projectFile(data: z.infer<typeof fileSchema>) {
  return {
    id: data.id as MaterialFileId,
    materialId: data.relationships.material.data.id as MaterialId,
    name: data.attributes.original_filename,
    mediaType: data.attributes.media_type,
    size: data.attributes.size_bytes,
    pages: data.attributes.page_count,
    state: data.attributes.state,
    failureCode: data.attributes.failure_code,
  };
}
export type Material = ReturnType<typeof projectMaterial>;
export type MaterialFile = ReturnType<typeof projectFile>;
export type MaterialPage = {
  readonly items: readonly Material[];
  readonly nextOffset: number | null;
  readonly previousOffset: number | null;
};
const collectionPath = (course: CourseId) =>
  `/api/v1/courses/${encodeURIComponent(course)}/materials`;
export const materialFilesPath = (id: MaterialId) =>
  `/api/v1/materials/${encodeURIComponent(id)}/files`;
export function isHiddenMaterialFailure(failure: ApiFailure): boolean {
  return (
    failure.kind === "http" &&
    (failure.disclosure.status === 404 ||
      (failure.disclosure.status === 403 && failure.code !== "csrf_invalid"))
  );
}
function admitMaterial(
  data: z.infer<typeof materialSchema>,
  course: CourseId,
  id?: MaterialId,
): Material {
  const material = projectMaterial(data);
  if (material.courseId !== course || (id !== undefined && material.id !== id))
    throw new ApiProtocolError();
  return material;
}
export async function getMaterial(
  course: CourseId,
  id: MaterialId,
  signal: AbortSignal,
): Promise<Material> {
  const doc = await readJsonApi({
    path: `/api/v1/materials/${encodeURIComponent(id)}`,
    schema: materialDocument,
    initiator: "user",
    signal,
  });
  return admitMaterial(doc.data, course, id);
}
export async function listMaterials(
  course: CourseId,
  offset: number,
  signal: AbortSignal,
): Promise<MaterialPage> {
  const path = collectionPath(course);
  const doc = await readJsonApi({
    path: `${path}?${collectionQuery(offset)}`,
    initiator: "user",
    signal,
    schema: z.object({
      data: z.array(materialSchema),
      meta: z.object({ has_more: z.boolean() }),
      links: z
        .object({ next: z.string().optional(), prev: z.string().optional() })
        .optional(),
    }),
  });
  const navigation = collectionNavigation(path, offset, doc.meta.has_more, {
    ...(doc.links?.prev === undefined ? {} : { prev: doc.links.prev }),
    ...(doc.links?.next === undefined ? {} : { next: doc.links.next }),
  });
  return {
    items: doc.data.map((data) => admitMaterial(data, course)),
    ...navigation,
  };
}
export type MaterialCreateFields = {
  readonly name: string;
  readonly kind: "text-book" | "exam" | "worksheet";
  readonly format: FileFormat;
};
export async function createMaterial(
  course: CourseId,
  fields: MaterialCreateFields,
  csrfToken: string,
): Promise<Material> {
  const body = {
    data: {
      type: "materials",
      attributes: { ...fields, scope: "course-wide" },
    },
  } satisfies operations["createMaterial"]["requestBody"]["content"][typeof jsonApiMediaType];
  const doc = await parseJsonApiResponse(
    await sendUnsafeRequest({
      path: collectionPath(course),
      method: "POST",
      csrfToken,
      body: JSON.stringify(body),
    }),
    materialDocument,
    201,
  );
  const material = admitMaterial(doc.data, course);
  if (
    material.scope !== "course-wide" ||
    material.state !== "draft" ||
    material.format !== fields.format ||
    material.kind !== fields.kind
  )
    throw new ApiProtocolError();
  return material;
}
export async function listMaterialFiles(
  id: MaterialId,
  signal: AbortSignal,
): Promise<readonly MaterialFile[]> {
  const doc = await readJsonApi({
    path: materialFilesPath(id),
    initiator: "user",
    signal,
    schema: z.object({ data: z.array(fileSchema).max(200) }),
  });
  const files = doc.data.map(projectFile);
  if (
    files.some((file) => file.materialId !== id) ||
    new Set(files.map((file) => file.id)).size !== files.length
  )
    throw new ApiProtocolError();
  return files;
}
export async function parseUploadedFile(
  response: Response,
  id: MaterialId,
): Promise<MaterialFile> {
  const file = projectFile(
    (await parseJsonApiResponse(response, fileDocument, 201)).data,
  );
  if (file.materialId !== id) throw new ApiProtocolError();
  return file;
}
export async function deleteMaterialFile(
  id: MaterialFileId,
  csrfToken: string,
): Promise<void> {
  const response = await sendUnsafeRequest({
    path: `/api/v1/material-files/${encodeURIComponent(id)}`,
    method: "DELETE",
    csrfToken,
  });
  if (!response.ok) {
    await parseJsonApiResponse(response, fileDocument);
    return;
  }
  if (response.status !== 204 || (await response.text()) !== "")
    throw new ApiProtocolError();
}
