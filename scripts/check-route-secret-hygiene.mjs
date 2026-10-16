import { createHash, randomBytes, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { routeHygieneCases } from "./route-secret-hygiene-cases.ts";
import { validateHygieneInventory } from "./check-hygiene-inventory.mjs";
import {
  artifactBuffers,
  assertMarkerFree,
  parseReport,
  reconcileResults,
  recordMarkers,
  serverBuffers,
} from "./hygiene-output.mjs";

const digest = (value) => createHash("sha256").update(value).digest("hex");
const executable = join(process.cwd(), "node_modules", ".bin", "playwright");

function makeFixture() {
  const alphabet = (letters, size) =>
    Array.from(
      randomBytes(size),
      (byte) => letters[byte % letters.length],
    ).join("");
  const fixture = {
    csrf: randomUUID(),
    invitationToken: randomUUID(),
    password: `fixture-${randomBytes(24).toString("hex")}`,
    mfaCode: String(randomBytes(4).readUInt32BE() % 1_000_000).padStart(6, "0"),
    totpSecret: alphabet("ABCDEFGHIJKLMNOPQRSTUVWXYZ234567", 32),
    codes: Array.from({ length: 10 }, () =>
      alphabet("0123456789ABCDEFGHJKMNPQRSTVWXYZ", 16),
    ),
    rawError: `fixture-body-${randomBytes(24).toString("hex")}`,
    email: `invitee-${randomBytes(12).toString("hex")}@example.test`,
    courseName: `درس course-${randomUUID()}`,
    supervisorUsername: `supervisor.${randomUUID().slice(0, 12)}`,
    teachingText: `تعليم teaching-${randomUUID()}`,
  };
  return {
    fixture: JSON.stringify(fixture),
    markers: [
      ...Object.values(fixture).filter((value) => typeof value === "string"),
      ...fixture.codes,
      ...fixture.codes.map((code) => code.replace(/(.{4})(?=.)/gu, "$1-")),
      `otpauth://totp/MIA%20(127.0.0.1:4173):example.learner?secret=${fixture.totpSecret}&issuer=MIA`,
    ],
  };
}

function specs(suites) {
  if (!Array.isArray(suites))
    throw new Error("Malformed route-hygiene report.");
  return suites.flatMap((suite) => [
    ...(suite.specs ?? []),
    ...specs(suite.suites ?? []),
  ]);
}

function selectedCases(scope) {
  const selectors = {
    journey: (id) => id === "complete-tutoring-journey",
    tutoring: (id) => id.startsWith("tutoring-"),
    learn: (id) => id.startsWith("learn-") || id === "student-entry-learn",
    "student-entry": (id) => id.startsWith("student-entry-"),
    students: (id) =>
      id.startsWith("student-") && !id.startsWith("student-entry-"),
    activation: (id) => id.startsWith("preparation-activation-"),
    materials: (id) => id.startsWith("material-"),
    preparation: (id) => id.startsWith("preparation-") || id.startsWith("hub-"),
    invitations: (id) => id.startsWith("invitation-"),
    "supervisor-onboarding": (id) => id.startsWith("supervisor-"),
    courses: (id) => id.startsWith("course-"),
  };
  if (scope && !(scope in selectors))
    throw new Error("Unknown route-hygiene scope.");
  return scope
    ? routeHygieneCases.filter((item) => selectors[scope](item.id))
    : routeHygieneCases;
}

async function executeBatch(root, index, entries, evidence, timing) {
  const directory = join(root, String(index));
  const artifacts = join(directory, "artifacts");
  const checkpoints = join(directory, "checkpoints");
  await mkdir(artifacts, { recursive: true });
  await mkdir(checkpoints);
  const batch = Object.fromEntries(
    entries.map(({ item, point, early, fixture }) => [
      item.id,
      { point, early, fixture: fixture.fixture },
    ]),
  );
  const markers = entries.flatMap(({ fixture }) => fixture.markers);
  await recordMarkers(markers);
  const started = Date.now();
  const child = spawnSync(
    executable,
    ["test", "--config", "playwright.route-secret-hygiene.config.ts"],
    {
      encoding: "buffer",
      timeout: 360_000,
      maxBuffer: 32 * 1024 * 1024,
      env: {
        ...process.env,
        PLAYWRIGHT_NO_COPY_PROMPT: "1",
        NO_COLOR: "1",
        FORCE_COLOR: "0",
        MIA_ROUTE_HYGIENE_BATCH: JSON.stringify(batch),
        MIA_ROUTE_HYGIENE_OUTPUT: artifacts,
        MIA_ROUTE_HYGIENE_EVIDENCE: checkpoints,
      },
    },
  );
  const originals = await artifactBuffers(directory);
  const stdout = child.stdout ?? Buffer.alloc(0);
  const stderr = child.stderr ?? Buffer.alloc(0);
  assertMarkerFree(markers, [
    stdout,
    stderr,
    ...originals,
    ...(await serverBuffers()),
  ]);
  if (child.error || child.status !== 1)
    throw new Error("Route-hygiene batch did not finish normally.");
  const report = parseReport(
    await readFile(join(artifacts, "report.json")),
    "route",
  );
  const results = specs(report.suites).flatMap((spec) =>
    spec.tests.map((test) => ({
      id: entries.find(({ item }) => item.title === spec.title)?.item.id,
      attempts: test.results,
      errors:
        test.results[0]?.errors?.map((error) => error.message ?? "") ?? [],
      duration: test.results.reduce(
        (sum, attempt) => sum + (attempt.duration ?? 0),
        0,
      ),
    })),
  );
  const files = await readdir(checkpoints);
  const records = await Promise.all(
    files.map((file) => readFile(join(checkpoints, file), "utf8")),
  );
  const expected = entries.map(({ item, point }) => `${item.id}:${point}`);
  const expectedFiles = entries
    .filter(({ early }) => !early)
    .map(({ item }) => `${item.id}.checkpoint`);
  if (
    JSON.stringify([...files].sort()) !== JSON.stringify(expectedFiles.sort())
  )
    throw new Error("Route-hygiene checkpoint filename inventory mismatch.");
  // Map the actual case identity to its selected checkpoint, not the report's order.
  for (const result of results)
    result.id = batch[result.id]
      ? `${result.id}:${batch[result.id].point}`
      : undefined;
  const earlyId = entries.find(({ early }) => early);
  reconcileResults(
    expected,
    results,
    records,
    "ControlledRouteHygieneFailure",
    earlyId ? `${earlyId.item.id}:${earlyId.point}` : undefined,
  );
  if (
    earlyId &&
    !results
      .find((result) => result.id === `${earlyId.item.id}:${earlyId.point}`)
      ?.errors[0]?.includes("ControlledRouteHygieneEarlyFailure:")
  )
    throw new Error("Route-hygiene early-failure identity mismatch.");
  const elapsed = Date.now() - started;
  timing.probes += entries.length;
  timing.totalMs += elapsed;
  timing.testMs += results.reduce((sum, result) => sum + result.duration, 0);
  for (const { item, point, early, fixture } of entries)
    evidence.push({
      case: item.id,
      checkpoint: point,
      earlyCanary: early,
      originalStdoutScanned: true,
      originalStderrScanned: true,
      originalArtifactCount: originals.length,
      markersScanned: fixture.markers.length,
      stdoutSha256: digest(stdout),
      stderrSha256: digest(stderr),
      artifactSha256: digest(Buffer.concat(originals)),
      checkpointReached: !early,
      expectedFailureIdentity: !early,
      status: early ? "early-failure-rejected" : "pass",
    });
  console.log(
    `Route hygiene batch ${index}: ${entries.length} independent failures; ${elapsed} ms total.`,
  );
  await rm(directory, { recursive: true, force: true });
}

export async function checkRouteSecretHygiene() {
  validateHygieneInventory();
  const scope = process.env.MIA_ROUTE_HYGIENE_SCOPE;
  const selected = selectedCases(scope);
  const root = await mkdtemp(
    join(
      process.env.MIA_HYGIENE_ARTIFACT_ROOT ?? tmpdir(),
      "mia-route-hygiene-",
    ),
  );
  const evidence = [];
  const timing = { probes: 0, totalMs: 0, testMs: 0 };
  try {
    const rounds = Math.max(...selected.map((item) => item.checkpoints.length));
    let index = 0;
    for (let round = 0; round < rounds; round++) {
      const points = selected.filter(
        (item) => item.checkpoints[round] !== undefined,
      );
      // Bound one invocation's failure-report size and runtime, without sharing a journey.
      for (let offset = 0; offset < points.length; offset += 6) {
        const entries = points.slice(offset, offset + 6).map((item) => ({
          item,
          point: item.checkpoints[round],
          early: false,
          fixture: makeFixture(),
        }));
        await executeBatch(root, index++, entries, evidence, timing);
      }
    }
    const first = scope
      ? selected[0]
      : routeHygieneCases.find((item) => item.id === "navigation-invitation");
    if (!first) throw new Error("Missing route-hygiene early-failure canary.");
    await executeBatch(
      root,
      index,
      [
        {
          item: first,
          point: first.checkpoints[0],
          early: true,
          fixture: makeFixture(),
        },
      ],
      evidence,
      timing,
    );
    console.log(
      `Actual route-test hygiene passed: ${selected.length} tests, ${timing.probes - 1} secret checkpoints, early-failure canary rejected.`,
    );
    console.log(
      `Route hygiene timing: probes=${timing.probes} total=${Math.round(timing.totalMs / 1000)}s test=${Math.round(timing.testMs / 1000)}s overhead=${Math.round((timing.totalMs - timing.testMs) / 1000)}s.`,
    );
  } finally {
    const destination = process.env.MIA_ROUTE_HYGIENE_REPORT;
    if (destination)
      await writeFile(
        destination,
        JSON.stringify(
          {
            phase: "scoped-deliberate-failure-scan",
            actualTestCount: routeHygieneCases.length,
            selectedTestCount: selected.length,
            scope: scope ?? "all",
            evidence,
          },
          null,
          2,
        ) + "\n",
      );
    await rm(root, { recursive: true, force: true });
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  await checkRouteSecretHygiene();
