import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const root = process.cwd();
const failures = [];
const requiredDirectories = [
  "src/app",
  "src/app/routes",
  "src/features",
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
const requiredVersions = {
  "@formatjs/cli": "6.16.29",
  "@headlessui/react": "2.2.10",
  "@heroicons/react": "2.2.0",
  "@playwright/test": "1.63.0",
  "@testing-library/react": "16.3.3",
  "@testing-library/user-event": "14.6.7",
  react: "19.3.0",
  "react-dom": "19.3.0",
  "react-router": "8.4.0",
  "@tanstack/react-query": "5.102.8",
  clsx: "2.1.1",
  jsdom: "30.0.1",
  katex: "0.18.7",
  "mdast-util-gfm-table": "2.0.0",
  "micromark-extension-gfm-table": "2.1.2",
  msw: "2.15.0",
  "openapi-typescript": "7.13.0",
  "prettier-plugin-tailwindcss": "0.8.1",
  qrcode: "1.5.4",
  "react-intl": "11.0.1",
  "react-markdown": "10.1.0",
  "rehype-katex": "7.0.1",
  "remark-math": "6.0.0",
  "tailwind-merge": "3.7.0",
  zod: "4.6.5",
  vite: "8.3.0",
  tailwindcss: "4.3.3",
  vitest: "5.0.1",
};

for (const directory of requiredDirectories) {
  if (!existsSync(join(root, directory))) {
    failures.push(`Missing architecture owner directory: ${directory}`);
  }
}

const packageJson = JSON.parse(
  readFileSync(join(root, "package.json"), "utf8"),
);
const dependencies = {
  ...packageJson.dependencies,
  ...packageJson.devDependencies,
};
for (const [name, version] of Object.entries(requiredVersions)) {
  if (dependencies[name] !== version) {
    failures.push(`Dependency ${name} must be pinned exactly to ${version}.`);
  }
}
for (const [name, version] of Object.entries(dependencies)) {
  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    failures.push(`Dependency ${name} must use an exact version pin.`);
  }
}

const indexHtml = readFileSync(join(root, "index.html"), "utf8");
const requiredCsp =
  "default-src 'self'; script-src 'self'; style-src 'self'; style-src-attr 'unsafe-inline'; font-src 'self'; img-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'";
const cspMatch = indexHtml.match(
  /<meta\b[^>]*http-equiv="Content-Security-Policy"[^>]*content="([^"]*)"[^>]*>/,
);
if (cspMatch === null) {
  failures.push(
    "index.html must define the AD-15 Content-Security-Policy meta tag.",
  );
} else if (cspMatch[1] !== requiredCsp) {
  failures.push("The CSP must match the locked AD-15 policy exactly.");
}

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      return sourceFiles(path);
    }
    return /\.[jt]sx?$/.test(entry.name) ? [path] : [];
  });
}

for (const file of sourceFiles(join(root, "src"))) {
  const source = readFileSync(file, "utf8");
  const path = relative(root, file);
  const isDataOwner = path.startsWith("src/platform/data/");
  const isPrefsOwner = path.startsWith("src/platform/prefs/");
  const isAnnouncerOwner = path.startsWith("src/platform/announcer/");
  const isMarkdownOwner = path.startsWith("src/platform/markdown/");
  if (
    !isMarkdownOwner &&
    /(?:from\s+|import\s*(?:\(\s*)?)['"](?:react-markdown|remark-[^'"]+|rehype-[^'"]+|katex|micromark[^'"]*|mdast-util[^'"]*|hast-util[^'"]*)(?:\/[^'"]+)?['"]/.test(
      source,
    )
  ) {
    failures.push(
      `${path} imports rich-content infrastructure outside platform/markdown.`,
    );
  }

  if (
    !isDataOwner &&
    /(?:from\s+|import\s*(?:\(\s*)?)['"]@tanstack\/react-query(?:\/[^'"]+)?['"]/.test(
      source,
    )
  ) {
    failures.push(`${path} imports TanStack Query outside platform/data.`);
  }
  if (!isPrefsOwner && /\b(?:localStorage|sessionStorage)\b/.test(source)) {
    failures.push(`${path} accesses browser storage outside platform/prefs.`);
  }
  if (
    !isAnnouncerOwner &&
    /(?:aria-live\s*=|role\s*=\s*(?:['"](?:alert|log|status)['"]|\{\s*['"](?:alert|log|status)['"]\s*\}))/.test(
      source,
    )
  ) {
    failures.push(`${path} creates a live region outside platform/announcer.`);
  }
  if (/dangerouslySetInnerHTML/.test(source)) {
    failures.push(`${path} uses dangerouslySetInnerHTML.`);
  }

  for (const [, specifier] of source.matchAll(
    /(?:from\s+|import\s*(?:\(\s*)?)['"]([^'"]+)['"]/g,
  )) {
    if (!specifier.startsWith(".")) {
      continue;
    }

    const importedPath = relative(root, resolve(dirname(file), specifier));
    const currentTier = path.split("/")[1];
    const importedTier = importedPath.split("/")[1];

    if (
      (currentTier === "platform" &&
        (importedTier === "app" || importedTier === "features")) ||
      (currentTier === "features" && importedTier === "app")
    ) {
      failures.push(`${path} imports upward from ${importedPath}.`);
    }

    if (
      currentTier === "features" &&
      importedTier === "features" &&
      path.split("/")[2] !== importedPath.split("/")[2]
    ) {
      failures.push(`${path} imports another feature from ${importedPath}.`);
    }
  }
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("Architecture checks passed.");
