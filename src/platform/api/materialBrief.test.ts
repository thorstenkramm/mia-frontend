import { expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import {
  briefErrors,
  briefRequest,
  materialBriefSchema,
  type MaterialBrief,
} from "./materialBrief";

function brief(): MaterialBrief {
  return {
    version: 1,
    summary: randomUUID(),
    subjects: [randomUUID()],
    learning_goals: null,
    sections: [
      {
        sequence: 1,
        label: null,
        title: randomUUID(),
        description: randomUUID(),
        search_terms: null,
      },
    ],
    warnings: null,
    educational_level: null,
  };
}
it("brief round-trip preserves every field and omits only null optional request collections", () => {
  const source = brief();
  const mapped = briefRequest(source);
  expect(
    !("learning_goals" in mapped) &&
      !("warnings" in mapped) &&
      !Object.hasOwn(mapped.sections?.[0] ?? {}, "search_terms") &&
      mapped.sections?.[0]?.description === source.sections?.[0]?.description &&
      mapped.educational_level === null,
  ).toBe(true);
  const complete = {
    ...source,
    learning_goals: [randomUUID()],
    warnings: [],
    educational_level: randomUUID(),
    sections:
      source.sections?.map((section) => ({
        ...section,
        search_terms: [randomUUID()],
      })) ?? null,
  };
  const result = briefRequest(complete);
  expect(
    result.learning_goals?.[0] === complete.learning_goals[0] &&
      result.warnings?.length === 0 &&
      result.sections?.[0]?.search_terms?.length === 1,
  ).toBe(true);
});
it("brief boundary counts Unicode code points and enforces fields items identity and encoded caps", () => {
  const source = brief();
  expect(
    materialBriefSchema.safeParse({ ...source, summary: "😀".repeat(4000) })
      .success,
  ).toBe(true);
  for (const value of [
    { ...source, version: 2 },
    { ...source, unknown: true },
    { ...source, summary: "😀".repeat(4001) },
    { ...source, subjects: [] },
    { ...source, subjects: Array.from({ length: 21 }, () => randomUUID()) },
    {
      ...source,
      learning_goals: Array.from({ length: 31 }, () => randomUUID()),
    },
    {
      ...source,
      sections: [
        {
          sequence: 2,
          label: null,
          title: randomUUID(),
          description: randomUUID(),
          search_terms: null,
        },
      ],
    },
    {
      ...source,
      sections: Array.from({ length: 500 }, (_, index) => ({
        sequence: index + 1,
        label: null,
        title: "😀".repeat(200),
        description: "😀".repeat(500),
        search_terms: [],
      })),
    },
  ])
    expect(materialBriefSchema.safeParse(value).success).toBe(false);
  expect(
    briefErrors({ ...source, educational_level: "" }).some(
      (error) =>
        error.field === "educational_level" && error.reason === "required",
    ),
  ).toBe(true);
});
it("brief validation retains corrective required character item minimum maximum and encoded reasons", () => {
  const source = brief();
  const errors = briefErrors({
    ...source,
    summary: "",
    subjects: [],
    warnings: ["x".repeat(501)],
    learning_goals: Array.from({ length: 31 }, () => "x"),
  });
  expect(
    errors.some(
      (error) => error.field === "summary" && error.reason === "required",
    ) &&
      errors.some(
        (error) =>
          error.field === "subjects" &&
          error.reason === "minimum" &&
          error.limit === 1,
      ) &&
      errors.some(
        (error) =>
          error.field === "warnings.0" &&
          error.reason === "maximum" &&
          error.limit === 500,
      ) &&
      errors.some(
        (error) =>
          error.field === "learning_goals" &&
          error.reason === "items" &&
          error.limit === 30,
      ),
  ).toBe(true);
  const oversized = briefErrors({
    ...source,
    sections: Array.from({ length: 500 }, (_, index) => ({
      sequence: index + 1,
      label: null,
      title: "😀".repeat(200),
      description: "😀".repeat(500),
      search_terms: [],
    })),
  });
  expect(
    oversized.some(
      (error) =>
        error.field === "summary" &&
        error.reason === "encoded" &&
        error.limit === 262144,
    ),
  ).toBe(true);
});
