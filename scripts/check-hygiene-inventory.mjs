import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { routeHygieneCases } from "./route-secret-hygiene-cases.ts";
import {
  browserCases,
  courseUnitCases,
  unitCases,
} from "./secret-hygiene-evidence.ts";
import { parseReport } from "./hygiene-output.mjs";

const bin = (name) => resolve("node_modules", ".bin", name);
const routeFiles = [
  "routeNavigation",
  "routeRecovery",
  "invitationAdministration",
  "courseAdministration",
  "coursePreparation",
  "courseActivation",
  "materialPreparation",
  "studentProvisioning",
  "learnCourses",
  "tutoringSessions",
  "completeTutoringJourney",
].map((name) => `e2e/${name}.spec.ts`);

function run(name, args, env = process.env) {
  const result = spawnSync(bin(name), args, {
    encoding: "buffer",
    timeout: 120_000,
    maxBuffer: 32 * 1024 * 1024,
    env,
  });
  if (result.error || result.status !== 0)
    throw new Error(`Could not inventory actual ${name} registrations.`);
  return parseReport(result.stdout, name);
}

function specs(suites) {
  if (!Array.isArray(suites)) throw new Error("Malformed browser inventory.");
  return suites.flatMap((suite) => [
    ...(suite.specs ?? []),
    ...specs(suite.suites ?? []),
  ]);
}

function exactly(actual, expected, label) {
  if (
    new Set(expected).size !== expected.length ||
    JSON.stringify([...actual].sort()) !== JSON.stringify([...expected].sort())
  )
    throw new Error(
      `${label} registration inventory mismatch or duplicate identity.`,
    );
}

export function validateHygieneInventory() {
  const ids = routeHygieneCases.map(({ id }) => id);
  exactly(ids, [...new Set(ids)], "Route ID");
  for (const item of routeHygieneCases) {
    if (
      !item.checkpoints.length ||
      new Set(item.checkpoints).size !== item.checkpoints.length ||
      item.checkpoints.some((point) => !point || point.includes(":"))
    )
      throw new Error("Invalid route checkpoint inventory.");
  }
  const routes = run("playwright", [
    "test",
    ...routeFiles,
    "--list",
    "--reporter=json",
  ]);
  const handoff = run("playwright", [
    "test",
    "e2e/scaffold.spec.ts",
    "--grep",
    "supervisor onboarding handoff|student first-sign-in handoff",
    "--list",
    "--reporter=json",
  ]);
  exactly(
    [...specs(routes.suites), ...specs(handoff.suites)].map(
      (spec) => spec.title,
    ),
    routeHygieneCases.map((item) => item.title),
    "Route test",
  );
  for (const item of courseUnitCases) {
    if (
      !item.points.length ||
      new Set(item.points).size !== item.points.length ||
      item.points.some((point) => !point || point.includes(":"))
    )
      throw new Error("Course-unit checkpoint inventory mismatch.");
  }
  // Vitest `list --json` statically parses literal source and misses dynamic
  // parameterized registrations. Collect the real runtime registry with a
  // pattern that executes no tests; the later probe still proves reachability.
  const root = mkdtempSync(join(tmpdir(), "mia-hygiene-inventory-"));
  try {
    const path = join(root, "report.json");
    const collected = spawnSync(
      bin("vitest"),
      [
        "run",
        ...new Set(courseUnitCases.map((item) => item.file)),
        "-t",
        "^__mia_inventory_no_test_selected__$",
        "--reporter=json",
        `--outputFile=${path}`,
      ],
      { encoding: "buffer", timeout: 120_000, maxBuffer: 32 * 1024 * 1024 },
    );
    if (collected.error || collected.status !== 0)
      throw new Error("Could not collect actual unit hygiene registrations.");
    const report = parseReport(readFileSync(path), "course-unit inventory");
    if (!Array.isArray(report.testResults))
      throw new Error("Malformed actual unit registry.");
    const registrations = report.testResults.flatMap((suite) =>
      suite.assertionResults.map(
        (test) => `${resolve(suite.name)}:${test.title}`,
      ),
    );
    for (const item of courseUnitCases)
      if (
        registrations.filter(
          (id) => id === `${resolve(item.file)}:${item.title}`,
        ).length !== 1
      )
        throw new Error("Course-unit actual registration inventory mismatch.");
    const baselineBrowser = run(
      "playwright",
      [
        "test",
        "--config",
        "playwright.secret-hygiene.config.ts",
        "--list",
        "--reporter=json",
      ],
      {
        ...process.env,
        MIA_SECRET_HYGIENE_OUTPUT: root,
        MIA_HYGIENE_PREVIEW_4174: "1",
      },
    );
    exactly(
      specs(baselineBrowser.suites).map((spec) => spec.title),
      browserCases,
      "Browser baseline",
    );
    const baselinePath = join(root, "baseline-unit.json");
    const baselineUnit = spawnSync(
      bin("vitest"),
      [
        "run",
        "--config",
        "vitest.secret-hygiene.config.ts",
        "-t",
        "^__mia_inventory_no_test_selected__$",
        "--reporter=json",
        `--outputFile=${baselinePath}`,
      ],
      { encoding: "buffer", timeout: 120_000, maxBuffer: 32 * 1024 * 1024 },
    );
    if (baselineUnit.error || baselineUnit.status !== 0)
      throw new Error("Could not collect baseline unit registrations.");
    const baselineReport = parseReport(
      readFileSync(baselinePath),
      "baseline unit inventory",
    );
    exactly(
      baselineReport.testResults.flatMap((suite) =>
        suite.assertionResults.map((test) => test.title),
      ),
      unitCases,
      "Unit baseline registration",
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
  exactly(
    courseUnitCases.map((item) => `${item.file}:${item.title}`),
    [...new Set(courseUnitCases.map((item) => `${item.file}:${item.title}`))],
    "Unit test",
  );
  exactly(browserCases, [...new Set(browserCases)], "Browser baseline");
  exactly(unitCases, [...new Set(unitCases)], "Unit baseline");
  console.log(
    `Hygiene inventory: ${routeHygieneCases.length} browser cases and ${courseUnitCases.length} course-unit cases registered.`,
  );
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  validateHygieneInventory();
