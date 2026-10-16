import { appendFile, readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

// Read original bytes, before any reporter normalization or cleanup. Never print them.
export async function artifactBuffers(directory) {
  const buffers = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) buffers.push(...(await artifactBuffers(path)));
    else buffers.push(await readFile(path));
  }
  return buffers;
}

export async function serverBuffers() {
  const raw = process.env.MIA_HYGIENE_SERVER_LOGS;
  if (!raw) return [];
  let paths;
  try {
    paths = JSON.parse(raw);
  } catch {
    throw new Error("Malformed owned preview log paths.");
  }
  if (
    !Array.isArray(paths) ||
    ![1, 2].includes(paths.length) ||
    paths.some((path) => typeof path !== "string")
  )
    throw new Error("Malformed owned preview log paths.");
  return Promise.all(paths.map((path) => readFile(path)));
}

export async function recordMarkers(markers) {
  const manifest = process.env.MIA_HYGIENE_MARKER_MANIFEST;
  if (manifest)
    await appendFile(manifest, `${JSON.stringify(markers)}\n`, { mode: 0o600 });
}

export function assertMarkerFree(markers, buffers) {
  if (
    markers.some((marker) =>
      buffers.some((bytes) => bytes?.includes(Buffer.from(marker))),
    )
  )
    throw new Error("Hygiene scan found a controlled fixture marker.");
}

export function parseReport(bytes, runner) {
  try {
    const report = JSON.parse(bytes.toString("utf8"));
    if (typeof report !== "object" || report === null) throw new Error();
    return report;
  } catch {
    throw new Error(`The ${runner} hygiene report is missing or invalid.`);
  }
}

export function reconcileResults(
  expected,
  results,
  checkpointRecords,
  failurePrefix,
  earlyId,
) {
  if (
    results.length !== expected.length ||
    checkpointRecords.length !== expected.length - (earlyId ? 1 : 0)
  )
    throw new Error("Hygiene result/checkpoint count mismatch.");
  const expectedIds = new Set(expected);
  if (expectedIds.size !== expected.length)
    throw new Error("Duplicate hygiene inventory identity.");
  const seen = new Set();
  for (const result of results) {
    if (!expectedIds.has(result.id))
      throw new Error("Hygiene unexpected result identity.");
    if (seen.has(result.id))
      throw new Error("Hygiene duplicate result identity.");
    if (result.attempts.length !== 1)
      throw new Error("Hygiene retried or missing result attempt.");
    if (result.attempts[0]?.status !== "failed")
      throw new Error("Hygiene skipped or passing result.");
    if (result.errors.length !== 1)
      throw new Error("Hygiene failure count mismatch.");
    seen.add(result.id);
    const reached = checkpointRecords.filter((record) => record === result.id);
    if (result.id === earlyId) {
      if (reached.length !== 0 || !result.errors[0].includes("EarlyFailure:"))
        throw new Error(
          "Hygiene early-failure canary did not reject the checkpoint.",
        );
    } else if (
      reached.length !== 1 ||
      !result.errors[0].includes(`${failurePrefix}:${result.id}\n`)
    )
      throw new Error("Hygiene checkpoint/failure identity mismatch.");
  }
  if (
    checkpointRecords.some(
      (record) => record !== "" && !expectedIds.has(record),
    )
  )
    throw new Error("Unexpected hygiene checkpoint identity.");
}
