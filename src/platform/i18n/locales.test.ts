import { describe, expect, it } from "vitest";
import { locales, negotiateLocale } from "./locales";
import { catalogStore } from "./catalogLoader";
import englishCatalog from "./catalogs/en-US.json";
import { messages } from "./messages";

it("runtime English and every lazy catalog preserve canonical messages", async () => {
  const ids = Object.values(messages)
    .map((message) => message.id)
    .sort();
  expect(Object.keys(englishCatalog).sort()).toEqual(ids);
  const canonical: Record<string, string> = englishCatalog;
  const loaded = await Promise.all(
    locales.map((locale) => catalogStore.load(locale)),
  );
  for (const id of ids) {
    expect(loaded[0]?.[id] === canonical[id]).toBe(true);
    // Every supported locale still has every message; no locale was pruned.
    expect(
      loaded.every((catalog) => {
        return typeof catalog[id] === "string";
      }),
    ).toBe(true);
  }
});

describe("anonymous locale negotiation", () => {
  it.each([
    [["pt-BR"], "pt-BR"],
    [["es-AR"], "es-AR"],
    [["pt-BR-u-nu-latn"], "pt-BR"],
    [["es-AR-x-private"], "es-AR"],
    [["pt-AO"], "pt-PT"],
    [["es-MX"], "es-ES"],
    [["de-AT"], "de-DE"],
    [["fr-CA"], "fr-FR"],
    [["en-GB"], "en-US"],
    [["xx-YY", "fr-BE"], "fr-FR"],
    [["not_a_locale"], "en-US"],
    [[], "en-US"],
  ] as const)("negotiates %j to %s", (languages, expected) => {
    expect(negotiateLocale(languages)).toBe(expected);
  });
});
