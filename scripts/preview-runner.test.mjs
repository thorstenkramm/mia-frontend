import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:net";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import {
  presentationLocales,
  presentationMode,
} from "../e2e/presentationMatrix.ts";

test("presentation selector rejects unknown values and standalone defaults to complete ordering", () => {
  const previous = process.env.MIA_PRESENTATION_MATRIX;
  const all = ["en-US", "de-DE", "es-ES", "es-AR", "fr-FR", "pt-PT", "pt-BR"];
  try {
    delete process.env.MIA_PRESENTATION_MATRIX;
    assert.equal(presentationMode(), "full");
    assert.deepEqual(presentationLocales(all, "course"), all);
    process.env.MIA_PRESENTATION_MATRIX = "story";
    assert.deepEqual(presentationLocales(all, "course"), [
      "en-US",
      "de-DE",
      "fr-FR",
    ]);
    assert.deepEqual(presentationLocales(all, "login"), [
      "en-US",
      "de-DE",
      "fr-FR",
      "pt-PT",
    ]);
    process.env.MIA_PRESENTATION_MATRIX = "full";
    assert.deepEqual(presentationLocales(all, "login"), all);
    for (const invalid of ["", "sample", "FULL"]) {
      process.env.MIA_PRESENTATION_MATRIX = invalid;
      assert.throws(
        () => presentationLocales(all, "course"),
        /Invalid presentation matrix mode/,
      );
    }
  } finally {
    if (previous === undefined) delete process.env.MIA_PRESENTATION_MATRIX;
    else process.env.MIA_PRESENTATION_MATRIX = previous;
  }
});

test("macOS system Bash rejects invalid gate arguments before work", () => {
  for (const [script, args, env, diagnostic] of [
    ["run-all-tests.sh", ["--unknown"], {}, "Usage:"],
    ["run-all-tests.sh", ["--full-matrix", "--full-matrix"], {}, "Usage:"],
    [
      "run-all-tests.sh",
      ["--full-matrix"],
      { MIA_PRESENTATION_MATRIX: "story" },
      "Conflicting presentation matrix mode.",
    ],
    [
      "scripts/check-browser-gate.sh",
      [],
      { MIA_PRESENTATION_MATRIX: "" },
      "Invalid presentation matrix mode.",
    ],
  ]) {
    const result = spawnSync("/bin/bash", [script, ...args], {
      encoding: "buffer",
      env: { ...process.env, MIA_PRESENTATION_MATRIX: "story", ...env },
      timeout: 3000,
    });
    assert.equal(result.status, 2);
    assert.equal(result.stderr.includes(Buffer.from(diagnostic)), true);
    assert.equal(result.stderr.includes(Buffer.from("syntax error")), false);
  }
});

test("story and full modes retain every non-presentation activation registration", () => {
  const list = (mode) => {
    const run = spawnSync(
      resolve("node_modules/.bin/playwright"),
      ["test", "e2e/courseActivation.spec.ts", "--list", "--reporter=json"],
      {
        encoding: "utf8",
        timeout: 30000,
        env: { ...process.env, MIA_PRESENTATION_MATRIX: mode },
      },
    );
    assert.equal(run.status, 0);
    const suites = JSON.parse(run.stdout).suites;
    const specs = (items) =>
      items.flatMap((item) => [
        ...(item.specs ?? []),
        ...specs(item.suites ?? []),
      ]);
    return specs(suites).map((item) => item.title);
  };
  const full = list("full");
  const story = list("story");
  const presentation = (titles) =>
    titles.filter((title) =>
      title.startsWith("activation readiness confirmation "),
    );
  assert.equal(presentation(full).length, 21);
  assert.equal(presentation(story).length, 9);
  assert.deepEqual(
    story.filter((title) => !presentation(story).includes(title)),
    full.filter((title) => !presentation(full).includes(title)),
  );
});

