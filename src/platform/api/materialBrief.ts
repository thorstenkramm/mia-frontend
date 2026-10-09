import { z } from "zod";
import type { components } from "./generated";
import { ApiProtocolError } from "./client";

const bytes = (text: string) => new TextEncoder().encode(text).byteLength;
function boundedText(points: number, cap: number, minimum = 1) {
  return z.string().superRefine((text, context) => {
    const length = [...text].length;
    const reason =
      length < minimum
        ? "required"
        : length > points
          ? "maximum"
          : bytes(text) > cap
            ? "encoded"
            : null;
    if (reason)
      context.addIssue({
        code: "custom",
        message: reason,
        params: { limit: reason === "encoded" ? cap : points },
      });
  });
}
const sectionSchema = z.strictObject({
  sequence: z.number().int().positive(),
  label: boundedText(100, 400, 0).nullable(),
  title: boundedText(200, 800),
  description: boundedText(500, 2000),
  search_terms: z.array(boundedText(50, 200)).max(10).nullable(),
});
// Single version-1 boundary. Null in a response is not an empty collection.
export const materialBriefSchema = z
  .strictObject({
    version: z.literal(1),
    summary: boundedText(4000, 16384),
    subjects: z.array(boundedText(100, 400)).min(1).max(20),
    learning_goals: z.array(boundedText(300, 1200)).max(30).nullable(),
    sections: z.array(sectionSchema).max(500).nullable(),
    warnings: z.array(boundedText(500, 2000)).max(20).nullable(),
    educational_level: boundedText(100, 400, 0).nullable(),
  })
  .superRefine((brief, context) => {
    brief.sections?.forEach((section, index) => {
      if (section.sequence !== index + 1)
        context.addIssue({
          code: "custom",
          path: ["sections", index, "sequence"],
          message: "brief-sequence",
        });
    });
    if (bytes(JSON.stringify(brief)) > 262144)
      context.addIssue({
        code: "custom",
        path: ["summary"],
        message: "brief-encoded-bounds",
      });
  });
export type MaterialBrief = z.infer<typeof materialBriefSchema>;
export function briefRequest(brief: MaterialBrief) {
  const parsed = materialBriefSchema.safeParse(brief);
  if (!parsed.success) throw new ApiProtocolError();
  const value = parsed.data;
  const request = {
    version: value.version,
    summary: value.summary,
    subjects: value.subjects,
    ...(value.learning_goals === null
      ? {}
      : { learning_goals: value.learning_goals }),
    ...(value.sections === null
      ? {}
      : {
          sections: value.sections.map(({ search_terms, ...section }) => ({
            ...section,
            ...(search_terms === null ? {} : { search_terms }),
          })),
        }),
    ...(value.warnings === null ? {} : { warnings: value.warnings }),
    educational_level: value.educational_level,
  } satisfies components["schemas"]["BriefRequest"];
  // Optional nullable labels in responses have no minLength; requests do.
  if (
    value.educational_level === "" ||
    value.sections?.some((section) => section.label === "")
  )
    throw new ApiProtocolError();
  return request;
}
export type BriefError = {
  field: string;
  reason: "required" | "minimum" | "maximum" | "items" | "encoded" | "sequence";
  limit: number;
};
export function briefErrors(brief: MaterialBrief): readonly BriefError[] {
  const result = materialBriefSchema.safeParse(brief);
  const fields: BriefError[] = result.success
    ? []
    : result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        reason:
          issue.code === "too_small"
            ? "minimum"
            : issue.code === "too_big"
              ? "items"
              : issue.message === "brief-encoded-bounds"
                ? "encoded"
                : issue.message === "brief-sequence"
                  ? "sequence"
                  : issue.message === "required"
                    ? "required"
                    : issue.message === "encoded"
                      ? "encoded"
                      : "maximum",
        limit:
          issue.code === "too_small"
            ? Number(issue.minimum)
            : issue.code === "too_big"
              ? Number(issue.maximum)
              : issue.code === "custom" && issue.params
                ? Number(issue.params.limit ?? 262144)
                : 262144,
      }));
  if (brief.educational_level === "")
    fields.push({ field: "educational_level", reason: "required", limit: 1 });
  brief.sections?.forEach((section, index) => {
    if (section.label === "")
      fields.push({
        field: `sections.${index}.label`,
        reason: "required",
        limit: 1,
      });
  });
  return [...new Map(fields.map((error) => [error.field, error])).values()];
}
export function sameBrief(
  left: MaterialBrief | null,
  right: MaterialBrief | null,
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}
