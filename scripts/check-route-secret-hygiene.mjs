import { randomBytes, randomUUID, createHash } from "node:crypto";
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
import { spawnSync } from "node:child_process";
import { routeHygieneCases } from "./route-secret-hygiene-cases.ts";

const digest = (value) => createHash("sha256").update(value).digest("hex");
const executable = join(process.cwd(), "node_modules", ".bin", "playwright");
function specs(suites) {
  return suites.flatMap((suite) => [
    ...suite.specs,
    ...specs(suite.suites ?? []),
  ]);
}
function makeFixture() {
  const randomAlphabet = (alphabet, size) =>
    Array.from(
      randomBytes(size),
      (byte) => alphabet[byte % alphabet.length],
    ).join("");
  const fixture = {
    csrf: randomUUID(),
    invitationToken: randomUUID(),
    password: `fixture-${randomBytes(24).toString("hex")}`,
    mfaCode: String(randomBytes(4).readUInt32BE() % 1_000_000).padStart(6, "0"),
    totpSecret: randomAlphabet("ABCDEFGHIJKLMNOPQRSTUVWXYZ234567", 32),
    codes: Array.from({ length: 10 }, () =>
      randomAlphabet("0123456789ABCDEFGHJKMNPQRSTVWXYZ", 16),
    ),
    rawError: `fixture-body-${randomBytes(24).toString("hex")}`,
    email: `invitee-${randomBytes(12).toString("hex")}@example.test`,
    courseName: `درس course-${randomUUID()}`,
    supervisorUsername: `supervisor.${randomUUID().slice(0, 12)}`,
    teachingText: `تعليم teaching-${randomUUID()}`,
  };
  const uri = `otpauth://totp/MIA%20(127.0.0.1:4173):example.learner?secret=${fixture.totpSecret}&issuer=MIA`;
  return {
    fixture,
    markers: [
      fixture.csrf,
      fixture.invitationToken,
      fixture.password,
      fixture.mfaCode,
      fixture.totpSecret,
      fixture.rawError,
      fixture.email,
      fixture.courseName,
      fixture.supervisorUsername,
      fixture.teachingText,
      uri,
      ...fixture.codes,
      ...fixture.codes.map((code) => code.replace(/(.{4})(?=.)/gu, "$1-")),
    ],
  };
}
async function artifactBuffers(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) result.push(...(await artifactBuffers(path)));
    else result.push(await readFile(path));
  }
  return result;
}
function parsedReport(bytes) {
  try {
    return JSON.parse(bytes.toString("utf8"));
  } catch {
    throw new Error(
      "Route-hygiene original JSON report is missing or invalid.",
    );
  }
}

