import { describe, expect, it } from "vitest";
import { negotiateLocale } from "./locales";

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
