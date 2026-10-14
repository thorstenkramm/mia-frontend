import { existsSync, readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { join } from "node:path";

const root = process.cwd();
// Owner decision 2026-10-12 (Story 6.3): 258000 gzip bytes. About 66 KB of
// Each active catalog now loads before first React paint, outside the entry.
// Owner decision 2026-10-13 (Story 6.5): 260000 gzip bytes; finish-state copy
// alone estimated +307 B against 182 B headroom. The 260000 limit is unchanged.
const limit = 260_000;
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
function addInitialRouteFiles(entryKey, visited, files) {
  if (visited.has(entryKey)) {
    return;
  }
  visited.add(entryKey);

  const entry = manifest[entryKey];
  if (entry === undefined || !entry.file.endsWith(".js")) {
    return;
  }

  files.add(entry.file);
  for (const importedKey of entry.imports ?? []) {
    addInitialRouteFiles(importedKey, visited, files);
  }
}

for (const [entryKey] of entryFiles) {
  addInitialRouteFiles(entryKey, visitedEntryKeys, initialRouteFiles);
}

function sizeOf(files) {
  let size = 0;
  for (const file of files)
    size += gzipSync(readFileSync(join(root, "dist", file))).byteLength;
  return size;
}

const entryBytes = sizeOf(initialRouteFiles);
console.log(`FFR-955 entry/static JavaScript: ${entryBytes} bytes gzip.`);
let failed = false;
for (const locale of [
  "en-US",
  "de-DE",
  "fr-FR",
  "pt-PT",
  "pt-BR",
  "es-ES",
  "es-AR",
]) {
  const key = `src/platform/i18n/catalogs/${locale}.json`;
  const catalog = manifest[key];
  if (
    catalog?.isDynamicEntry !== true ||
    !catalog.file?.endsWith(".js") ||
    initialRouteFiles.has(catalog.file)
  ) {
    console.error(
      `FFR-955 failed: ${locale} catalog is missing or included in the static entry.`,
    );
    failed = true;
    continue;
  }
  const files = new Set(initialRouteFiles);
  addInitialRouteFiles(key, new Set(), files);
  const bytes = sizeOf(files);
  console.log(
    `FFR-955 ${locale} initial-paint JavaScript: ${bytes} bytes gzip.`,
  );
  if (bytes > limit) {
    console.error(
      `FFR-955 failed: ${locale} initial-paint JS exceeds ${limit} bytes gzip.`,
    );
    failed = true;
  }
}

if (failed) process.exit(1);
console.log(
  `FFR-955 passed: all seven active locales <= ${limit} bytes gzip, no catalog in entry.`,
);
