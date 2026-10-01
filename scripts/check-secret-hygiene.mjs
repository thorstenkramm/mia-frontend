import { randomBytes, randomUUID } from "node:crypto";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

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
];

async function leakingArtifacts(directory) {
  const leaks = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      leaks.push(...(await leakingArtifacts(path)));
    } else {
      const content = await readFile(path);
      if (markers.some((marker) => content.includes(Buffer.from(marker))))
        leaks.push(path.slice(directory.length + 1));
    }
  }
  return leaks;
}

try {
  const result = spawnSync(
    join(process.cwd(), "node_modules", ".bin", "playwright"),
    ["test", "--config", "playwright.secret-hygiene.config.ts"],
    {
      cwd: process.cwd(),
      encoding: "buffer",
      env: {
        ...process.env,
        MIA_SECRET_HYGIENE_OUTPUT: outputDir,
        MIA_SECRET_HYGIENE_USERNAME: markers[0],
        MIA_SECRET_HYGIENE_PASSWORD: markers[1],
        MIA_SECRET_HYGIENE_RAW_ERROR: markers[2],
        MIA_SECRET_HYGIENE_MFA_CODE: markers[3],
        MIA_SECRET_HYGIENE_RECOVERY_CODE: markers[4],
        MIA_SECRET_HYGIENE_REPLACEMENT_PASSWORD: markers[5],
        MIA_SECRET_HYGIENE_RESET_TOKEN: markers[6],
        MIA_SECRET_HYGIENE_RESET_PASSWORD: markers[7],
      },
      maxBuffer: 16 * 1024 * 1024,
    },
  );
  // Every controlled test (sign-in flow, retained-secret assertion, and reset
  // token flow) must fail.
  if (
    result.error !== undefined ||
    result.status !== 1 ||
    !result.stdout.includes(Buffer.from("3 failed"))
  ) {
    throw new Error("Controlled failures did not each fail exactly once.");
  }
  const processLeak = markers.some(
    (marker) =>
      result.stdout.includes(Buffer.from(marker)) ||
      result.stderr.includes(Buffer.from(marker)),
  );
  const artifactLeaks = await leakingArtifacts(outputDir);
  if (processLeak || artifactLeaks.length > 0) {
    throw new Error(
      `Secret-hygiene scan found a controlled fixture marker (${processLeak ? "process" : ""}${processLeak && artifactLeaks.length > 0 ? "+" : ""}${artifactLeaks.length > 0 ? `artifact:${artifactLeaks.join(",")}` : ""}).`,
    );
  }

  // The token-bearing Vitest suites use the same shared assertion helpers as
  // these controlled unit failures; all four must fail without a marker leak.
  const unit = spawnSync(
    join(process.cwd(), "node_modules", ".bin", "vitest"),
    ["run", "--config", "vitest.secret-hygiene.config.ts"],
    {
      cwd: process.cwd(),
      encoding: "buffer",
      env: {
        ...process.env,
        NO_COLOR: "1",
        MIA_SECRET_HYGIENE_RESET_TOKEN: markers[6],
        MIA_SECRET_HYGIENE_RESET_PASSWORD: markers[7],
      },
      maxBuffer: 16 * 1024 * 1024,
    },
  );
  if (
    unit.error !== undefined ||
    unit.status !== 1 ||
    !/Tests\s+4 failed/u.test(unit.stdout.toString())
  ) {
    throw new Error("Controlled unit failures did not each fail exactly once.");
  }
  if (
    markers.some(
      (marker) =>
        unit.stdout.includes(Buffer.from(marker)) ||
        unit.stderr.includes(Buffer.from(marker)),
    )
  ) {
    throw new Error(
      "Secret-hygiene unit scan found a controlled fixture marker.",
    );
  }
  console.log("Secret-hygiene deliberate-failure scan passed.");
} finally {
  await rm(outputDir, { force: true, recursive: true });
}
