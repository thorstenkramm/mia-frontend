import { existsSync, readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join } from "node:path";

const root = process.cwd();
const limit = 250 * 1024;
const manifestPath = join(root, "dist/.vite/manifest.json");

if (!existsSync(manifestPath)) {
  console.error(
    "FFR-955 requires a production build before bundle size can be measured.",
  );
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const entryFiles = Object.entries(manifest).filter(
  ([, entry]) => entry.isEntry && entry.file.endsWith(".js"),
);

if (entryFiles.length === 0) {
  console.error(
    "FFR-955 could not identify an initial-route JavaScript entry.",
  );
  process.exit(1);
}

const initialRouteFiles = new Set();
const visitedEntryKeys = new Set();
function addInitialRouteFiles(entryKey) {
  if (visitedEntryKeys.has(entryKey)) {
    return;
  }
  visitedEntryKeys.add(entryKey);

  const entry = manifest[entryKey];
  if (entry === undefined || !entry.file.endsWith(".js")) {
    return;
  }

  initialRouteFiles.add(entry.file);
  for (const importedKey of entry.imports ?? []) {
    addInitialRouteFiles(importedKey);
  }
}

for (const [entryKey] of entryFiles) {
  addInitialRouteFiles(entryKey);
}

let compressedBytes = 0;
for (const file of initialRouteFiles) {
  compressedBytes += gzipSync(
    readFileSync(join(root, "dist", file)),
  ).byteLength;
}

if (compressedBytes > limit) {
  console.error(
    `FFR-955 failed: initial-route JavaScript is ${compressedBytes} bytes gzip; limit is ${limit} bytes.`,
  );
  process.exit(1);
}

console.log(
  `FFR-955 passed: initial-route JavaScript is ${compressedBytes} bytes gzip; limit is ${limit} bytes.`,
);