async function previewFixture() {
  const root = await mkdtemp(join(tmpdir(), "mia-preview-lifecycle-"));
  const workerDir = join(root, "evidence");
  await mkdir(join(root, "dist", ".vite"), { recursive: true });
  await mkdir(workerDir);
  await writeFile(
    join(root, "dist", "index.html"),
    '<html><script type="module" src="/assets/entry.js"></script></html>',
  );
  await mkdir(join(root, "dist", "assets"));
  await writeFile(
    join(root, "dist", "assets", "entry.js"),
    "export const built = true;",
  );
  await writeFile(
    join(root, "dist", ".vite", "manifest.json"),
    JSON.stringify({ "index.html": { file: "assets/entry.js" } }),
  );
  await writeFile(
    join(root, "package.json"),
    JSON.stringify({
      scripts: {
        preview: `node ${resolve("scripts/fixtures/preview-server.mjs")}`,
      },
    }),
  );
  return { root, workerDir };
}

function previewArgs(mode, directory) {
  return [
    resolve("scripts/owned-preview.mjs"),
    "--",
    process.execPath,
    resolve("scripts/fixtures/preview-runner-child.mjs"),
    mode,
    directory,
  ];
}

async function awaitPid(path) {
  for (let tries = 0; tries < 100; tries++) {
    const pid = await readFile(path, "utf8").catch(() => undefined);
    if (pid) return Number(pid);
    await delay(100);
  }
  assert.fail("Owned descendant did not start before cancellation.");
}

async function assertGone(pid) {
  for (let tries = 0; tries < 30; tries++) {
    try {
      process.kill(pid, 0);
    } catch (error) {
      if (error.code === "ESRCH") return;
      throw error;
    }
    await delay(100);
  }
  assert.fail("Owned descendant survived cleanup.");
}

async function assertPortReleased(port) {
  const listener = createServer();
  try {
    await new Promise((resolve, reject) => {
      listener.once("error", reject);
      listener.listen(port, "127.0.0.1", resolve);
    });
  } finally {
    if (listener.listening)
      await new Promise((resolve) => listener.close(resolve));
  }
}

test("cancellation during delayed readiness never starts a worker", async () => {
  const { root, workerDir } = await previewFixture();
  const owner = spawn(process.execPath, previewArgs("linger", workerDir), {
    cwd: root,
    stdio: "ignore",
    env: {
      ...process.env,
      MIA_SYNTHETIC_READINESS_DIRECTORY: workerDir,
    },
  });
  const exit = new Promise((resolve) => owner.once("exit", resolve));
  try {
    const previewPid = await awaitPid(join(workerDir, "preview-4173.pid"));
    await awaitPid(join(workerDir, "asset-requested"));
    owner.kill("SIGTERM");
    assert.equal(
      await Promise.race([exit, delay(6000).then(() => "timeout")]),
      143,
    );
    assert.equal(await readFile(join(workerDir, "asset-served"), "utf8"), "1");
    await assertGone(previewPid);
    assert.equal(
      await readFile(join(workerDir, "worker.pid")).then(
        () => true,
        () => false,
      ),
      false,
    );
    await assertPortReleased(4173);
  } finally {
    owner.kill("SIGKILL");
    await rm(root, { recursive: true, force: true });
  }
});

