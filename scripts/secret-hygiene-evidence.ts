import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

// Dedicated preview port keeps this controlled-failure suite isolated.
export const hygieneOrigin = "http://127.0.0.1:4174";

// IDs and checkpoint records are content-free, never fixture-derived.
export const browserCases = [
  "browser-sign-in",
  "browser-retained-secret",
  "browser-reset-token",
  "browser-invitation-token",
  "browser-totp-enrollment",
] as const;
export const unitCases = [
  "unit-reset-comparison",
  "unit-secret-absence",
  "unit-fragment-removal",
  "unit-invitation-token",
  "unit-invitation-password",
  "unit-totp-secret",
  "unit-structural",
] as const;

type CaseId = (typeof browserCases)[number] | (typeof unitCases)[number];

export const courseUnitCases = [
  {
    title:
      "rejects wrong state, missing role, private fields and malformed pagination",
    file: "src/platform/api/administrationAccounts.test.ts",
    points: ["candidate-rejection"],
  },
  {
    title: "candidate absence and failed checks remain distinct",
    file: "src/platform/api/administrationAccounts.test.ts",
    points: ["candidate-empty", "candidate-failed"],
  },
  {
    title:
      "course form validates locally then redirects only after definitive creation",
    file: "src/app/routes/courseAdministration.test.tsx",
    points: ["route-invalid", "route-draft", "route-persisted"],
  },
  {
    title:
      "course selector denial tears down selected draft and retains collapsed raw disclosure",
    file: "src/app/routes/courseAdministration.test.tsx",
    points: ["route-draft", "route-error"],
  },
  {
    title: "course unknown response is not success and cannot replay on review",
    file: "src/app/routes/courseAdministration.test.tsx",
    points: ["route-draft", "route-persisted"],
  },
  {
    title:
      "course stale supervisor rejection preserves correction without identity inference",
    file: "src/app/routes/courseAdministration.test.tsx",
    points: ["route-error", "route-corrected"],
  },
  {
    title: "course selection spans pages and dirty Stay does not reauthorize",
    file: "src/app/routes/courseAdministration.test.tsx",
    points: ["route-draft"],
  },
  {
    title:
      "course privacy shield overrides an open dirty dialog without extra requests",
    file: "src/app/routes/courseAdministration.test.tsx",
    points: ["route-cleared"],
  },
  {
    title:
      "course Prepare batches known IDs and never reads visible-course union",
    file: "src/app/routes/courseAdministration.test.tsx",
    points: ["route-batch"],
  },
  {
    title:
      "course account and non-global capability gates withhold collection requests",
    file: "src/app/routes/courseAdministration.test.tsx",
    points: ["route-prerequisite"],
  },
  {
    title:
      "shortlists a minimized candidate page without claiming assignment eligibility",
    file: "src/platform/api/administrationAccounts.test.ts",
    points: ["candidate-projection"],
  },
  {
    title: "sends one atomic create and reads the persisted minimized course",
    file: "src/platform/api/courses.test.ts",
    points: ["atomic-payload", "persisted-projection"],
  },
  {
    title: "does not replay a create after response loss or malformed success",
    file: "src/platform/api/courses.test.ts",
    points: ["lost-response", "malformed-success"],
  },
] as const;

export function courseUnitFixture() {
  if (process.env.MIA_COURSE_UNIT_EARLY === "1")
    throw new Error("Injected course unit early failure.");
  return {
    name: process.env.MIA_COURSE_UNIT_NAME ?? `course-${randomUUID()}`,
    username:
      process.env.MIA_COURSE_UNIT_USERNAME ??
      `supervisor.${randomUUID().slice(0, 12)}`,
    csrf: process.env.MIA_COURSE_UNIT_CSRF ?? randomUUID(),
    rawError: process.env.MIA_COURSE_UNIT_RAW ?? `body-${randomUUID()}`,
  };
}
export function courseUnitCheckpoint(point: string): void {
  if (process.env.MIA_COURSE_UNIT_POINT !== point) return;
  const directory = process.env.MIA_SECRET_HYGIENE_EVIDENCE;
  if (!directory)
    throw new Error("Course unit evidence directory is required.");
  writeFileSync(join(directory, "course.checkpoint"), point, { flag: "wx" });
  throw new Error(`ControlledCourseUnitFailure:${point}`);
}

export function injectEarlyFailure(id: string): void {
  if (process.env.MIA_SECRET_HYGIENE_EARLY_FAILURE === id)
    throw new Error("Injected failure before the secret-bearing checkpoint.");
}

export function controlledFailure(id: CaseId, assertion: () => void): never {
  const directory = process.env.MIA_SECRET_HYGIENE_EVIDENCE;
  if (!directory) throw new Error("Hygiene evidence directory is required.");
  writeFileSync(join(directory, `${id}.checkpoint`), id, { flag: "wx" });
  try {
    assertion();
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    // Keep the original assertion (including its report formatting) under test.
    error.message = `ControlledHygieneFailure:${id}\n${error.message}`;
    throw error;
  }
  throw new Error("The deliberate hygiene assertion unexpectedly passed.");
}
