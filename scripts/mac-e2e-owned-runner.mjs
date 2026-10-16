import { spawn } from "node:child_process";
import { open } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";

// The macOS exact-commit verifier owns one process group for install/build/E2E.
// During E2E, owned-preview.mjs in that group owns its detached descendants.
const [checkout, logPath] = process.argv.slice(2);
if (!checkout || !logPath || process.argv.length !== 4)
  throw new Error("Expected checkout and private log path.");
const log = await open(logPath, "w", 0o600);
const worker = spawn(
  "bash",
  [
    "-e",
    "-c",
    "npm ci && npx playwright install chromium && npm run build && MIA_PRESENTATION_MATRIX=full npm run check:browser-gate:built",
  ],
  { cwd: checkout, detached: true, stdio: ["ignore", log.fd, log.fd] },
);
let cancellation = 0;
let exited = false;
let escalation;
function signalGroup(signal) {
  if (!worker.pid) return;
  try {
    process.kill(-worker.pid, signal);
  } catch (error) {
    if (error.code !== "ESRCH") throw error;
  }
}
for (const [signal, code] of [
  ["SIGINT", 130],
  ["SIGTERM", 143],
]) {
  process.on(signal, () => {
    if (cancellation) return;
    cancellation = code;
    signalGroup("SIGTERM");
    escalation = setTimeout(() => {
      if (!exited) signalGroup("SIGKILL");
    }, 10_000);
  });
}
const result = await new Promise((resolve) => {
  worker.once("error", () => resolve(1));
  worker.once("exit", (code) => resolve(code ?? 1));
});
exited = true;
clearTimeout(escalation);
if (cancellation) {
  // A shell can exit before its descendants finish cleaning up. Do not remove
  // the checkout until owned-preview's TERM path has had bounded time to run.
  await delay(3_000);
}
await log.close();
process.exitCode = cancellation || result;
