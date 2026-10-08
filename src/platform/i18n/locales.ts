import deDE from "./catalogs/de-DE.json";
import esAR from "./catalogs/es-AR.json";
import esES from "./catalogs/es-ES.json";
import frFR from "./catalogs/fr-FR.json";
import ptBR from "./catalogs/pt-BR.json";
import ptPT from "./catalogs/pt-PT.json";
import { messages, type MessageId } from "./messages";

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

type Catalog = Record<MessageId, string>;

// FFR-955: the canonical English catalog matches these defaults (enforced in
// locales.test.ts). Avoid shipping the same English text table twice. Other
// locales remain synchronous; loading/switching and bootstrap are unchanged.
// Every descriptor contributes its ID and string default to this public map;
// the parity test checks complete keys as well as identical message values.
const enUS = Object.fromEntries(
  Object.values(messages).map(
    ({ id, defaultMessage }) => [id, defaultMessage] as const,
  ),
) satisfies Catalog;

export const catalogs = {
  "en-US": enUS,
  "de-DE": deDE,
  "fr-FR": frFR,
  "pt-PT": ptPT,
  "pt-BR": ptBR,
  "es-ES": esES,
  "es-AR": esAR,
} satisfies Record<Locale, Catalog>;

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
