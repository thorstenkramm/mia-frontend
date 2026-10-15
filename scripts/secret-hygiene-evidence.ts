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
  // Story 6.1/6.2 tutoring session start/intent/workspace: every connected
  // case installs secret-bearing fixtures, including denied gates and each
  // outcome.
  ...(
    [
      [
        "Tutoring discovery returns explicit none and strips every non-projection field",
        "tutoring-discovery",
      ],
      [
        "Tutoring discovery rejects malformed documents instead of guessing none",
        "tutoring-discovery-malformed",
      ],
      [
        "Tutoring creation binds the request ID and optional material in one exact payload",
        "tutoring-create",
      ],
      [
        "Tutoring creation accepts only 200 or 201 and rejects cross-course or ambiguous success",
        "tutoring-create-status",
      ],
      [
        "Tutoring session read requires the addressed identity and strips summary fields",
        "tutoring-session",
      ],
      [
        "Tutoring turn pages reject duplicate wrong-identity and cross-session rows",
        "tutoring-turns",
      ],
      [
        "Tutoring turn pages keep bounded escaped text and reject unsafe navigation",
        "tutoring-turn-pages",
      ],
      [
        "Tutoring hidden failures cover exactly denial unknown and throttled statuses",
        "tutoring-hidden",
      ],
    ] as const
  ).map(([title, point]) => ({
    title,
    file: "src/platform/api/tutoringSessions.test.ts",
    points: [point],
  })),
  {
    title:
      "Tutoring terminal reconciliation accepts only the targeted persisted response",
    file: "src/platform/api/tutoringSessions.test.ts",
    points: ["tutoring-targeted-terminal"],
  },
  {
    title:
      "Tutoring Stop accepts only 200 with a targeted interrupted response and independent current work",
    file: "src/platform/api/tutoringSessions.test.ts",
    points: ["tutoring-stop-document"],
  },
  {
    title:
      "Tutoring response retry accepts linked 201/200 but rejects wrong lineage and status",
    file: "src/platform/api/tutoringSessions.test.ts",
    points: ["tutoring-retry-document"],
  },
  {
    title:
      "Tutoring workspace withholds session and transcript reads until learning participation settles",
    file: "src/app/routes/learnSessionEntry.test.tsx",
    points: ["tutoring-admitted"],
  },
  {
    title:
      "Tutoring start runs discovery before any start affordance and resumes the found session",
    file: "src/app/routes/learnSessionEntry.test.tsx",
    points: ["tutoring-resume"],
  },
  {
    title:
      "Tutoring course choice lists joined courses with server eligibility and no local computation",
    file: "src/app/routes/learnSessionEntry.test.tsx",
    points: ["tutoring-choice"],
  },
  {
    title:
      "Tutoring material choice continues to the intent route carrying one opaque selection",
    file: "src/app/routes/learnSessionEntry.test.tsx",
    points: ["tutoring-handoff"],
  },
  {
    title:
      "Tutoring intent without handoff state starts intent-only with the visible material parent",
    file: "src/app/routes/learnSessionEntry.test.tsx",
    points: ["tutoring-intent-only"],
  },
  {
    title:
      "Tutoring intent begin dispatches one request-ID-bound creation then the first message",
    file: "src/app/routes/learnSessionEntry.test.tsx",
    points: ["tutoring-created"],
  },
  {
    title:
      "Tutoring intent replay 200 without material is the same definitive navigation",
    file: "src/app/routes/learnSessionEntry.test.tsx",
    points: ["tutoring-replay"],
  },
  {
    title:
      "Tutoring active-session and request conflicts reconcile through one discovery read without a second start",
    file: "src/app/routes/learnSessionEntry.test.tsx",
    points: ["tutoring-conflict"],
  },
  ...["invalid-state", "invalid", "not-found"].map((outcome) => ({
    title: `Tutoring ${outcome} ends the attempt definitively without replay`,
    file: "src/app/routes/learnSessionEntry.test.tsx",
    points: ["tutoring-rejected"],
  })),
  {
    title:
      "Tutoring lost start response stays unknown and explicit reconcile resumes the discovered session",
    file: "src/app/routes/learnSessionEntry.test.tsx",
    points: ["tutoring-unknown", "tutoring-reconciled"],
  },
  {
    title:
      "Tutoring reconciled unknown retries the exact retained attempt only explicitly",
    file: "src/app/routes/learnSessionEntry.test.tsx",
    points: ["tutoring-retry"],
  },
  {
    title:
      "Tutoring abandon destroys the retained attempt locally and a later start is a fresh attempt",
    file: "src/app/routes/learnSessionEntry.test.tsx",
    points: ["tutoring-abandon"],
  },
  {
    title:
      "Tutoring Stop waiting after dispatch keeps the outcome unknown and never claims the late success",
    file: "src/app/routes/learnSessionEntry.test.tsx",
    points: ["tutoring-stopped"],
  },
  {
    title:
      "Tutoring lost first send reconciles committed through the current-work read without resending",
    file: "src/app/routes/learnSessionEntry.test.tsx",
    points: ["tutoring-send-unknown", "tutoring-send-reconciled"],
  },
  {
    title:
      "Tutoring uncommitted first send retries only the message with the retained request identity",
    file: "src/app/routes/learnSessionEntry.test.tsx",
    points: ["tutoring-send-retry"],
  },
  {
    title:
      "Tutoring first-send conflict locks the attempt to reconcile and abandon without retry",
    file: "src/app/routes/learnSessionEntry.test.tsx",
    points: ["tutoring-send-conflict"],
  },
  {
    title:
      "Tutoring busy first send keeps the session and draft until explicit Refresh",
    file: "src/app/routes/learnSessionEntry.test.tsx",
    points: ["tutoring-send-busy", "tutoring-send-fresh"],
  },
  {
    title:
      "Tutoring rejected first send mints a fresh message identity without recreating the session",
    file: "src/app/routes/learnSessionEntry.test.tsx",
    points: ["tutoring-send-rejected"],
  },
  {
    title:
      "Tutoring first send to a completed session ends the attempt without replay",
    file: "src/app/routes/learnSessionEntry.test.tsx",
    points: ["tutoring-send-finished"],
  },
  {
    title: "Tutoring starters insert editable localized text and never submit",
    file: "src/app/routes/learnSessionEntry.test.tsx",
    points: ["tutoring-starters"],
  },
  {
    title:
      "Tutoring composer validates documented bounds locally without dispatch",
    file: "src/app/routes/learnSessionEntry.test.tsx",
    points: ["tutoring-bounds"],
  },
  {
    title:
      "Tutoring hidden causes share one neutral presentation on the start and workspace routes",
    file: "src/app/routes/learnSessionEntry.test.tsx",
    points: ["tutoring-route-hidden"],
  },
  ...(
    [
      [
        "Tutoring addressed denial destroys retained page memory but a failed check preserves it",
        "tutoring-addressed-denial",
      ],
      [
        "Tutoring linked retry replaces a queued POST article with fast terminal work truth",
        "tutoring-fast-terminal-retry",
      ],
      [
        "Tutoring queued Stop fences an older terminal GET while retaining both targeted articles",
        "tutoring-stale-terminal-work",
      ],
    ] as const
  ).map(([title, point]) => ({
    title,
    file: "src/app/routes/learnSessionEntry.test.tsx",
    points: [point],
  })),
  {
    title:
      "Tutoring recovery replaces a found session with the workspace and offers fixed exits when none",
    file: "src/app/routes/learnSessionEntry.test.tsx",
    points: ["tutoring-recovery"],
  },
  {
    title:
      "Tutoring completed session renders persisted transcript read-only on the workspace route",
    file: "src/app/routes/learnSessionEntry.test.tsx",
    points: ["tutoring-finished"],
  },
  ...(
    [
      [
        "Tutoring Finish revalidates and installs only definitive persisted completion",
        "tutoring-finish-success",
      ],
      [
        "Tutoring Finish stays unavailable when work is busy or eligibility denied",
        "tutoring-finish-ineligible",
      ],
      [
        "Tutoring dual-capability non-owner completed session hides before transcript or finish work reads",
        "tutoring-finish-owner",
      ],
    ] as const
  ).map(([title, point]) => ({
    title,
    file: "src/app/routes/learnSessionEntry.test.tsx",
    points: [point],
  })),
  {
    title:
      "Tutoring Finish requires atomic server eligibility and the exact definitive completion document",
    file: "src/platform/api/tutoringSessions.test.ts",
    points: ["tutoring-finish-document"],
  },
  {
    title:
      "Tutoring workspace renders persisted turns as escaped text with neutral response labels",
    file: "src/app/routes/learnSessionEntry.test.tsx",
    points: ["tutoring-transcript"],
  },
  {
    title:
      "Tutoring workspace sends one message and renders the queued work from the follow-up read",
    file: "src/app/routes/learnSessionEntry.test.tsx",
    points: ["tutoring-workspace-send"],
  },
  {
    title:
      "Tutoring workspace queue-only work offers Queue message and dedupes current work from the transcript",
    file: "src/app/routes/learnSessionEntry.test.tsx",
    points: ["tutoring-workspace-queue"],
  },
  {
    title:
      "Tutoring workspace full queue keeps the draft and submission disabled until explicit Refresh",
    file: "src/app/routes/learnSessionEntry.test.tsx",
    points: ["tutoring-workspace-full"],
  },
  {
    title:
      "Tutoring lost workspace send reconciles through the current-work read and retries only the exact attempt",
    file: "src/app/routes/learnSessionEntry.test.tsx",
    points: ["tutoring-workspace-unknown", "tutoring-workspace-reconciled"],
  },
  {
    title:
      "Tutoring uncommitted workspace send retries the exact retained attempt only explicitly",
    file: "src/app/routes/learnSessionEntry.test.tsx",
    points: ["tutoring-workspace-retry"],
  },
  {
    title: "Tutoring busy workspace send keeps the draft and never replays",
    file: "src/app/routes/learnSessionEntry.test.tsx",
    points: ["tutoring-workspace-busy"],
  },
  {
    title:
      "Tutoring workspace reload during an unsettled send loses the draft and never replays",
    file: "src/app/routes/learnSessionEntry.test.tsx",
    points: ["tutoring-workspace-reload"],
  },
  {
    title:
      "Tutoring workspace waits for an addressed session read after a send state conflict",
    file: "src/app/routes/learnSessionEntry.test.tsx",
    points: ["tutoring-workspace-finished"],
  },
  ...(
    [
      [
        "Learn ordered admission withholds resource and metadata until capability and course settle",
        "learn-admitted",
      ],
      [
        "Learn joined discovery never unions staff scope and empty success is not a failed read",
        "learn-list",
      ],
      [
        "Learn revoked scope and inactive or hidden courses use one neutral primary presentation",
        "learn-hidden",
      ],
      [
        "Learn metadata pagination is explicit and dependent denial clears course and entire shell",
        "learn-page-denial",
      ],
      [
        "Learn lifecycle fences delayed course truth and return issues no read until explicit Refresh",
        "learn-lifecycle",
      ],
      [
        "Learn fresh revalidation rediscovers membership and never interprets read failure as empty",
        "learn-revalidation",
      ],
    ] as const
  ).map(([title, point]) => ({
    title,
    file: "src/app/routes/learnCourseEntry.test.tsx",
    points: [point],
  })),
  ...(
    [
      [
        "Learn boundary discards brief and every non-rendered material field before state",
        "learn-boundary",
      ],
      [
        "Learn course projection accepts student-safe empty supervisors and rejects wrong identity",
        "learn-course",
      ],
      [
        "Learn joined batches advance by checked identities even when all first-page courses are inactive",
        "learn-batch",
      ],
      [
        "Learn material pages retain navigation on filtered-empty pages and reject unsafe links",
        "learn-navigation",
      ],
      [
        "Learn material boundary rejects cross-course duplicate and oversized documents without protected errors",
        "learn-invalid",
      ],
    ] as const
  ).map(([title, point]) => ({
    title,
    file: "src/platform/api/learnCourses.test.ts",
    points: [point],
  })),
  ...["profiles", "language", "username-profiles", "all-fields"].map(
    (scenario) => ({
      title: `student local ${scenario} corrections link every invalid field in DOM order and focus precisely`,
      file: "src/app/routes/studentProvisioning.test.tsx",
      points: ["student-field-errors", "student-field-corrected"],
    }),
  ),
  {
    title:
      "student StrictMode replay permits one definitive dispatch and credential teardown",
    file: "src/app/routes/studentProvisioning.test.tsx",
    points: ["student-strict-success"],
  },
  ...["preflight", "post"].map((phase) => ({
    title: `student StrictMode retired ${phase} callbacks cannot dispatch or navigate after teardown`,
    file: "src/app/routes/studentProvisioning.test.tsx",
    points: ["student-strict-retired", "student-strict-late"],
  })),
  {
    title: "student stopped response still handles applicable hidden denial",
    file: "src/app/routes/studentProvisioning.test.tsx",
    points: ["student-stopped-denial"],
  },
  ...(
    [
      [
        "student transport sends one exact provision branch and retains only relationship truth",
        "student-wire",
      ],
      [
        "student transport rejects ambiguous successes without unsafe replay",
        "student-malformed",
      ],
      [
        "student roster bounds pages and rejects unsafe navigation and duplicate identities",
        "student-page",
      ],
      [
        "student membership uses the users relationship and rejects mismatched pair data",
        "student-pair",
      ],
      [
        "student empty and previous roster pages preserve absence without fabricated totals",
        "student-empty",
      ],
    ] as const
  ).map(([title, point]) => ({
    title,
    file: "src/platform/api/courseStudents.test.ts",
    points: [point],
  })),
  ...["", "/new", "/student_1"].map((route) => ({
    title: `student admission ${route || "roster"} requires exact course scope before dependent reads`,
    file: "src/app/routes/studentProvisioning.test.tsx",
    points: ["student-gate"],
  })),
  {
    title:
      "student authority never substitutes administrator student or mentor capabilities",
    file: "src/app/routes/studentProvisioning.test.tsx",
    points: ["student-authority"],
  },
  {
    title:
      "student definitive creation clears credentials and navigates by student relationship",
    file: "src/app/routes/studentProvisioning.test.tsx",
    points: ["student-input", "student-success"],
  },
  ...["conflict", "invalid", "bad", "large", "media"].map((outcome) => ({
    title: `student definitive ${outcome} keeps only same mounted native correction`,
    file: "src/app/routes/studentProvisioning.test.tsx",
    points: ["student-rejected"],
  })),
  ...["lose", "malformed", "server"].map((outcome) => ({
    title: `student ambiguous ${outcome} destroys credentials and bounded review never attributes success`,
    file: "src/app/routes/studentProvisioning.test.tsx",
    points: ["student-unknown", "student-reconciled"],
  })),
  ...["csrf", "expired", "restricted", "denied"].map((loss) => ({
    title: `student ${loss} overrides native input without replay`,
    file: "src/app/routes/studentProvisioning.test.tsx",
    points: ["student-security"],
  })),
  {
    title:
      "student stopped post fences late success and duplicate native submits dispatch once",
    file: "src/app/routes/studentProvisioning.test.tsx",
    points: ["student-stopped", "student-late"],
  },
  {
    title: "student inactive preflight and cancelled pending read send no POST",
    file: "src/app/routes/studentProvisioning.test.tsx",
    points: ["student-preflight"],
  },
  {
    title:
      "student lifecycle destroys controls synchronously and return makes no authenticated request",
    file: "src/app/routes/studentProvisioning.test.tsx",
    points: ["student-lifecycle"],
  },
  {
    title:
      "student dirty Stay retains focus but Discard destroys both credential controls",
    file: "src/app/routes/studentProvisioning.test.tsx",
    points: ["student-stay", "student-discard"],
  },
  {
    title:
      "student local mismatch and missing profile prevent any unsafe dispatch",
    file: "src/app/routes/studentProvisioning.test.tsx",
    points: ["student-validation"],
  },
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
      "readiness unavailable admission hides course identity and offers explicit retry",
    file: "src/app/routes/courseActivation.test.tsx",
    points: ["readiness-unavailable"],
  },
  ...[
    "readiness counts display blockers only and shows action-only blockers without links",
    "eligible readiness links to activation only after admitted first activation",
  ].map((title) => ({
    title,
    file: "src/app/routes/courseActivation.test.tsx",
    points: ["activation-blockers"],
  })),
  ...[
    "activation checks current facts with native disabled confirmation and Cancel available",
    "activation in flight changes label, disables submit and offers Stop waiting",
  ].map((title) => ({
    title,
    file: "src/app/routes/courseActivation.test.tsx",
    points: ["activation-success"],
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
  ...["post"].map((phase) => ({
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
      "activation preflight failure requires a new readiness review before another attempt",
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
  ...["incomplete", "ready", "previous", "accepting", "not-accepting"].map(
    (presentation) => ({
      title: `hub ${presentation} renders only current server facts`,
      file: "src/app/routes/coursePreparation.test.tsx",
      points: ["hub-states"],
    }),
  ),
  {
    title:
      "hub rejects a ready-state/activation disagreement without claiming prior activation",
    file: "src/app/routes/coursePreparation.test.tsx",
    points: ["hub-protocol"],
  },
  {
    title:
      "hub blockers preserve server order and never turn API links into hrefs",
    file: "src/app/routes/coursePreparation.test.tsx",
    points: ["hub-blockers"],
  },
  {
    title: "hub renders display blockers only, never activation-only extras",
    file: "src/app/routes/coursePreparation.test.tsx",
    points: ["hub-blockers"],
  },
  {
    title:
      "hub readiness failure removes course identity and retries only by explicit admission",
    file: "src/app/routes/coursePreparation.test.tsx",
    points: ["hub-unavailable"],
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
