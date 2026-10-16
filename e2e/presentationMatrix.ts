// Standalone Playwright runs retain the complete matrix. Only the local story
// gate opts into the audited presentation sample.
export function presentationMode(
  value: string | undefined = process.env.MIA_PRESENTATION_MATRIX,
): "story" | "full" {
  if (value === undefined || value === "full") return "full";
  if (value === "story") return "story";
  throw new Error("Invalid presentation matrix mode (expected story or full).");
}

export function presentationLocales<T extends string>(
  all: readonly T[],
  surface: "course" | "login",
): readonly T[] {
  if (presentationMode() === "full") return all;
  const selected =
    surface === "login"
      ? ["en-US", "de-DE", "fr-FR", "pt-PT"]
      : ["en-US", "de-DE", "fr-FR"];
  return all.filter((locale) => selected.includes(locale));
}
