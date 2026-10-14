export const locales = [
  "en-US",
  "de-DE",
  "fr-FR",
  "pt-PT",
  "pt-BR",
  "es-ES",
  "es-AR",
] as const;

export type Locale = (typeof locales)[number];

export function isLocale(value: string): value is Locale {
  return locales.some((locale) => locale === value);
}

function negotiateOne(language: string): Locale | null {
  let canonicalLanguage: string;

  try {
    const [canonical] = Intl.getCanonicalLocales(language);
    if (canonical === undefined) {
      return null;
    }
    canonicalLanguage = canonical;
  } catch {
    return null;
  }

  if (isLocale(canonicalLanguage)) {
    return canonicalLanguage;
  }

  const baseName = new Intl.Locale(canonicalLanguage).baseName;
  if (isLocale(baseName)) {
    return baseName;
  }

  const languageCode = baseName.split("-")[0];
  switch (languageCode) {
    case "en":
      return "en-US";
    case "de":
      return "de-DE";
    case "fr":
      return "fr-FR";
    case "pt":
      return "pt-PT";
    case "es":
      return "es-ES";
    default:
      return null;
  }
}

export function negotiateLocale(languages: readonly string[]): Locale {
  for (const language of languages) {
    const locale = negotiateOne(language);
    if (locale !== null) {
      return locale;
    }
  }
  return "en-US";
}

export function applyDocumentLocale(locale: Locale): void {
  document.documentElement.lang = locale;
  document.documentElement.dir = "ltr";
}

export function localeDisplayName(
  locale: Locale,
  displayLocale: Locale,
): string {
  return (
    new Intl.DisplayNames([displayLocale], { type: "language" }).of(locale) ??
    locale
  );
}
