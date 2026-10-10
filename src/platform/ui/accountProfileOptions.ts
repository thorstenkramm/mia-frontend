import { countryCodes } from "./countryCodes";

export function countryOptions(
  locale: string,
): readonly { readonly code: string; readonly name: string }[] {
  const names = new Intl.DisplayNames([locale], { type: "region" });
  const collator = new Intl.Collator(locale);
  return countryCodes
    .map((code) => ({ code, name: names.of(code) ?? code }))
    .sort((left, right) => collator.compare(left.name, right.name));
}

// Invitation self-entry may prefill `browser`; managed-student entry uses only
// the choices, never inferring the student's preference from this browser.
export function timeZoneOptions(): {
  readonly zones: readonly string[];
  readonly browser: string;
} {
  const browser = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return {
    zones: [
      ...new Set([...Intl.supportedValuesOf("timeZone"), "UTC", browser]),
    ].sort(),
    browser,
  };
}