export async function checkRouteSecretHygiene() {
  // Validate inventory against actual registered tests before launching probes.
  const listed = spawnSync(
    executable,
    [
      "test",
      "e2e/routeNavigation.spec.ts",
      "e2e/routeRecovery.spec.ts",
      "e2e/invitationAdministration.spec.ts",
      "e2e/courseAdministration.spec.ts",
      "e2e/coursePreparation.spec.ts",
      "e2e/courseActivation.spec.ts",
      "e2e/materialPreparation.spec.ts",
      "--list",
      "--reporter=json",
    ],
    { encoding: "buffer", timeout: 30_000, maxBuffer: 16 * 1024 * 1024 },
  );
  if (listed.error || listed.status !== 0)
    throw new Error("Could not inventory actual route tests.");
  const onboarding = spawnSync(
    executable,
    [
      "test",
      "e2e/scaffold.spec.ts",
      "--grep",
      "supervisor onboarding handoff",
      "--list",
      "--reporter=json",
    ],
    { encoding: "buffer", timeout: 30_000, maxBuffer: 16 * 1024 * 1024 },
  );
  if (onboarding.error || onboarding.status !== 0)
    throw new Error("Could not inventory actual supervisor handoff tests.");
  const actual = [
    ...specs(parsedReport(listed.stdout).suites),
    ...specs(parsedReport(onboarding.stdout).suites),
  ]
    .map((spec) => spec.title)
    .sort();
  const inventory = routeHygieneCases.map((item) => item.title).sort();
  if (JSON.stringify(actual) !== JSON.stringify(inventory))
    throw new Error(
      "The route-hygiene inventory does not cover every actual new browser test exactly once.",
    );
  const scope = process.env.MIA_ROUTE_HYGIENE_SCOPE;
  if (
    scope !== undefined &&
    scope !== "invitations" &&
    scope !== "supervisor-onboarding" &&
    scope !== "courses" &&
    scope !== "preparation" &&
    scope !== "materials" &&
    scope !== "activation"
  )
    throw new Error("Unknown route-hygiene scope.");
  const selected =
    scope === "activation"
      ? routeHygieneCases.filter((item) =>
          item.id.startsWith("preparation-activation-"),
        )
      : scope === "materials"
        ? routeHygieneCases.filter((item) => item.id.startsWith("material-"))
        : scope === "preparation"
          ? routeHygieneCases.filter((item) =>
              item.id.startsWith("preparation-"),
            )
          : scope === "invitations"
            ? routeHygieneCases.filter((item) =>
                item.id.startsWith("invitation-"),
              )
            : scope === "supervisor-onboarding"
              ? routeHygieneCases.filter((item) =>
                  item.id.startsWith("supervisor-"),
                )
              : scope === "courses"
                ? routeHygieneCases.filter((item) =>
                    item.id.startsWith("course-"),
                  )
                : routeHygieneCases;
  const root = await mkdtemp(join(tmpdir(), "mia-route-hygiene-"));
  const evidence = [];
  try {
    const probes = selected.flatMap((item) =>
      item.checkpoints.map((point) => ({ item, point, early: false })),
    );
    const first =
      scope !== undefined
        ? selected[0]
        : routeHygieneCases.find((item) => item.id === "navigation-invitation");
    if (!first) throw new Error("Missing route-hygiene early-failure canary.");
    probes.push({ item: first, point: first.checkpoints[0], early: true });
    for (const [index, { item, point, early }] of probes.entries()) {
      const directory = join(root, String(index));
      const artifacts = join(directory, "artifacts");
      const checkpoints = join(directory, "checkpoints");
      await mkdir(artifacts, { recursive: true });
      await mkdir(checkpoints);
      const { fixture, markers } = makeFixture();
      const child = spawnSync(
        executable,
        ["test", "--config", "playwright.route-secret-hygiene.config.ts"],
        {
          encoding: "buffer",
          timeout: 120_000,
          maxBuffer: 16 * 1024 * 1024,
          env: {
            ...process.env,
            PLAYWRIGHT_NO_COPY_PROMPT: "1",
            NO_COLOR: "1",
            FORCE_COLOR: "0",
            MIA_ROUTE_HYGIENE_CASE: item.id,
            MIA_ROUTE_HYGIENE_POINT: point,
            MIA_ROUTE_HYGIENE_EARLY: early ? "1" : "0",
            MIA_ROUTE_HYGIENE_FIXTURE: JSON.stringify(fixture),
            MIA_ROUTE_HYGIENE_OUTPUT: artifacts,
            MIA_ROUTE_HYGIENE_EVIDENCE: checkpoints,
          },
        },
      );
      // Scan FULL ORIGINAL process streams and artifacts before parsing,
      // summarizing or removing anything. Never forward child output, even on
      // infrastructure failure or leak. No markers enter the retained evidence.
      const originals = await artifactBuffers(directory);
      const stdout = child.stdout ?? Buffer.alloc(0);
      const stderr = child.stderr ?? Buffer.alloc(0);
      const leak = markers.some((marker) =>
        [stdout, stderr, ...originals].some((bytes) =>
          bytes.includes(Buffer.from(marker)),
        ),
      );
      const record = {
        case: item.id,
        checkpoint: point,
        earlyCanary: early,
        originalStdoutScanned: true,
        originalStderrScanned: true,
        originalArtifactCount: originals.length,
        markersScanned: markers.length,
        stdoutSha256: digest(stdout),
        stderrSha256: digest(stderr),
        artifactSha256: digest(Buffer.concat(originals)),
        leakDetected: leak,
        checkpointReached: false,
        expectedFailureIdentity: false,
        status: "pending",
      };
      evidence.push(record);
      if (leak) {
        record.status = "leak";
        throw new Error(
          `Route-hygiene fixture leak in content-free case ${item.id}/${point}.`,
        );
      }
      if (child.error || child.status !== 1) {
        record.status = "infrastructure-failure";
        throw new Error(
          `Route-hygiene execution did not finish normally for ${item.id}/${point}.`,
        );
      }
      const report = parsedReport(
        await readFile(join(artifacts, "report.json")),
      );
      const results = specs(report.suites).flatMap((spec) =>
        spec.tests.map((test) => ({
          title: spec.title,
          attempts: test.results,
        })),
      );
      const result = results[0];
      const errors = result?.attempts[0]?.errors ?? [];
      const id = `${item.id}:${point}`;
      let checkpoint = null;
      try {
        checkpoint = await readFile(join(checkpoints, "checkpoint"), "utf8");
      } catch (error) {
        if (error.code !== "ENOENT")
          throw new Error("Could not read route-hygiene checkpoint.");
      }
      record.checkpointReached = checkpoint === id;
      // Retain only public source coordinates and content-free classifications,
      // never messages/stacks/bodies. An absent checkpoint must be diagnosable.
      record.failureCategory = errors.some((error) =>
        error.message?.includes("Timeout"),
      )
        ? "timeout"
        : errors.some((error) => error.message?.includes("AssertionError"))
          ? "assertion"
          : "other";
      record.failureSourceLocations = [
        ...new Set(
          errors.flatMap(
            (error) =>
              (error.stack ?? error.message ?? "").match(
                /(?:e2e|src)\/[\w./-]+:\d+:\d+/gu,
              ) ?? [],
          ),
        ),
      ];
      record.expectedFailureIdentity =
        results.length === 1 &&
        result.title === item.title &&
        result.attempts.length === 1 &&
        result.attempts[0].status === "failed" &&
        errors.length === 1 &&
        errors[0].message?.includes(`ControlledRouteHygieneFailure:${id}\n`) ===
          true;
      if (early) {
        if (
          checkpoint !== null ||
          record.expectedFailureIdentity ||
          results.length !== 1 ||
          errors.length !== 1 ||
          !errors[0].message?.includes("ControlledRouteHygieneEarlyFailure:")
        )
          throw new Error(
            "The route-hygiene early-failure canary was not rejected correctly.",
          );
        record.status = "early-failure-rejected";
      } else {
        if (!record.checkpointReached || !record.expectedFailureIdentity) {
          record.status = "wrong-failure";
          throw new Error(
            `Missing intended checkpoint/failure identity for ${item.id}/${point}; checkpointReached=${record.checkpointReached}; failureIdentity=${record.expectedFailureIdentity}; category=${record.failureCategory}.`,
          );
        }
        record.status = "pass";
      }
      console.log(
        `Route hygiene ${item.id}/${point}: ${record.status}; original output/artifacts marker-free.`,
      );
      await rm(directory, { recursive: true, force: true });
    }
    console.log(
      `Actual route-test hygiene passed: ${selected.length} tests, ${probes.length - 1} secret checkpoints, early-failure canary rejected.`,
    );
  } finally {
    const destination = process.env.MIA_ROUTE_HYGIENE_REPORT;
    if (destination)
      await writeFile(
        destination,
        JSON.stringify(
          {
            phase: "scoped-deliberate-failure-scan",
            actualTestCount: inventory.length,
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
