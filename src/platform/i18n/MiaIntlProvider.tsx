import {
  createContext,
  use,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { IntlProvider } from "react-intl";
import { useAnnouncer } from "../announcer/AnnouncementRegion";
import { readStoredLocale, storeLocale } from "../prefs/preferences";
import { catalogStore, type Catalog, type CatalogStore } from "./catalogLoader";
import {
  applyDocumentLocale,
  isLocale,
  negotiateLocale,
  type Locale,
} from "./locales";

type I18nContextValue = {
  locale: Locale;
  changeLocale: (locale: Locale) => void;
  loadState:
    | { readonly kind: "ready" }
    | {
        readonly kind: "loading-target" | "failed-target";
        readonly target: Locale;
      };
  retryLocale: () => void;
  cancelPendingActivation: () => void;
};

type ActiveState = {
  locale: Locale;
  catalog: Catalog;
  loadState: I18nContextValue["loadState"];
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
  initialCatalog?: Catalog;
  store?: CatalogStore;
  children: ReactNode;
};

export function MiaIntlProvider({
  initialLocale,
  initialCatalog,
  store = catalogStore,
  children,
}: MiaIntlProviderProps) {
  const [current, setCurrent] = useState<ActiveState>(() => {
    const catalog = initialCatalog ?? store.get(initialLocale);
    if (catalog === undefined)
      throw new Error("Active catalog must load before rendering.");
    return {
      locale: initialLocale,
      catalog,
      loadState: { kind: "ready" } as const,
    };
  });
  const activeLocale = useRef(initialLocale);
  const generation = useRef(0);
  const { announce } = useAnnouncer();

  useEffect(
    () => () => {
      generation.current += 1;
    },
    [],
  );

  function commit(locale: Locale, catalog: Catalog): void {
    activeLocale.current = locale;
    applyDocumentLocale(locale);
    storeLocale(locale);
    setCurrent({ locale, catalog, loadState: { kind: "ready" } });
    const announcement = catalog["entry.language.changed"];
    if (announcement !== undefined) announce(announcement);
  }

  function request(locale: Locale, retry: boolean): void {
    const requestId = ++generation.current;
    setCurrent((previous) => ({
      ...previous,
      loadState: { kind: "loading-target", target: locale },
    }));
    const operation = retry ? store.retry(locale) : store.load(locale);
    void operation.then(
      (catalog) => {
        if (requestId === generation.current) commit(locale, catalog);
      },
      () => {
        if (requestId === generation.current) {
          setCurrent((previous) => ({
            ...previous,
            loadState: { kind: "failed-target", target: locale },
          }));
          const label = current.catalog["entry.language.label"];
          const failed = current.catalog["materials.failed"];
          if (label !== undefined && failed !== undefined)
            announce(`${label}: ${failed}`, "urgent");
        }
      },
    );
  }

  function changeLocale(locale: Locale): void {
    if (locale === activeLocale.current) {
      generation.current += 1;
      setCurrent((previous) => ({ ...previous, loadState: { kind: "ready" } }));
      return;
    }
    const cached = store.get(locale);
    generation.current += 1;
    if (cached !== undefined) commit(locale, cached);
    else request(locale, false);
  }

  function retryLocale(): void {
    if (current.loadState.kind === "failed-target")
      request(current.loadState.target, true);
  }

  function cancelPendingActivation(): void {
    generation.current += 1;
    setCurrent((previous) =>
      previous.loadState.kind === "ready"
        ? previous
        : { ...previous, loadState: { kind: "ready" } },
    );
  }

  return (
    <I18nContext
      value={{
        locale: current.locale,
        changeLocale,
        loadState: current.loadState,
        retryLocale,
        cancelPendingActivation,
      }}
    >
      <IntlProvider locale={current.locale} messages={current.catalog}>
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
