import { spawn } from "node:child_process";
import { createConnection } from "node:net";
import { mkdir, mkdtemp, open, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { artifactBuffers, assertMarkerFree } from "./hygiene-output.mjs";

// One owner for both previews and the invocation(s) using them. Ports are
// deliberately fixed; an unrelated listener is never reused or terminated.
const commands = process.argv.slice(2);
const onlyOrdinaryPreview = commands[0] === "--only-4173";
if (onlyOrdinaryPreview) commands.shift();
if (commands[0] !== "--" || commands.length < 2)
  throw new Error(
    "Usage: node scripts/hygiene-preview.mjs -- <command> [args].",
  );
const builtIndex = await readFile("dist/index.html").catch(() => {
  throw new Error("Hygiene preview requires a completed build.");
});
const buildManifest = await readFile("dist/.vite/manifest.json", "utf8")
  .then((bytes) => JSON.parse(bytes))
  .catch(() => {
    throw new Error("Hygiene preview requires a valid build manifest.");
  });
if (typeof buildManifest?.["index.html"]?.file !== "string")
  throw new Error("Hygiene preview requires a valid build entry.");
const entry = buildManifest["index.html"].file;
if (
  !/^assets\/[a-zA-Z0-9_./-]+\.js$/u.test(entry) ||
  entry.includes("..") ||
  !builtIndex.includes(Buffer.from(`/${entry}`))
)
  throw new Error("Hygiene preview requires a valid built entry reference.");
const builtEntry = await readFile(join("dist", entry)).catch(() => {
  throw new Error("Hygiene preview requires built entry assets.");
});

async function occupied(port) {
  return new Promise((resolve) => {
    const socket = createConnection({ host: "127.0.0.1", port });
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => {
      socket.destroy();
      resolve(false);
    });
  });
}

const root = await mkdtemp(join(tmpdir(), "mia-hygiene-preview-"));
const children = [];
const logs = [];
const manifest = join(root, "markers.jsonl");
const artifacts = join(root, "artifacts");
await mkdir(artifacts);
let stopping = false;
let signalExit = 0;
let cleanupFailed = false;
let shutdown;
const timeoutMs = process.env.MIA_HYGIENE_TEST_TIMEOUT_MS
  ? Number(process.env.MIA_HYGIENE_TEST_TIMEOUT_MS)
  : 75 * 60_000;
if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1)
  throw new Error("Invalid hygiene preview timeout.");

function signalGroup(child, signal) {
  if (!child.pid) return;
  try {
    // A detached leader may already have exited while its group still owns
    // grandchildren. ESRCH, not the leader exit status, ends group ownership.
    process.kill(-child.pid, signal);
  } catch (error) {
    if (error.code !== "ESRCH") {
      console.error("Owned descendant termination failed (content-free).");
      cleanupFailed = true;
    }
  }
}
function stop(code = 1) {
  if (stopping) {
    if (signalExit === 0 && code !== 0) signalExit = code;
    return shutdown;
  }
  stopping = true;
  signalExit = code;
  for (const child of children) signalGroup(child, "SIGTERM");
  // Start escalation at cancellation, not after awaiting the worker's exit.
  shutdown = delay(350).then(() => {
    for (const child of children) signalGroup(child, "SIGKILL");
  });
  return shutdown;
}
function requireRunning() {
  if (stopping) throw new Error("Hygiene preview cancelled during startup.");
}
process.on("SIGINT", () => stop(130));
process.on("SIGTERM", () => stop(143));
const timeout = setTimeout(() => stop(124), timeoutMs);

async function startPreview(port) {
  const inUse = await occupied(port);
  requireRunning();
  if (inUse)
    throw new Error(
      "Required hygiene preview port is occupied; listener left untouched.",
    );
  const path = join(root, `preview-${port}.log`);
  const log = await open(path, "wx", 0o600);
  logs.push(log);
  requireRunning();
  const child = spawn(
    "npm",
    [
      "run",
      "preview",
      "--",
      "--host",
      "127.0.0.1",
      "--port",
      String(port),
      "--strictPort",
    ],
    {
      detached: true,
      stdio: ["ignore", log.fd, log.fd],
    },
  );
  let spawnFailed = false;
  child.once("error", () => {
    spawnFailed = true;
  });
  children.push(child);
  if (stopping) signalGroup(child, "SIGTERM");
  const attempts = process.env.MIA_HYGIENE_TEST_READINESS_ATTEMPTS
    ? Number(process.env.MIA_HYGIENE_TEST_READINESS_ATTEMPTS)
    : 100;
  if (!Number.isSafeInteger(attempts) || attempts < 1)
    throw new Error("Invalid hygiene preview readiness bound.");
  for (let attempt = 0; attempt < attempts && !stopping; attempt++) {
    if (child.exitCode !== null || spawnFailed) break;
    try {
      // A responsive port alone could be an unrelated listener that won a
      // preflight race. Require the owned preview's bind confirmation first.
      const output = await readFile(path);
      if (!output.includes(Buffer.from(`http://127.0.0.1:${port}/`))) {
        await delay(150);
        continue;
      }
      const response = await fetch(`http://127.0.0.1:${port}/`, {
        signal: AbortSignal.timeout(1000),
      });
      if (
        response.ok &&
        Buffer.from(await response.arrayBuffer()).equals(builtIndex)
      ) {
        const asset = await fetch(`http://127.0.0.1:${port}/${entry}`, {
          signal: AbortSignal.timeout(1000),
        });
        if (
          asset.ok &&
          Buffer.from(await asset.arrayBuffer()).equals(builtEntry)
        ) {
          requireRunning();
          return { path };
        }
      }
    } catch {
      // Readiness only; the owned child and timeout remain authoritative.
    }
    await delay(150);
  }
  throw new Error("Owned hygiene preview did not become ready.");
}