test("cancellation after successful worker exit remains a nonzero result during cleanup", async () => {
  const { root, workerDir } = await previewFixture();
  try {
    for (const [signal, expected] of [
      ["SIGINT", 130],
      ["SIGTERM", 143],
    ]) {
      for (const file of ["preview-4173.term", "descendant.pid"])
        await rm(join(workerDir, file), { force: true });
      const owner = spawn(
        process.execPath,
        previewArgs("leader-exits", workerDir),
        {
          cwd: root,
          stdio: "ignore",
          env: {
            ...process.env,
            MIA_SYNTHETIC_READINESS_DIRECTORY: workerDir,
          },
        },
      );
      const exit = new Promise((resolve) => owner.once("exit", resolve));
      try {
        const descendantPid = await awaitPid(join(workerDir, "descendant.pid"));
        // The server receives TERM only when the owner has entered stop(0)
        // after the worker's successful exit, before its delayed escalation.
        await awaitPid(join(workerDir, "preview-4173.term"));
        owner.kill(signal);
        assert.equal(
          await Promise.race([exit, delay(6000).then(() => "timeout")]),
          expected,
        );
        await assertGone(descendantPid);
        await assertPortReleased(4173);
      } finally {
        owner.kill("SIGKILL");
      }
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("occupied preview port remains alive and is never reused", async () => {
  const listener = createServer();
  try {
    await new Promise((resolve, reject) => {
      listener.once("error", reject);
      listener.listen(4173, "127.0.0.1", resolve);
    });
  } catch (error) {
    assert.fail(
      `Required lifecycle harness port 4173 unavailable (${error.code}); resolve before gate.`,
    );
  }
  const { root, workerDir } = await previewFixture();
  try {
    const result = spawnSync(
      process.execPath,
      previewArgs("stdout", workerDir),
      { cwd: root, encoding: "utf8", timeout: 15_000 },
    );
    assert.equal(result.status, 1);
    assert.equal(listener.listening, true);
  } finally {
    await new Promise((resolve) => listener.close(resolve));
    await rm(root, { recursive: true, force: true });
  }
});

test("owned previews reject generic HTML and mismatched assets", async () => {
  const { root, workerDir } = await previewFixture();
  try {
    for (const bad of ["index", "asset"]) {
      const run = spawnSync(
        process.execPath,
        previewArgs("stdout", workerDir),
        {
          cwd: root,
          encoding: "buffer",
          timeout: 15_000,
          env: {
            ...process.env,
            MIA_SYNTHETIC_BAD_BUILD: bad,
            MIA_PREVIEW_TEST_READINESS_ATTEMPTS: "4",
          },
        },
      );
      assert.equal(run.status, 1);
      assert.match(run.stderr.toString(), /preview-4173: readiness/);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("success, worker failure, timeout, INT and TERM clean owned descendant groups", async () => {
  for (const port of [4173]) {
    const check = createServer();
    try {
      await new Promise((resolve, reject) => {
        check.once("error", reject);
        check.listen(port, "127.0.0.1", resolve);
      });
    } catch (error) {
      assert.fail(
        `Required lifecycle harness port ${port} unavailable (${error.code}); resolve before gate.`,
      );
    } finally {
      if (check.listening) await new Promise((resolve) => check.close(resolve));
    }
  }
  const { root, workerDir } = await previewFixture();
  try {
    for (const [mode, signal, expected] of [
      ["leader-exits", null, 0],
      ["leader-fails", null, 7],
      ["term-resistant", "SIGINT", 130],
      ["term-resistant", "SIGTERM", 143],
      ["term-resistant", null, 124],
    ]) {
      await rm(join(workerDir, "descendant.pid"), { force: true });
      const owner = spawn(process.execPath, previewArgs(mode, workerDir), {
        cwd: root,
        stdio: "ignore",
        env: {
          ...process.env,
          ...(expected === 124 ? { MIA_PREVIEW_TEST_TIMEOUT_MS: "1500" } : {}),
        },
      });
      try {
        const exit = new Promise((resolve) => owner.once("exit", resolve));
        const pid = await awaitPid(join(workerDir, "descendant.pid"));
        if (signal) owner.kill(signal);
        const code = await Promise.race([
          exit,
          delay(6000).then(() => "timeout"),
        ]);
        assert.equal(code, expected);
        await assertGone(pid);
      } finally {
        owner.kill("SIGKILL");
      }
    }
    const diagnostic = spawnSync(
      process.execPath,
      previewArgs("gate-failure", workerDir),
      { cwd: root, encoding: "utf8", timeout: 15_000 },
    );
    assert.equal(diagnostic.status, 7);
    assert.match(diagnostic.stderr, /Worker failed with useful diagnostics/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
