import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { afterEach, expect, test } from "vitest";
import { createBuildIdentifier } from "./build-identifier.ts";

const roots: string[] = [];
const repositoryRoot = process.cwd();

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { force: true, recursive: true });
  }
});

function createRoot() {
  const root = mkdtempSync(join(tmpdir(), "mia-frontend-check-"));
  roots.push(root);
  return root;
}

function runCheck(root: string, script: string) {
  return () =>
    execFileSync(process.execPath, [join(repositoryRoot, "scripts", script)], {
      cwd: root,
      encoding: "utf8",
      stdio: "pipe",
    });
}

function createArchitectureFixture(root: string) {
  const directories = [
    "src/app/routes",
    "src/features/one",
    "src/features/two",
    "src/platform/api",
    "src/platform/data",
    "src/platform/session",
    "src/platform/transfer",
    "src/platform/markdown",
    "src/platform/i18n",
    "src/platform/time",
    "src/platform/ui",
    "src/platform/prefs",
    "src/platform/announcer",
    "test",
  ];
  for (const directory of directories) {
    mkdirSync(join(root, directory), { recursive: true });
  }

  writeFileSync(
    join(root, "package.json"),
    readFileSync(join(repositoryRoot, "package.json")),
  );
  writeFileSync(
    join(root, "index.html"),
    readFileSync(join(repositoryRoot, "index.html")),
  );
  writeFileSync(join(root, "src/features/one/example.ts"), "export {};\n");
}

test("architecture check rejects a changed CSP policy", () => {
  const root = createRoot();
  createArchitectureFixture(root);
  const indexPath = join(root, "index.html");
  writeFileSync(
    indexPath,
    readFileSync(indexPath, "utf8").replace(
      "connect-src 'self'",
      "connect-src *",
    ),
  );

  expect(runCheck(root, "check-architecture.mjs")).toThrow(
    "The CSP must match the locked AD-15 policy exactly.",
  );
});

test("architecture check rejects a cross-feature import", () => {
  const root = createRoot();
  createArchitectureFixture(root);
  writeFileSync(
    join(root, "src/features/one/example.ts"),
    'import "../two/example";\n',
  );
  writeFileSync(join(root, "src/features/two/example.ts"), "export {};\n");

  expect(runCheck(root, "check-architecture.mjs")).toThrow(
    "imports another feature",
  );
});

test("architecture check rejects an upward tier import", () => {
  const root = createRoot();
  createArchitectureFixture(root);
  writeFileSync(join(root, "src/app/example.ts"), "export {};\n");
  writeFileSync(
    join(root, "src/platform/api/example.ts"),
    'import "../../app/example";\n',
  );

  expect(runCheck(root, "check-architecture.mjs")).toThrow("imports upward");
});

test.each([
  [
    "browser storage outside its owner",
    "localStorage.getItem('size');",
    "accesses browser storage",
  ],
  [
    "aria-live outside its owner",
    'export const view = <div aria-live="polite" />;',
    "creates a live region",
  ],
  [
    "live-region roles outside their owner",
    'export const view = <div role="status" />;',
    "creates a live region",
  ],
  [
    "unsafe React HTML rendering",
    "export const view = <div dangerouslySetInnerHTML={{ __html: '' }} />;",
    "uses dangerouslySetInnerHTML",
  ],
  [
    "TanStack Query outside its owner",
    "import '@tanstack/react-query';",
    "imports TanStack Query",
  ],
])("architecture check rejects %s", (_name, source, message) => {
  const root = createRoot();
  createArchitectureFixture(root);
  writeFileSync(join(root, "src/features/one/example.tsx"), source);

  expect(runCheck(root, "check-architecture.mjs")).toThrow(message);
});

test("architecture check rejects a changed required dependency", () => {
  const root = createRoot();
  createArchitectureFixture(root);
  const packagePath = join(root, "package.json");
  const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));
  packageJson.dependencies.react = "19.3.1";
  writeFileSync(packagePath, `${JSON.stringify(packageJson)}\n`);

  expect(runCheck(root, "check-architecture.mjs")).toThrow(
    "Dependency react must be pinned exactly to 19.3.0.",
  );
});

test("bundle check includes imported initial-route chunks", () => {
  const root = createRoot();
  mkdirSync(join(root, "dist/.vite"), { recursive: true });
  mkdirSync(join(root, "dist/assets"), { recursive: true });
  writeFileSync(
    join(root, "dist/.vite/manifest.json"),
    JSON.stringify({
      "src/main.tsx": {
        file: "assets/main.js",
        imports: ["assets/vendor.js"],
        isEntry: true,
      },
      "assets/vendor.js": { file: "assets/vendor.js" },
    }),
  );
  writeFileSync(join(root, "dist/assets/main.js"), "export {};\n");
  writeFileSync(join(root, "dist/assets/vendor.js"), randomBytes(300 * 1024));

  expect(runCheck(root, "check-bundle-size.mjs")).toThrow("FFR-955 failed");
});

test("build identifier requires a full canonical Git revision", () => {
  expect(() => createBuildIdentifier("0.1.0", undefined)).toThrow(
    "BUILD_REVISION must be the full lowercase Git commit revision.",
  );
  expect(() => createBuildIdentifier("0.1.0", "not-a-revision")).toThrow(
    "BUILD_REVISION must be the full lowercase Git commit revision.",
  );
  expect(createBuildIdentifier("0.1.0", "a".repeat(40))).toBe(
    `0.1.0+${"a".repeat(40)}`,
  );
});
