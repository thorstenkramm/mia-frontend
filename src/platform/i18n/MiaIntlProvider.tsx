import { createContext, use, useRef, useState, type ReactNode } from "react";
import { IntlProvider } from "react-intl";
import { useAnnouncer } from "../announcer/AnnouncementRegion";
import { readStoredLocale, storeLocale } from "../prefs/preferences";
import {
  applyDocumentLocale,
  catalogs,
  isLocale,
  negotiateLocale,
  type Locale,
} from "./locales";

type I18nContextValue = {
  locale: Locale;
  changeLocale: (locale: Locale) => void;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function resolveInitialLocale(
  browserLanguages: readonly string[],
): Locale {
  const storedLocale = readStoredLocale();
  return storedLocale !== null && isLocale(storedLocale)
    ? storedLocale
    : negotiateLocale(browserLanguages);
}

type MiaIntlProviderProps = {
  initialLocale: Locale;
  children: ReactNode;
};

export function MiaIntlProvider({
  initialLocale,
  children,
}: MiaIntlProviderProps) {
  const [locale, setLocale] = useState(initialLocale);
  const activeLocale = useRef(initialLocale);
  const { announce } = useAnnouncer();

  function changeLocale(locale: Locale): void {
    if (locale === activeLocale.current) {
      return;
    }

    activeLocale.current = locale;
    applyDocumentLocale(locale);
    storeLocale(locale);
    setLocale(locale);
    announce(catalogs[locale]["entry.language.changed"]);
  }

  return (
    <I18nContext value={{ locale, changeLocale }}>
      <IntlProvider locale={locale} messages={catalogs[locale]}>
        {children}
      </IntlProvider>
    </I18nContext>
  );
}

export function useMiaI18n(): I18nContextValue {
  const context = use(I18nContext);
  if (context === null) {
    throw new Error("MIA localization must be used within MiaIntlProvider.");
  }
  return context;
}
