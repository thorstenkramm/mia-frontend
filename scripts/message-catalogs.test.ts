import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";
import { expect, it } from "vitest";
import {
  messageCatalogModule,
  messageDescriptorModule,
} from "./message-catalogs";
import { catalogMessageIds, messages } from "../src/platform/i18n/messages";

it("production packed descriptors preserve every public identity and default in all catalogs", () => {
  const source = messageDescriptorModule(
    resolve("src/platform/i18n/messages.ts"),
  )
    .code.replace(/^import .*;$/gmu, "")
    .replace("export const messages=", "result =")
    .replace("export const catalogMessageIds=", "ids =")
    .replace("Object.values(messages)", "Object.values(result)");
  const context = {
    defineMessages: (value: unknown) => value,
    result: undefined as unknown,
    ids: undefined as unknown,
  };
  runInNewContext(source, context);
  expect(context.result).toEqual(messages);
  expect(context.ids).toEqual(catalogMessageIds);
});

it.each([
  ["de-DE", null],
  ["fr-FR", null],
  ["es-ES", null],
  ["es-AR", "es-ES"],
  ["pt-PT", null],
  ["pt-BR", "pt-PT"],
])(
  "compiled %s preserves all canonical strings including regional differences from %s",
  (regional, base) => {
    const path = resolve("src/platform/i18n/catalogs", `${regional}.json`);
    const canonical: unknown = JSON.parse(readFileSync(path, "utf8"));
    const compiled = messageCatalogModule(
      path,
      base === null ? null : `${base}.json`,
    );
    const baseCatalog: unknown = JSON.parse(
      readFileSync(
        resolve("src/platform/i18n/catalogs", `${base ?? "en-US"}.json`),
        "utf8",
      ),
    );
    const source = compiled.code
      .replace(/^import .*;$/gmu, "")
      .replace("export default", "result =");
    const context = {
      keys: catalogMessageIds,
      base: baseCatalog,
      result: undefined as unknown,
    };
    runInNewContext(source, context);
    expect(context.result).toEqual(canonical);
    if (typeof context.result !== "object" || context.result === null)
      throw new Error("Invalid compiled catalog.");
    expect(Object.keys(context.result).sort()).toEqual(catalogMessageIds);
    expect(
      base === null ||
        compiled.code.includes(`import base from "./${base}.json"`),
    ).toBe(true);
  },
);
