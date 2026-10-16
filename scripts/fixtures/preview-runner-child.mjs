import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const [mode, directory] = process.argv.slice(2);
if (!directory) process.exit(2);
if (["leader-exits", "leader-fails", "term-resistant"].includes(mode)) {
  if (mode === "term-resistant") {
    process.on("SIGTERM", () => undefined);
    process.on("SIGINT", () => undefined);
  }
  const descendant = spawn(
    process.execPath,
    [
      new URL("./preview-descendant.mjs", import.meta.url).pathname,
      directory,
      mode,
    ],
    {
      stdio: "ignore",
    },
  );
  descendant.unref();
  let ready = false;
  for (let attempt = 0; attempt < 100 && !ready; attempt++) {
    ready = await readFile(join(directory, "descendant.pid")).then(
      () => true,
      () => false,
    );
    if (!ready) await delay(20);
  }
  if (!ready) process.exit(2);
  if (mode === "leader-fails") process.exit(7);
  if (mode === "term-resistant") setInterval(() => undefined, 1000);
}
if (mode === "gate-failure") {
  process.stderr.write("Worker failed with useful diagnostics.\n");
  process.exitCode = 7;
}
if (mode === "linger") {
  await writeFile(join(directory, "worker.pid"), String(process.pid));
  setInterval(() => undefined, 1000);
}
