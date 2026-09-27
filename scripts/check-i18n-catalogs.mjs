import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { parse } from "@formatjs/icu-messageformat-parser";

const expectedLocales = [
  "en-US",
  "de-DE",
  "fr-FR",
  "pt-PT",
  "pt-BR",
  "es-ES",
  "es-AR",
];
const catalogDirectory = resolve("src/platform/i18n/catalogs");
const cli = resolve("node_modules/@formatjs/cli/bin/formatjs");
const temporaryDirectory = mkdtempSync(join(tmpdir(), "mia-i18n-"));

function argumentNames(message) {
  const names = new Set();

  function visit(value) {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (value === null || typeof value !== "object") {
      return;
    }

    if (
      typeof value.type === "number" &&
      value.type >= 1 &&
      value.type <= 6 &&
      typeof value.value === "string"
    ) {
      names.add(value.value);
    }
    Object.values(value).forEach(visit);
  }

  visit(parse(message));
  return [...names].sort();
}

try {
  const extractedPath = join(temporaryDirectory, "extracted.json");
  execFileSync(
    cli,
    ["extract", "src/platform/i18n/messages.ts", "--out-file", extractedPath],
    { stdio: "pipe" },
  );

  const extracted = JSON.parse(readFileSync(extractedPath, "utf8"));
  const expectedIds = Object.keys(extracted).sort();
  if (expectedIds.length === 0) {
    throw new Error("No frontend messages were extracted.");
  }
  const catalogFiles = readdirSync(catalogDirectory).sort();
  const expectedFiles = expectedLocales
    .map((locale) => `${locale}.json`)
    .sort();

  if (JSON.stringify(catalogFiles) !== JSON.stringify(expectedFiles)) {
    throw new Error(
      `Launch catalog files differ. Expected ${expectedFiles.join(", ")}; received ${catalogFiles.join(", ")}.`,
    );
  }

  for (const locale of expectedLocales) {
    const catalogPath = join(catalogDirectory, `${locale}.json`);
    const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
    const catalogIds = Object.keys(catalog).sort();

    if (JSON.stringify(catalogIds) !== JSON.stringify(expectedIds)) {
      throw new Error(
        `${locale} does not contain exactly the extracted message IDs.`,
      );
    }
    for (const id of expectedIds) {
      if (typeof catalog[id] !== "string" || catalog[id].trim().length === 0) {
        throw new Error(
          `${locale} has an empty or non-string message for ${id}.`,
        );
      }
      const expectedArguments = argumentNames(extracted[id].defaultMessage);
      const catalogArguments = argumentNames(catalog[id]);
      if (
        JSON.stringify(catalogArguments) !== JSON.stringify(expectedArguments)
      ) {
        throw new Error(
          `${locale} does not preserve the ICU arguments for ${id}.`,
        );
      }
    }

    execFileSync(
      cli,
      [
        "compile",
        catalogPath,
        "--out-file",
        join(temporaryDirectory, `${locale}.json`),
      ],
      { stdio: "pipe" },
    );
  }

  process.stdout.write(
    `Checked ${expectedLocales.length} complete ICU catalogs.\n`,
  );
} finally {
  rmSync(temporaryDirectory, { force: true, recursive: true });
}
