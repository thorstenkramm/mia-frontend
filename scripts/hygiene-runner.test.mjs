import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:net";
import { mkdtempSync, rmSync } from "node:fs";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import {
  artifactBuffers,
  assertMarkerFree,
  parseReport,
  reconcileResults,
} from "./hygiene-output.mjs";
import { routeHygieneCases } from "./route-secret-hygiene-cases.ts";
import { courseUnitCases } from "./secret-hygiene-evidence.ts";

function actualReporter(mode, retries = 0) {
  const directory = mkdtempSync(join(tmpdir(), "mia-reporter-harness-"));
  try {
    const child = spawnSync(
      resolve("node_modules/.bin/playwright"),
      [
        "test",
        "--config",
        "playwright.hygiene-runner.config.ts",
        "--grep",
        `${mode}$`,
        `--retries=${retries}`,
        "--output",
        directory,
      ],
      {
        encoding: "buffer",
        timeout: 20_000,
        maxBuffer: 1024 * 1024,
        env: { ...process.env, PLAYWRIGHT_NO_COPY_PROMPT: "1", NO_COLOR: "1" },
      },
    );
    assert.equal(child.error, undefined);
    const report = parseReport(child.stdout, "synthetic browser reporter");
    const specs = (suites) =>
      suites.flatMap((suite) => [
        ...(suite.specs ?? []),
        ...specs(suite.suites ?? []),
      ]);
    const actual = specs(report.suites).flatMap((spec) =>
      spec.tests.map((test) => ({
        id: "case:point",
        attempts: test.results,
        errors:
          test.results[0]?.errors?.map((error) => error.message ?? "") ?? [],
      })),
    );
    return { child, actual };
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

test("real Playwright reporter confirms failures and rejects pass, skip, retry and wrong identity", () => {
  const expected = ["case:point"];
  const controlled = actualReporter("controlled");
  assert.equal(controlled.child.status, 1);
  assert.doesNotThrow(() =>
    reconcileResults(
      expected,
      controlled.actual,
      expected,
      "ControlledRouteHygieneFailure",
    ),
  );
  for (const [mode, retries] of [
    ["passes", 0],
    ["skipped", 0],
    ["wrong", 0],
    ["controlled", 1],
  ]) {
    const actual = actualReporter(mode, retries);
    assert.throws(() =>
      reconcileResults(
        expected,
        actual.actual,
        expected,
        "ControlledRouteHygieneFailure",
      ),
    );
  }
});

test("original stdout, stderr and nested artifacts reject leaks", async () => {
  for (const mode of ["stdout", "stderr", "nested"]) {
    const root = await mkdtemp(join(tmpdir(), "mia-runner-fixture-"));
    try {
      const marker = `synthetic-${randomUUID()}`;
      const result = spawnSync(
        process.execPath,
        [resolve("scripts/fixtures/hygiene-runner-child.mjs"), mode, root],
        {
          env: { ...process.env, MIA_SYNTHETIC_MARKER: marker },
          encoding: "buffer",
        },
      );
      assert.equal(result.status, 0);
      const originals = [
        result.stdout,
        result.stderr,
        ...(await artifactBuffers(root)),
      ];
      assert.throws(() => assertMarkerFree([marker], originals), /marker/);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }
});

test("reporter rejects malformed, missing, duplicate, passing, skipped, retried and wrong failures", () => {
  const id = "case:point";
  const valid = {
    id,
    attempts: [{ status: "failed" }],
    errors: [`ControlledRouteHygieneFailure:${id}\n`],
  };
  assert.doesNotThrow(() =>
    reconcileResults([id], [valid], [id], "ControlledRouteHygieneFailure"),
  );
  for (const [expected, results, checkpoints] of [
    [[id], [], [id]],
    [[id], [valid, valid], [id]],
    [[id], [{ ...valid, id: "other" }], [id]],
    [[id], [{ ...valid, attempts: [{ status: "passed" }] }], [id]],
    [[id], [{ ...valid, attempts: [{ status: "skipped" }] }], [id]],
    [
      [id],
      [{ ...valid, attempts: [{ status: "failed" }, { status: "failed" }] }],
      [id],
    ],
    [[id], [{ ...valid, errors: ["unrelated"] }], [id]],
    [[id], [valid], []],
    [[id], [valid], [id, id]],
  ])
    assert.throws(() =>
      reconcileResults(
        expected,
        results,
        checkpoints,
        "ControlledRouteHygieneFailure",
      ),
    );
  assert.throws(
    () => parseReport(Buffer.from("{"), "synthetic"),
    /missing or invalid/,
  );
  assert.throws(() =>
    reconcileResults([id], [valid], [], "ControlledRouteHygieneFailure", id),
  );
});

test("actual evidence-set comparator rejects a changed checkpoint identity", async () => {
  const root = await mkdtemp(join(tmpdir(), "mia-evidence-harness-"));
  try {
    const route = routeHygieneCases.flatMap((item) =>
      item.checkpoints.map((point) => ({
        case: item.id,
        checkpoint: point,
        status: "pass",
        earlyCanary: false,
      })),
    );
    const unit = courseUnitCases.flatMap((item) =>
      item.points.map((point) => ({
        file: item.file,
        case: item.title,
        checkpoint: point,
        status: "pass",
        earlyCanary: false,
      })),
    );
    route.push({
      ...route[0],
      earlyCanary: true,
      status: "early-failure-rejected",
    });
    unit.push({
      ...unit[0],
      earlyCanary: true,
      status: "early-failure-rejected",
    });
    const compare = () =>
      spawnSync(
        process.execPath,
        [resolve("scripts/compare-hygiene-evidence.mjs"), root],
        { encoding: "buffer" },
      );
    await writeFile(
      join(root, "route.json"),
      JSON.stringify({ evidence: route }),
    );
    await writeFile(
      join(root, "course-unit.json"),
      JSON.stringify({ evidence: unit }),
    );
    assert.equal(compare().status, 0);
    unit[0] = { ...unit[0], checkpoint: "wrong-checkpoint" };
    await writeFile(
      join(root, "course-unit.json"),
      JSON.stringify({ evidence: unit }),
    );
    assert.equal(compare().status, 1);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
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
        preview: `node ${resolve("scripts/fixtures/hygiene-preview-server.mjs")}`,
      },
    }),
  );
  return { root, workerDir };
}

function previewArgs(mode, directory) {
  return [
    resolve("scripts/hygiene-preview.mjs"),
    "--",
    process.execPath,
    resolve("scripts/fixtures/hygiene-runner-child.mjs"),
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

test("cancellation during delayed readiness never starts another preview or worker", async () => {
  const { root, workerDir } = await previewFixture();
  const owner = spawn(process.execPath, previewArgs("linger", workerDir), {
    cwd: root,
    stdio: "ignore",
    env: {
      ...process.env,
      MIA_SYNTHETIC_MARKER: `synthetic-${randomUUID()}`,
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
      await readFile(join(workerDir, "preview-4174.pid")).then(
        () => true,
        () => false,
      ),
      false,
    );
    assert.equal(
      await readFile(join(workerDir, "worker.pid")).then(
        () => true,
        () => false,
      ),
      false,
    );
    await assertPortReleased(4173);
    await assertPortReleased(4174);
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
      for (const file of [
        "preview-4173.term",
        "preview-4174.term",
        "descendant.pid",
      ])
        await rm(join(workerDir, file), { force: true });
      const owner = spawn(
        process.execPath,
        previewArgs("leader-exits", workerDir),
        {
          cwd: root,
          stdio: "ignore",
          env: {
            ...process.env,
            MIA_SYNTHETIC_MARKER: `synthetic-${randomUUID()}`,
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
        await assertPortReleased(4174);
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
    assert.equal(result.stdout.includes("synthetic-"), false);
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
            MIA_HYGIENE_TEST_READINESS_ATTEMPTS: "4",
            MIA_SYNTHETIC_MARKER: `synthetic-${randomUUID()}`,
          },
        },
      );
      assert.equal(run.status, 1);
      assert.match(run.stderr.toString(), /readiness \(content-free\)/);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("owned runner rejects real intermediate Playwright failure leak with cleared final state", async () => {
  const { root, workerDir } = await previewFixture();
  const marker = `synthetic-${randomUUID()}`;
  try {
    const run = spawnSync(
      process.execPath,
      previewArgs("reporter-leak", workerDir),
      {
        cwd: root,
        encoding: "buffer",
        timeout: 30_000,
        env: {
          ...process.env,
          MIA_SYNTHETIC_MARKER: marker,
          MIA_HYGIENE_REPO_ROOT: process.cwd(),
        },
      },
    );
    assert.equal(run.status, 1);
    assert.equal(
      await readFile(join(workerDir, "final.json"), "utf8"),
      "cleared",
    );
    assert.equal(
      Buffer.concat([run.stdout, run.stderr]).includes(Buffer.from(marker)),
      false,
    );
    assert.match(run.stderr.toString(), /output scan failed \(content-free\)/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("success, worker failure, timeout, INT and TERM clean owned descendant groups", async () => {
  for (const port of [4173, 4174]) {
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
          MIA_SYNTHETIC_MARKER: `synthetic-${randomUUID()}`,
          ...(expected === 124 ? { MIA_HYGIENE_TEST_TIMEOUT_MS: "1500" } : {}),
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
    const leakMarker = `synthetic-${randomUUID()}`;
    const diagnostic = spawnSync(
      process.execPath,
      previewArgs("gate-failure", workerDir),
      {
        cwd: root,
        encoding: "buffer",
        timeout: 15_000,
        env: { ...process.env, MIA_SYNTHETIC_MARKER: leakMarker },
      },
    );
    assert.equal(diagnostic.status, 1);
    assert.match(diagnostic.stderr.toString(), /at e2e \(content-free\)/);
    assert.equal(
      Buffer.concat([diagnostic.stdout, diagnostic.stderr]).includes(
        Buffer.from(leakMarker),
      ),
      false,
    );
    const leaked = spawnSync(
      process.execPath,
      previewArgs("owned-leak", workerDir),
      {
        cwd: root,
        encoding: "buffer",
        timeout: 15_000,
        env: { ...process.env, MIA_SYNTHETIC_MARKER: leakMarker },
      },
    );
    assert.equal(leaked.status, 1);
    assert.equal(
      Buffer.concat([leaked.stdout, leaked.stderr]).includes(
        Buffer.from(leakMarker),
      ),
      false,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
