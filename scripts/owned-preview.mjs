import { spawn } from "node:child_process";
import { createConnection } from "node:net";
import { mkdtemp, open, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

// One owner for the preview and the invocation using it. The port is
// deliberately fixed; an unrelated listener is never reused or terminated.
const commands = process.argv.slice(2);
if (commands[0] !== "--" || commands.length < 2)
  throw new Error("Usage: node scripts/owned-preview.mjs -- <command> [args].");
const builtIndex = await readFile("dist/index.html").catch(() => {
  throw new Error("Owned preview requires a completed build.");
});
const buildManifest = await readFile("dist/.vite/manifest.json", "utf8")
  .then((bytes) => JSON.parse(bytes))
  .catch(() => {
    throw new Error("Owned preview requires a valid build manifest.");
  });
if (typeof buildManifest?.["index.html"]?.file !== "string")
  throw new Error("Owned preview requires a valid build entry.");
const entry = buildManifest["index.html"].file;
if (
  !/^assets\/[a-zA-Z0-9_./-]+\.js$/u.test(entry) ||
  entry.includes("..") ||
  !builtIndex.includes(Buffer.from(`/${entry}`))
)
  throw new Error("Owned preview requires a valid built entry reference.");
const builtEntry = await readFile(join("dist", entry)).catch(() => {
  throw new Error("Owned preview requires built entry assets.");
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

const root = await mkdtemp(join(tmpdir(), "mia-owned-preview-"));
const children = [];
const logs = [];
let stopping = false;
let signalExit = 0;
let cleanupFailed = false;
let shutdown;
const timeoutMs = process.env.MIA_PREVIEW_TEST_TIMEOUT_MS
  ? Number(process.env.MIA_PREVIEW_TEST_TIMEOUT_MS)
  : 75 * 60_000;
if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1)
  throw new Error("Invalid owned preview timeout.");

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
  if (stopping) throw new Error("Owned preview cancelled during startup.");
}
process.on("SIGINT", () => stop(130));
process.on("SIGTERM", () => stop(143));
const timeout = setTimeout(() => stop(124), timeoutMs);

async function startPreview(port) {
  const inUse = await occupied(port);
  requireRunning();
  if (inUse)
    throw new Error(
      "Required owned preview port is occupied; listener left untouched.",
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
  const attempts = process.env.MIA_PREVIEW_TEST_READINESS_ATTEMPTS
    ? Number(process.env.MIA_PREVIEW_TEST_READINESS_ATTEMPTS)
    : 100;
  if (!Number.isSafeInteger(attempts) || attempts < 1)
    throw new Error("Invalid owned preview readiness bound.");
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
          return;
        }
      }
    } catch {
      // Readiness only; the owned child and timeout remain authoritative.
    }
    await delay(150);
  }
  throw new Error("Owned preview did not become ready.");
}

let result = 1;
let phase = "preflight";
try {
  phase = "preview-4173";
  await startPreview(4173);
  requireRunning();
  phase = "worker";
  const worker = spawn(commands[1], commands.slice(2), {
    detached: true,
    stdio: "inherit",
    env: { ...process.env, MIA_OWNED_PREVIEW: "1" },
  });
  children.push(worker);
  if (stopping) signalGroup(worker, "SIGTERM");
  result = await new Promise((resolve) => {
    worker.once("error", () => resolve(1));
    worker.once("exit", (code) => resolve(code ?? 1));
  });
  if (stopping) result = signalExit;
} catch (error) {
  const category =
    error instanceof Error &&
    error.message.startsWith("Required owned preview port is occupied")
      ? "occupied-port"
      : error instanceof Error &&
          error.message.startsWith("Owned preview did not become ready")
        ? "readiness"
        : "other";
  console.error(`Owned preview or worker failed at ${phase}: ${category}.`);
  result = signalExit || 1;
} finally {
  stop(result);
  await shutdown;
  clearTimeout(timeout);
  await Promise.all(logs.map((log) => log.close()));
  await rm(root, { recursive: true, force: true });
}
if (cleanupFailed) result = 1;
if (signalExit !== 0 && result === 0) result = signalExit;
process.exitCode = result;