let result = 1;
let phase = "preflight";
let workerStarted = false;
try {
  phase = "preview-4173";
  const first = await startPreview(4173);
  requireRunning();
  phase = "preview-4174";
  const second = onlyOrdinaryPreview ? null : await startPreview(4174);
  requireRunning();
  phase = "worker";
  const workerStdout = await open(join(root, "worker.stdout"), "wx", 0o600);
  const workerStderr = await open(join(root, "worker.stderr"), "wx", 0o600);
  logs.push(workerStdout, workerStderr);
  requireRunning();
  const worker = spawn(commands[1], commands.slice(2), {
    detached: true,
    stdio: ["ignore", workerStdout.fd, workerStderr.fd],
    env: {
      ...process.env,
      MIA_HYGIENE_PREVIEW_4173: "1",
      ...(second ? { MIA_HYGIENE_PREVIEW_4174: "1" } : {}),
      MIA_HYGIENE_SERVER_LOGS: JSON.stringify(
        second ? [first.path, second.path] : [first.path],
      ),
      MIA_HYGIENE_MARKER_MANIFEST: manifest,
      MIA_HYGIENE_ARTIFACT_ROOT: artifacts,
    },
  });
  workerStarted = true;
  children.push(worker);
  if (stopping) signalGroup(worker, "SIGTERM");
  result = await new Promise((resolve) => {
    worker.once("error", () => resolve(1));
    worker.once("exit", (code) => resolve(code ?? 1));
  });
  if (stopping) result = signalExit;
  // No child bytes reach the parent. Scan original streams before emitting
  // only strictly shaped content-free summaries and timings.
} catch (error) {
  const category =
    error instanceof Error &&
    error.message.startsWith("Required hygiene preview port is occupied")
      ? "occupied-port"
      : error instanceof Error &&
          error.message.startsWith("Owned hygiene preview did not become ready")
        ? "readiness"
        : "other";
  console.error(
    `Owned hygiene preview or worker failed at ${phase}: ${category} (content-free).`,
  );
  result = signalExit || 1;
} finally {
  stop(result);
  await shutdown;
  clearTimeout(timeout);
  try {
    const recorded = await readFile(manifest, "utf8").catch((error) => {
      if (error.code === "ENOENT") return "";
      throw error;
    });
    const markers = recorded.trim()
      ? recorded
          .trimEnd()
          .split("\n")
          .flatMap((line) => JSON.parse(line))
      : [];
    const logs = await Promise.all(
      [4173, 4174].map((port) =>
        readFile(join(root, `preview-${port}.log`)).catch((error) => {
          if (error.code === "ENOENT") return Buffer.alloc(0);
          throw error;
        }),
      ),
    );
    const stdout = workerStarted
      ? await readFile(join(root, "worker.stdout"))
      : Buffer.alloc(0);
    const stderr = workerStarted
      ? await readFile(join(root, "worker.stderr"))
      : Buffer.alloc(0);
    assertMarkerFree(markers, [
      stdout,
      stderr,
      ...logs,
      ...(await artifactBuffers(artifacts)),
    ]);
    if (result === 0) {
      for (const line of stdout.toString("utf8").split("\n"))
        if (
          /^(?:TIMING stage=[\w:-]+ seconds=\d+|Hygiene inventory: \d+ browser cases and \d+ course-unit cases registered\.|Actual route-test hygiene passed: \d+ tests, \d+ secret checkpoints, early-failure canary rejected\.|Route hygiene timing: probes=\d+ total=\d+s test=\d+s overhead=\d+s\.|Course unit hygiene: \d+ actual tests, \d+ checkpoints; early-failure canary rejected; zero marker leaks\.|Course unit timing: probes=\d+ total=\d+s\.|Secret-hygiene timing: (?:playwright|vitest) (?:canary|baseline) run \d+s\.|(?:Route|Course-unit) evidence set: \d+ independent failures; sha256=[a-f0-9]{64}; one canary\.|BROWSER (?:E2E|secret hygiene) passed\.)$/u.test(
            line,
          )
        )
          console.log(line);
    }
  } catch {
    console.error("Owned hygiene output scan failed (content-free).");
    result = 1;
  }
  if (workerStarted && result !== 0) {
    const stderr = await readFile(join(root, "worker.stderr")).catch(() =>
      Buffer.alloc(0),
    );
    const stage = stderr
      .toString("utf8")
      .match(
        /^GATE_FAILURE stage=(browser-install|e2e|secret-hygiene|evidence-compare)$/mu,
      )?.[1];
    console.error(
      `Owned hygiene worker did not complete successfully at ${stage ?? "worker"} (content-free).`,
    );
  }
  await Promise.all(logs.map((log) => log.close()));
  await rm(root, { recursive: true, force: true });
}
if (cleanupFailed) result = 1;
if (signalExit !== 0 && result === 0) result = signalExit;
process.exitCode = result;
