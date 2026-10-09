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
  "browser-material-processing",
  "browser-material-preview",
  "browser-material-pending",
  "browser-material-unknown",
  "browser-material-rejected",
  "browser-material-teardown",
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
      "activation sends a single bodyless contract request and validates active persisted truth",
    file: "src/platform/api/courses.test.ts",
    points: ["activation-wire"],
  },
  {
    title: "activation rejects contradictory protocol success without replay",
    file: "src/platform/api/courses.test.ts",
    points: ["activation-malformed"],
  },
  {
    title:
      "readiness retains server false independently of empty display blockers and rejects malformed action facts",
    file: "src/platform/api/courses.test.ts",
    points: ["activation-readiness"],
  },
  // Every connected activation case installs secret-bearing fixtures, including
  // denied gates and each parameterized outcome. Inventory all actual tests.
  ...["readiness", "activate"].map((path) => ({
    title: `activation ${path} requires exact assigned scope before course discovery`,
    file: "src/app/routes/courseActivation.test.tsx",
    points: ["activation-gate"],
  })),
  {
    title:
      "readiness offers only implemented trusted blocker destinations and no local eligibility guess",
    file: "src/app/routes/courseActivation.test.tsx",
    points: ["activation-blockers"],
  },
  ...["active_accepting", "active_not_accepting"].map((acceptance) => ({
    title: `activation definitive ${acceptance} installs only returned truth then re-admits hub`,
    file: "src/app/routes/courseActivation.test.tsx",
    points: ["activation-success"],
  })),
  ...["name", "teaching", "eligibility", "lifecycle"].map((change) => ({
    title: `activation changed ${change} facts invalidate review before dispatch`,
    file: "src/app/routes/courseActivation.test.tsx",
    points: ["activation-changed"],
  })),
  ...["conflict", "already", "lose", "malformed", "server"].map((outcome) => ({
    title: `activation ${outcome} never claims success or automatically repeats`,
    file: "src/app/routes/courseActivation.test.tsx",
    points: ["activation-outcome", "activation-reconciled"],
  })),
  ...["preflight", "post"].map((phase) => ({
    title: `activation stopped ${phase} fences late completion and preserves applicable denial`,
    file: "src/app/routes/courseActivation.test.tsx",
    points: ["activation-hidden"],
  })),
  {
    title:
      "activation Stop waiting keeps late success unknown and reconciliation never attributes it",
    file: "src/app/routes/courseActivation.test.tsx",
    points: ["activation-stopped"],
  },
  ...["csrf", "expired", "restricted", "lifecycle"].map((loss) => ({
    title: `activation ${loss} teardown fences protected completion without replay`,
    file: "src/app/routes/courseActivation.test.tsx",
    points: ["activation-teardown"],
  })),
  {
    title:
      "activation preflight failure disables confirmation until a successful explicit read",
    file: "src/app/routes/courseActivation.test.tsx",
    points: ["activation-read-failed"],
  },
  {
    title:
      "activation duplicate native submissions cannot queue another unsafe dispatch",
    file: "src/app/routes/courseActivation.test.tsx",
    points: ["activation-duplicate"],
  },
  {
    title:
      "activation stopped preflight cannot dispatch after a late eligible read",
    file: "src/app/routes/courseActivation.test.tsx",
    points: ["activation-preflight-stopped"],
  },
  {
    title:
      "activation preflight lifecycle shield prevents future unsafe dispatch and scope recovery prevents discovery",
    file: "src/app/routes/courseActivation.test.tsx",
    points: ["activation-preflight-shield"],
  },
  {
    title:
      "activation unknown departure asks before dropping attempt and security loss overrides the dialog",
    file: "src/app/routes/courseActivation.test.tsx",
    points: ["activation-departure"],
  },
  {
    title:
      "activation direct previously activated course stays unavailable even with server eligibility",
    file: "src/app/routes/courseActivation.test.tsx",
    points: ["activation-previously-active"],
  },
  ...["stop", "teardown"].flatMap((disposition) =>
    [200, 404, 403].map((status) => ({
      title: `dependent readiness after definitive save ${disposition} fences ordinary results but handles applicable status ${status}`,
      file: "src/features/materials/materialLifecycle.test.tsx",
      points: [
        `brief-dependent-${disposition}-${status}-retired`,
        `brief-dependent-${disposition}-${status}-settled`,
      ],
    })),
  ),
  {
    title:
      "mounted brief fields give corrective named errors focus and recovery without invalid PATCH",
    file: "src/features/materials/materialLifecycle.test.tsx",
    points: ["brief-validation-invalid", "brief-validation-recovered"],
  },
  {
    title:
      "successive saves invalidate readiness and successful Refresh replaces failure and fences older reads",
    file: "src/features/materials/materialLifecycle.test.tsx",
    points: ["brief-readiness-reconciled", "brief-readiness-teardown"],
  },
  {
    title:
      "changed approved brief revokes only from returned truth and normalized no-op stays approved",
    file: "src/features/materials/materialLifecycle.test.tsx",
    points: ["brief-saved", "brief-revoked"],
  },
  {
    title:
      "lost save freezes submitted input and Refresh matches values without an execution claim",
    file: "src/features/materials/materialLifecycle.test.tsx",
    points: ["brief-unknown", "brief-reconciled"],
  },
  {
    title:
      "scope teardown drops drafts and errors immediately and fences a pending response",
    file: "src/features/materials/materialLifecycle.test.tsx",
    points: ["brief-pending", "brief-teardown"],
  },
  {
    title:
      "material deletion new attempt retires rejection and stopped late success stays unknown",
    file: "src/app/routes/materialPreparation.test.tsx",
    points: [
      "material-delete-prior-rejected",
      "material-delete-new-chosen",
      "material-delete-new-stopped",
      "material-delete-new-late-success",
    ],
  },
  ...[204, 404].map((status) => ({
    title: `material new deletion retires feedback and fences stopped late status ${status}`,
    file: "src/features/materials/materialUploadQueue.test.ts",
    points: [
      `material-delete-retired-start-${status}`,
      `material-delete-retired-late-${status}`,
    ],
  })),
  ...["material", "files"].flatMap((path) =>
    ["http", "transport"].map((outcome) => ({
      title: `material confirmed deletion retains success after ${path} ${outcome} refresh failure`,
      file: "src/app/routes/materialPreparation.test.tsx",
      points: [
        `material-deleted-read-failed-${path}-${outcome}`,
        `material-deleted-read-recovered-${path}-${outcome}`,
      ],
    })),
  ),
  {
    title:
      "material CSRF rejection destroys authenticated work and only explicit recovery restores admission",
    file: "src/platform/session/sessionController.test.ts",
    points: ["material-csrf-state"],
  },
  ...["unknown", "rejected"].flatMap((outcome) => [
    {
      title: `material create ${outcome} feedback announces once without contradictory outcome or raw body`,
      file: "src/app/routes/materialPreparation.test.tsx",
      points: [
        `material-create-feedback-${outcome}`,
        `material-create-retired-${outcome}`,
      ],
    },
    {
      title: `material deletion ${outcome} feedback announces once and retires on security loss`,
      file: "src/app/routes/materialPreparation.test.tsx",
      points: [
        `material-delete-feedback-${outcome}`,
        `material-delete-retired-${outcome}`,
      ],
    },
  ]),
  {
    title:
      "material name validation exposes required corrective text focus and correction without dispatch",
    file: "src/app/routes/materialPreparation.test.tsx",
    points: ["material-validation-long", "material-validation-corrected"],
  },
  {
    title:
      "material protocol validates file identity byte metadata status and scoped navigation",
    file: "src/platform/api/materials.test.ts",
    points: ["material-protocol"],
  },
  {
    title:
      "material stopped wait retains a current hidden denial and destroys every queue reference",
    file: "src/features/materials/materialUploadQueue.test.ts",
    points: ["material-stopped-denial"],
  },
  {
    title:
      "material routes gate private dependent files before protected mount",
    file: "src/app/routes/materialPreparation.test.tsx",
    points: ["material-admission"],
  },
  {
    title:
      "material native selection preserves duplicate rows and dirty Stay then discards on departure",
    file: "src/app/routes/materialPreparation.test.tsx",
    points: ["material-input", "material-departed"],
  },
  {
    title:
      "material unconfirmed creation freezes repeat dispatch and permits explicit abandonment",
    file: "src/app/routes/materialPreparation.test.tsx",
    points: ["material-create-unknown"],
  },
  {
    title:
      "material create is one dispatch and relationship admission rejects cross-course data",
    file: "src/platform/api/materials.test.ts",
    points: ["material-create"],
  },
  {
    title:
      "material transfer sends one multipart file with current CSRF and measured progress",
    file: "src/platform/transfer/materialUpload.test.ts",
    points: ["material-sent", "material-persisted"],
  },
  ...["stop", "network", "malformed", "server", "oversized", "utf8"].map(
    (mode) => ({
      title: `material transfer ${mode} settles unknown without replay`,
      file: "src/platform/transfer/materialUpload.test.ts",
      points: [`material-transfer-${mode}`],
    }),
  ),
  {
    title:
      "material transfer preserves original rejected UTF-8 disclosure and fences security teardown",
    file: "src/platform/transfer/materialUpload.test.ts",
    points: ["material-error"],
  },
  {
    title:
      "material queue serializes duplicate sources and pauses unknown until explicit reconciliation",
    file: "src/features/materials/materialUploadQueue.test.ts",
    points: [
      "material-queued",
      "material-unconfirmed",
      "material-reconciled",
      "material-cleared",
    ],
  },
  {
    title:
      "material queue supports 200 keyboard rows and rejects each mixed-format source without losing saved draft",
    file: "src/features/materials/materialUploadQueue.test.ts",
    points: ["material-many"],
  },
  {
    title:
      "material queue requires deliberate duplicate-risk acceptance and freezes authoritative processing",
    file: "src/features/materials/materialUploadQueue.test.ts",
    points: ["material-frozen"],
  },
  {
    title:
      "material file removal keeps persisted rows until exact definitive success and never replays unknown",
    file: "src/features/materials/materialUploadQueue.test.ts",
    points: ["material-delete-unknown"],
  },
  ...["PATCH", "GET"].map((operation) => ({
    title: `preparation stopped ${operation} denial still destroys current protected input`,
    file: "src/app/routes/coursePreparation.test.tsx",
    points: [
      `preparation-stopped-${operation}`,
      `preparation-stopped-hidden-${operation}`,
    ],
  })),
  {
    title:
      "preparation stopped denial remains applicable after a newer same-resource check",
    file: "src/app/routes/coursePreparation.test.tsx",
    points: ["preparation-same-resource-denial"],
  },
  {
    title:
      "preparation pending dirty read guards departure and fences departed denial",
    file: "src/app/routes/coursePreparation.test.tsx",
    points: ["preparation-read-stay", "preparation-read-discard"],
  },
  {
    title:
      "preparation security departure fences an in-flight save before protected completion",
    file: "src/app/routes/coursePreparation.test.tsx",
    points: ["preparation-late-cleared"],
  },
  {
    title:
      "preparation gates assigned identities before any dependent course request",
    file: "src/app/routes/coursePreparation.test.tsx",
    points: ["preparation-gate"],
  },
  {
    title:
      "preparation validates Unicode bounds then installs persisted distinct teaching values",
    file: "src/app/routes/coursePreparation.test.tsx",
    points: ["preparation-input", "preparation-persisted"],
  },
  {
    title:
      "preparation backend validation retains correction and clears invalid associations",
    file: "src/app/routes/coursePreparation.test.tsx",
    points: ["preparation-error"],
  },
  {
    title:
      "preparation unknown save reconciles matching or differing values without replay",
    file: "src/app/routes/coursePreparation.test.tsx",
    points: ["preparation-unknown", "preparation-reconciled"],
  },
  {
    title:
      "preparation hidden PATCH denial unmounts draft preview and keeps collapsed disclosure",
    file: "src/app/routes/coursePreparation.test.tsx",
    points: ["preparation-hidden"],
  },
  {
    title:
      "preparation dirty dialog loses input on lifecycle security override without requests",
    file: "src/app/routes/coursePreparation.test.tsx",
    points: ["preparation-cleared"],
  },
  {
    title:
      "preparation Stop waiting fences late save success and a newer read preserves draft",
    file: "src/app/routes/coursePreparation.test.tsx",
    points: ["preparation-newer"],
  },
  {
    title:
      "preparation unsafe PATCH dispatch is single and cannot inherit read retries",
    file: "src/platform/api/client.test.ts",
    points: ["preparation-client"],
  },
  {
    title:
      "preparation reads readiness and persists only the chosen teaching field",
    file: "src/platform/api/courses.test.ts",
    points: ["preparation-read", "preparation-patch"],
  },
  {
    title:
      "preparation rejects malformed readiness and never follows unsafe blocker links",
    file: "src/platform/api/courses.test.ts",
    points: ["preparation-links"],
  },
  {
    title:
      "preparation lost PATCH response never replays and preserves error identity",
    file: "src/platform/api/courses.test.ts",
    points: ["preparation-unknown", "preparation-error"],
  },
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
    teachingText:
      process.env.MIA_COURSE_UNIT_TEXT ?? `teaching-${randomUUID()}`,
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
