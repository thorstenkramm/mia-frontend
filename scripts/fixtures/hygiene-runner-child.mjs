import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const [mode, directory] = process.argv.slice(2);
const marker = process.env.MIA_SYNTHETIC_MARKER;
if (!marker || !directory) process.exit(2);
await mkdir(join(directory, "nested"), { recursive: true });
if (mode === "stdout") process.stdout.write(marker);
if (mode === "stderr") process.stderr.write(marker);
if (mode === "nested")
  await writeFile(join(directory, "nested", "report.json"), marker);
if (mode === "reporter-leak") {
  const artifacts = process.env.MIA_HYGIENE_ARTIFACT_ROOT;
  const manifest = process.env.MIA_HYGIENE_MARKER_MANIFEST;
  if (!artifacts || !manifest) process.exit(2);
  const report = spawnSync(
    join(process.env.MIA_HYGIENE_REPO_ROOT, "node_modules/.bin/playwright"),
    [
      "test",
      "--config",
      join(
        process.env.MIA_HYGIENE_REPO_ROOT,
        "playwright.hygiene-runner.config.ts",
      ),
      "--grep",
      "intermediate-report$",
    ],
    {
      encoding: "buffer",
      timeout: 20_000,
      env: {
        ...process.env,
        MIA_SYNTHETIC_FINAL: join(directory, "final.json"),
      },
    },
  );
  if (report.status !== 1) process.exit(2);
  await mkdir(join(artifacts, "nested"), { recursive: true });
  await writeFile(join(artifacts, "nested", "report.json"), report.stdout);
  await writeFile(manifest, `${JSON.stringify([marker])}\n`);
}
if (["leader-exits", "leader-fails", "term-resistant"].includes(mode)) {
  if (mode === "term-resistant") {
    process.on("SIGTERM", () => undefined);
    process.on("SIGINT", () => undefined);
  }
  const descendant = spawn(
    process.execPath,
    [
      new URL("./hygiene-descendant.mjs", import.meta.url).pathname,
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
  process.stderr.write(`GATE_FAILURE stage=e2e\n${marker}\n`);
  process.exitCode = 1;
}
if (mode === "linger") {
  await writeFile(join(directory, "worker.pid"), String(process.pid));
  setInterval(() => undefined, 1000);
}
if (mode === "owned-leak") {
  const artifacts = process.env.MIA_HYGIENE_ARTIFACT_ROOT;
  const manifest = process.env.MIA_HYGIENE_MARKER_MANIFEST;
  if (!artifacts || !manifest) process.exit(2);
  await mkdir(join(artifacts, "nested"), { recursive: true });
  await writeFile(join(artifacts, "nested", "report.json"), marker);
  await writeFile(manifest, `${JSON.stringify([marker])}\n`);
  process.stdout.write(marker);
  process.stderr.write(marker);
}
