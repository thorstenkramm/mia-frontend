import { randomUUID, createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Execute the actual API test's request-contract assertion, not a parallel
// canary. Original process streams and reporter artifacts are scanned BEFORE
// parsing or summarizing. Never forward raw output, even if the probe leaks.
const directory = await mkdtemp(join(tmpdir(), "mia-invitation-unit-hygiene-"));
const email = `invitee-${randomUUID()}@example.test`;
const csrf = randomUUID();
const title = "creates only a supervisor invitation for the entered address";
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
try {
  const child = spawnSync(
    join(process.cwd(), "node_modules/.bin/vitest"),
    [
      "run",
      "src/platform/api/invitations.test.ts",
      "-t",
      title,
      "--reporter=default",
      "--reporter=json",
      `--outputFile.json=${join(directory, "report.json")}`,
    ],
    {
      encoding: "buffer",
      timeout: 60_000,
      maxBuffer: 16 * 1024 * 1024,
      env: {
        ...process.env,
        NO_COLOR: "1",
        FORCE_COLOR: "0",
        MIA_INVITATION_UNIT_EMAIL: email,
        MIA_INVITATION_UNIT_CSRF: csrf,
        MIA_INVITATION_UNIT_FAIL: "1",
      },
    },
  );
  const artifacts = await Promise.all(
    (await readdir(directory)).map((file) => readFile(join(directory, file))),
  );
  const stdout = child.stdout ?? Buffer.alloc(0);
  const stderr = child.stderr ?? Buffer.alloc(0);
  const leak = [email, csrf].some((marker) =>
    [stdout, stderr, ...artifacts].some((bytes) =>
      bytes.includes(Buffer.from(marker)),
    ),
  );
  const evidence = {
    case: "invitation-unit-request-contract",
    expectedExit: 1,
    actualExit: child.status,
    originalStdoutScanned: true,
    originalStderrScanned: true,
    originalArtifactCount: artifacts.length,
    markersScanned: 2,
    leakDetected: leak,
    stdoutSha256: digest(stdout),
    stderrSha256: digest(stderr),
    artifactSha256: digest(Buffer.concat(artifacts)),
    intendedAssertionFailed: false,
  };
  if (!leak && !child.error && child.status === 1) {
    const report = JSON.parse(
      await readFile(join(directory, "report.json"), "utf8"),
    );
    const failures = report.testResults
      .flatMap((result) => result.assertionResults)
      .filter((assertion) => assertion.status === "failed");
    evidence.intendedAssertionFailed =
      failures.length === 1 &&
      failures[0].title === title &&
      failures[0].failureMessages.some((message) =>
        message.includes("Invitation request contract"),
      );
  }
  const destination = process.env.MIA_INVITATION_UNIT_HYGIENE_REPORT;
  if (destination)
    await writeFile(destination, JSON.stringify(evidence, null, 2) + "\n");
  if (leak || !evidence.intendedAssertionFailed)
    throw new Error(
      "Invitation unit hygiene probe failed; see content-free evidence.",
    );
  console.log(
    "Invitation unit request-contract failure: original stdout/stderr and artifacts scanned; 2 markers absent; intended assertion failure confirmed.",
  );
} finally {
  await rm(directory, { recursive: true, force: true });
}
