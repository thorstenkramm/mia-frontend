import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import {
  browserCases,
  unitCases,
  courseUnitCases,
} from "./secret-hygiene-evidence.ts";
import { checkRouteSecretHygiene } from "./check-route-secret-hygiene.mjs";

const outputDir = await mkdtemp(join(tmpdir(), "mia-secret-hygiene-"));
const recoveryAlphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const markers = [
  `username-${randomBytes(24).toString("hex")}`,
  `password-${randomBytes(24).toString("hex")}`,
  `raw-error-${randomBytes(24).toString("hex")}`,
  String(randomBytes(4).readUInt32BE() % 1_000_000).padStart(6, "0"),
  Array.from(
    randomBytes(16),
    (byte) => recoveryAlphabet[byte % recoveryAlphabet.length],
  ).join(""),
  `replacement-password-${randomBytes(24).toString("hex")}`,
  // A reset token must be a canonical lowercase UUID v4 to be captured at all.
  randomUUID(),
  `reset-password-${randomBytes(24).toString("hex")}`,
  // An invitation token must also be a canonical lowercase UUID v4.
  randomUUID(),
  `invitation-password-${randomBytes(24).toString("hex")}`,
];
const base32Alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const totpSecret = Array.from(
  randomBytes(32),
  (byte) => base32Alphabet[byte % base32Alphabet.length],
).join("");
// The URI marker carries its own unique host so it is distinct from the secret.
const totpUri = `otpauth://totp/MIA%20(mia-${randomBytes(12).toString("hex")}.example.test):example.learner?secret=${totpSecret}&issuer=MIA`;
const recoveryCodeSet = Array.from({ length: 10 }, () =>
  Array.from(
    randomBytes(16),
    (byte) => recoveryAlphabet[byte % recoveryAlphabet.length],
  ).join(""),
);
markers.push(
  totpSecret,
  totpUri,
  ...recoveryCodeSet,
  ...recoveryCodeSet.map((code) => code.replace(/(.{4})(?=.)/gu, "$1-")),
);
const mfaEnrollmentEnvironment = {
  MIA_SECRET_HYGIENE_TOTP_SECRET: totpSecret,
  MIA_SECRET_HYGIENE_TOTP_URI: totpUri,
  MIA_SECRET_HYGIENE_RECOVERY_CODE_SET: recoveryCodeSet.join(","),
};

async function leakingArtifacts(directory) {
  const leaks = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      leaks.push(...(await leakingArtifacts(path)));
    } else {
      const content = await readFile(path);
      if (markers.some((marker) => content.includes(Buffer.from(marker))))
        leaks.push(true);
    }
  }
  return leaks;
}

const fixtureEnvironment = {
  ...process.env,
  MIA_SECRET_HYGIENE_USERNAME: markers[0],
  MIA_SECRET_HYGIENE_PASSWORD: markers[1],
  MIA_SECRET_HYGIENE_RAW_ERROR: markers[2],
  MIA_SECRET_HYGIENE_MFA_CODE: markers[3],
  MIA_SECRET_HYGIENE_RECOVERY_CODE: markers[4],
  MIA_SECRET_HYGIENE_REPLACEMENT_PASSWORD: markers[5],
  MIA_SECRET_HYGIENE_RESET_TOKEN: markers[6],
  MIA_SECRET_HYGIENE_RESET_PASSWORD: markers[7],
  MIA_SECRET_HYGIENE_INVITATION_TOKEN: markers[8],
  MIA_SECRET_HYGIENE_INVITATION_PASSWORD: markers[9],
  ...mfaEnrollmentEnvironment,
};

function browserResults(suites) {
  return suites.flatMap((suite) => [
    ...suite.specs.flatMap((spec) =>
      spec.tests.map((test) => ({
        id: spec.title,
        attempts: test.results.length,
        status: test.results[0]?.status,
        errors:
          test.results[0]?.errors.map((error) => error.message ?? "") ?? [],
      })),
    ),
    ...browserResults(suite.suites ?? []),
  ]);
}

