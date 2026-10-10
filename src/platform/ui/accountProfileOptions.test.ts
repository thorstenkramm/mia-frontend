import { expect, it } from "vitest";
import { countryOptions, timeZoneOptions } from "./accountProfileOptions";

it("country choices are localized and sorted without changing their submitted codes", () => {
  for (const locale of [
    "en-US",
    "de-DE",
    "es-ES",
    "es-AR",
    "fr-FR",
    "pt-PT",
    "pt-BR",
  ]) {
    const options = countryOptions(locale);
    const collator = new Intl.Collator(locale);
    expect(
      options.some((item) => item.code === "DE") &&
        options.every(
          (item, index) =>
            index === 0 ||
            collator.compare(options[index - 1]?.name ?? "", item.name) <= 0,
        ) &&
        new Set(options.map((item) => item.code)).size === options.length,
    ).toBe(true);
  }
  expect(
    countryOptions("en-US").find((item) => item.code === "DE")?.name !==
      countryOptions("de-DE").find((item) => item.code === "DE")?.name,
  ).toBe(true);
});
it("zone choices include UTC and browser IANA choice exactly once", () => {
  const options = timeZoneOptions();
  expect(
    options.zones.includes("UTC") &&
      options.zones.includes(options.browser) &&
      new Set(options.zones).size === options.zones.length,
  ).toBe(true);
  for (const zone of options.zones)
    expect(
      () => new Intl.DateTimeFormat("en-US", { timeZone: zone }),
    ).not.toThrow();
});
