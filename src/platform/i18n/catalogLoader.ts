import { catalogMessageIds, type MessageId } from "./messages";
import type { Locale } from "./locales";
import enUrl from "./catalogs/en-US.json?url";
import deUrl from "./catalogs/de-DE.json?url";
import frUrl from "./catalogs/fr-FR.json?url";
import ptPTUrl from "./catalogs/pt-PT.json?url";
import ptBRUrl from "./catalogs/pt-BR.json?url";
import esESUrl from "./catalogs/es-ES.json?url";
import esARUrl from "./catalogs/es-AR.json?url";

export type Catalog = Record<MessageId, string>;

// Explicit static specifiers are necessary for Vite to make seven lazy chunks.
// The URL assets are fetched only after an explicit failed-load retry; browsers
// may remember a failed import of the same module URL for the whole page.
const imports = {
  "en-US": () =>
    import("./catalogs/en-US.json").then((module) => module.default),
  "de-DE": () =>
    import("./catalogs/de-DE.json").then((module) => module.default),
  "fr-FR": () =>
    import("./catalogs/fr-FR.json").then((module) => module.default),
  "pt-PT": () =>
    import("./catalogs/pt-PT.json").then((module) => module.default),
  "pt-BR": () =>
    import("./catalogs/pt-BR.json").then((module) => module.default),
  "es-ES": () =>
    import("./catalogs/es-ES.json").then((module) => module.default),
  "es-AR": () =>
    import("./catalogs/es-AR.json").then((module) => module.default),
} satisfies Record<Locale, () => Promise<unknown>>;

const retryUrls = {
  "en-US": enUrl,
  "de-DE": deUrl,
  "fr-FR": frUrl,
  "pt-PT": ptPTUrl,
  "pt-BR": ptBRUrl,
  "es-ES": esESUrl,
  "es-AR": esARUrl,
} satisfies Record<Locale, string>;

function isCatalog(value: unknown): value is Catalog {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    return false;
  const entries = Object.entries(value);
  return (
    entries.length === catalogMessageIds.length &&
    entries.every(
      ([key, text]) =>
        catalogMessageIds.includes(key) &&
        typeof text === "string" &&
        text.length > 0,
    )
  );
}

// Public immutable UI strings only; never store API data or secrets here.
export class CatalogStore {
  private readonly loaded = new Map<Locale, Catalog>();
  private readonly pending = new Map<Locale, Promise<Catalog>>();

  constructor(
    private readonly importCatalog: (locale: Locale) => Promise<unknown> = (
      locale,
    ) => imports[locale](),
    private readonly retrieveCatalog: (
      locale: Locale,
    ) => Promise<unknown> = async (locale) => {
      const response = await fetch(retryUrls[locale], { cache: "reload" });
      if (!response.ok) throw new Error("Catalog asset unavailable.");
      return response.json();
    },
  ) {}

  get(locale: Locale): Catalog | undefined {
    return this.loaded.get(locale);
  }

  load(locale: Locale): Promise<Catalog> {
    const cached = this.loaded.get(locale);
    if (cached !== undefined) return Promise.resolve(cached);
    const pending = this.pending.get(locale);
    if (pending !== undefined) return pending;
    return this.accept(locale, this.importCatalog(locale));
  }

  retry(locale: Locale): Promise<Catalog> {
    const cached = this.loaded.get(locale);
    if (cached !== undefined) return Promise.resolve(cached);
    const pending = this.pending.get(locale);
    if (pending !== undefined) return pending;
    return this.accept(locale, this.retrieveCatalog(locale));
  }

  private accept(locale: Locale, request: Promise<unknown>): Promise<Catalog> {
    const pending = request
      .then((value) => {
        if (!isCatalog(value)) throw new Error("Invalid catalog asset.");
        this.loaded.set(locale, value);
        return value;
      })
      .finally(() => {
        this.pending.delete(locale);
      });
    this.pending.set(locale, pending);
    return pending;
  }
}

export const catalogStore = new CatalogStore();