async function runFailures(runner, earlyId) {
  const directory = join(outputDir, `${runner}-${earlyId ?? "baseline"}`);
  const evidence = join(directory, "checkpoints");
  await mkdir(evidence, { recursive: true });
  const artifacts = join(directory, "artifacts");
  await mkdir(artifacts);
  const reportFile = join(artifacts, "report.json");
  const args =
    runner === "playwright"
      ? ["test", "--config", "playwright.secret-hygiene.config.ts"]
      : [
          "run",
          "--config",
          "vitest.secret-hygiene.config.ts",
          "--reporter=default",
          "--reporter=json",
          `--outputFile.json=${reportFile}`,
        ];
  const result = spawnSync(
    join(process.cwd(), "node_modules", ".bin", runner),
    args,
    {
      cwd: process.cwd(),
      encoding: "buffer",
      env: {
        ...fixtureEnvironment,
        NO_COLOR: "1",
        MIA_SECRET_HYGIENE_OUTPUT: artifacts,
        MIA_SECRET_HYGIENE_EVIDENCE: evidence,
        MIA_SECRET_HYGIENE_EARLY_FAILURE: earlyId ?? "",
      },
      maxBuffer: 16 * 1024 * 1024,
      timeout: 180_000,
    },
  );
  // Never forward child output or artifact names, including on infrastructure failure.
  const processLeak = markers.some(
    (marker) =>
      result.stdout?.includes(Buffer.from(marker)) ||
      result.stderr?.includes(Buffer.from(marker)),
  );
  const artifactLeaks = await leakingArtifacts(directory);
  if (processLeak || artifactLeaks.length > 0) {
    throw new Error("Secret-hygiene scan found a controlled fixture marker.");
  }
  if (result.error || result.status !== 1) {
    throw new Error(
      `The ${runner} controlled failure run did not finish normally.`,
    );
  }
  let report;
  try {
    report = JSON.parse(await readFile(reportFile, "utf8"));
  } catch {
    throw new Error(`The ${runner} hygiene report is missing or invalid.`);
  }
  const cases = runner === "playwright" ? browserCases : unitCases;
  const results =
    runner === "playwright"
      ? browserResults(report.suites)
      : report.testResults.flatMap((suite) =>
          suite.assertionResults.map((test) => ({
            id: test.title,
            attempts: 1,
            status: test.status,
            errors: test.failureMessages,
          })),
        );
  if (
    results.length !== cases.length ||
    results.some(
      (result) => result.status !== "failed" || result.attempts !== 1,
    )
  )
    throw new Error(
      `The ${runner} cases did not each fail exactly once (${cases.map((id) => `${id}: ${results.filter((result) => result.id === id && result.status === "failed").length} failed`).join("; ")}).`,
    );
  const rejected = [];
  for (const id of cases) {
    const matches = results.filter((result) => result.id === id);
    const checkpoint = await readFile(
      join(evidence, `${id}.checkpoint`),
      "utf8",
    ).catch((error) => {
      if (error.code === "ENOENT") return null;
      throw new Error("Could not read hygiene checkpoint.");
    });
    if (
      matches.length !== 1 ||
      checkpoint !== id ||
      matches[0].errors.length !== 1 ||
      !matches[0].errors[0].includes(`ControlledHygieneFailure:${id}\n`)
    )
      rejected.push(id);
  }
  return rejected;
}

async function checkCourseUnitHygiene() {
  const selected =
    process.env.MIA_SECRET_HYGIENE_SCOPE === "learn-unit"
      ? courseUnitCases.filter((item) => item.title.startsWith("Learn "))
      : process.env.MIA_SECRET_HYGIENE_SCOPE === "tutoring-unit"
        ? courseUnitCases.filter((item) => item.title.startsWith("Tutoring "))
        : process.env.MIA_SECRET_HYGIENE_SCOPE === "activation-unit"
          ? courseUnitCases.filter(
              (item) =>
                item.file === "src/app/routes/courseActivation.test.tsx" ||
                (item.file === "src/platform/api/courses.test.ts" &&
                  item.title.startsWith("activation ")) ||
                item.title.startsWith("readiness retains server false"),
            )
          : process.env.MIA_SECRET_HYGIENE_SCOPE === "material-unit"
            ? courseUnitCases.filter((item) =>
                item.title.startsWith("material "),
              )
            : process.env.MIA_SECRET_HYGIENE_SCOPE === "preparation-unit"
              ? courseUnitCases.filter(
                  (item) =>
                    item.title.startsWith("preparation ") ||
                    item.title.startsWith("hub "),
                )
              : courseUnitCases;
  const probes = selected.flatMap((item) =>
    item.points.map((point) => ({ item, point, early: false })),
  );
  probes.push({
    item: selected[0],
    point: selected[0].points[0],
    early: true,
  });
  for (const [index, { item, point, early }] of probes.entries()) {
    const directory = join(outputDir, `course-unit-${index}`);
    await mkdir(directory);
    const reportFile = join(directory, "report.json");
    const fixture = {
      name: `course-${randomUUID()}`,
      username: `supervisor.${randomUUID().slice(0, 12)}`,
      csrf: randomUUID(),
      rawError: `body-${randomUUID()}`,
      teachingText: `teaching-${randomUUID()}`,
    };
    const result = spawnSync(
      join(process.cwd(), "node_modules", ".bin", "vitest"),
      [
        "run",
        item.file,
        "-t",
        `^${item.title}$`,
        "--reporter=json",
        `--outputFile=${reportFile}`,
      ],
      {
        encoding: "buffer",
        timeout: 60_000,
        maxBuffer: 16 * 1024 * 1024,
        env: {
          ...process.env,
          NO_COLOR: "1",
          MIA_COURSE_UNIT_NAME: fixture.name,
          MIA_COURSE_UNIT_USERNAME: fixture.username,
          MIA_COURSE_UNIT_CSRF: fixture.csrf,
          MIA_COURSE_UNIT_RAW: fixture.rawError,
          MIA_COURSE_UNIT_TEXT: fixture.teachingText,
          MIA_COURSE_UNIT_POINT: point,
          MIA_COURSE_UNIT_EARLY: early ? "1" : "0",
          MIA_SECRET_HYGIENE_EVIDENCE: directory,
        },
      },
    );
    // Scan the original unredacted process output and every generated artifact.
    const buffers = [result.stdout, result.stderr];
    for (const file of await readdir(directory))
      buffers.push(await readFile(join(directory, file)));
    if (
      Object.values(fixture).some((marker) =>
        buffers.some((bytes) => bytes?.includes(Buffer.from(marker))),
      )
    )
      throw new Error("Course unit hygiene marker leak.");
    if (result.error || result.status !== 1)
      throw new Error(
        "Course unit deliberate failure did not finish normally.",
      );
    const report = JSON.parse(await readFile(reportFile, "utf8"));
    const failures = report.testResults
      .flatMap((suite) => suite.assertionResults)
      .filter((test) => test.status === "failed");
    const checkpoint = await readFile(
      join(directory, "course.checkpoint"),
      "utf8",
    ).catch((error) => {
      if (error.code === "ENOENT") return null;
      throw error;
    });
    const accepted =
      failures.length === 1 &&
      failures[0].title === item.title &&
      checkpoint === point &&
      failures[0].failureMessages.some((message) =>
        message.includes(`ControlledCourseUnitFailure:${point}`),
      );
    if (early ? accepted || checkpoint !== null : !accepted)
      throw new Error(
        `Course unit checkpoint/failure inventory mismatch: ${item.title}/${point}; checkpointReached=${checkpoint === point}; failureIdentity=${accepted}; failures=${failures.length}; early=${early}.`,
      );
  }
  console.log(
    `Course unit hygiene: ${selected.length} actual tests, ${probes.length - 1} checkpoints; early-failure canary rejected; zero marker leaks.`,
  );
}

try {
  await checkCourseUnitHygiene();
  if (
    ![
      "course-unit",
      "learn-unit",
      "tutoring-unit",
      "preparation-unit",
      "material-unit",
      "activation-unit",
    ].includes(process.env.MIA_SECRET_HYGIENE_SCOPE)
  ) {
    for (const [runner, cases] of [
      ["playwright", browserCases],
      ["vitest", unitCases],
    ]) {
      const rejected = await runFailures(runner);
      if (rejected.length)
        throw new Error(
          `Missing checkpoint or deliberate failure identity: ${rejected.join(", ")}.`,
        );
      // Preserve the same failed-case count while replacing one intended failure
      // with an early fixture failure. The identity gate must reject exactly it.
      const earlyId = cases[0];
      const earlyRejected = await runFailures(runner, earlyId);
      if (earlyRejected.length !== 1 || earlyRejected[0] !== earlyId)
        throw new Error(
          `The ${runner} early-failure canary was not rejected correctly.`,
        );
      console.log(
        `${runner}: checkpoints and failure identities verified; early-failure canary rejected.`,
      );
    }
    await checkRouteSecretHygiene();
    console.log("Secret-hygiene deliberate-failure scan passed.");
  }
} finally {
  await rm(outputDir, { force: true, recursive: true });
}
