import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useIntl } from "react-intl";
import { describe, expect, it, vi } from "vitest";
import { AnnouncementProvider } from "../announcer/AnnouncementRegion";
import { readStoredLocale } from "../prefs/preferences";
import en from "./catalogs/en-US.json";
import de from "./catalogs/de-DE.json";
import { CatalogStore } from "./catalogLoader";
import { MiaIntlProvider, useMiaI18n } from "./MiaIntlProvider";
import { applyDocumentLocale } from "./locales";
import { messages } from "./messages";

function deferred<T>() {
  let resolve: (value: T) => void = () => {
    throw new Error("Deferred resolver unavailable.");
  };
  let reject: (reason: Error) => void = () => {
    throw new Error("Deferred rejector unavailable.");
  };
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

it("single-flights a locale, keeps complete messages, and uses a separate explicit retry after failure", async () => {
  const pending = deferred<unknown>();
  const first = vi.fn(() => pending.promise);
  const retry = vi.fn(async () => de);
  const store = new CatalogStore(first, retry);
  const a = store.load("de-DE");
  const b = store.load("de-DE");
  expect(a).toBe(b);
  pending.reject(new Error("synthetic catalog outage"));
  await expect(a).rejects.toThrow();
  expect(store.get("de-DE")).toBeUndefined();
  expect(await store.retry("de-DE")).toEqual(de);
  expect(await store.load("de-DE")).toEqual(de);
  expect(first).toHaveBeenCalledTimes(1);
  expect(retry).toHaveBeenCalledTimes(1);
});

it("rejects an invalid or incomplete retry asset instead of showing default-language text", async () => {
  const store = new CatalogStore(
    async () => ({}),
    async () => ({ "entry.language.changed": "partial" }),
  );
  await expect(store.load("de-DE")).rejects.toThrow("Invalid catalog");
  await expect(store.retry("de-DE")).rejects.toThrow("Invalid catalog");
  expect(store.get("de-DE")).toBeUndefined();
});

function LocaleControls() {
  const {
    locale,
    changeLocale,
    loadState,
    retryLocale,
    cancelPendingActivation,
  } = useMiaI18n();
  const intl = useIntl();
  return (
    <>
      <h1>{intl.formatMessage(messages.introduction)}</h1>
      <button onClick={() => changeLocale("de-DE")}>Select German</button>
      <button onClick={() => changeLocale("en-US")}>Select English</button>
      <button onClick={retryLocale}>Retry</button>
      <button onClick={cancelPendingActivation}>Session transition</button>
      <span data-testid="phase">{loadState.kind}</span>
      <span data-testid="locale">{locale}</span>
    </>
  );
}

describe("locale switch transaction", () => {
  it.each(["success", "failure"] as const)(
    "cancels pending activation on a session transition before a late %s",
    async (outcome) => {
      const pending = deferred<unknown>();
      const store = new CatalogStore(async () => pending.promise);
      applyDocumentLocale("en-US");
      const user = userEvent.setup();
      render(
        <AnnouncementProvider>
          <MiaIntlProvider
            initialLocale="en-US"
            initialCatalog={en}
            store={store}
          >
            <LocaleControls />
          </MiaIntlProvider>
        </AnnouncementProvider>,
      );
      await user.click(screen.getByText("Select German"));
      await user.click(screen.getByText("Session transition"));
      await act(async () => {
        if (outcome === "success") pending.resolve(de);
        else pending.reject(new Error("stale catalog outage"));
      });
      expect(screen.getByTestId("phase")).toHaveTextContent("ready");
      expect(screen.getByTestId("locale")).toHaveTextContent("en-US");
      expect(document.documentElement.lang).toBe("en-US");
      expect(readStoredLocale()).not.toBe("de-DE");
      expect(screen.getByText(en["entry.introduction"])).toBeInTheDocument();
      for (const region of document.querySelectorAll("[aria-live]"))
        expect(region).toBeEmptyDOMElement();
    },
  );

  it("keeps old copy, lang and preference on failure; retry commits and cached switching is immediate", async () => {
    const pending = deferred<unknown>();
    const store = new CatalogStore(
      async () => pending.promise,
      async () => de,
    );
    await store.retry("en-US");
    applyDocumentLocale("en-US");
    const user = userEvent.setup();
    render(
      <AnnouncementProvider>
        <MiaIntlProvider
          initialLocale="en-US"
          initialCatalog={en}
          store={store}
        >
          <LocaleControls />
        </MiaIntlProvider>
      </AnnouncementProvider>,
    );
    await user.click(screen.getByText("Select German"));
    expect(screen.getByTestId("phase")).toHaveTextContent("loading-target");
    expect(screen.getByTestId("locale")).toHaveTextContent("en-US");
    expect(document.documentElement.lang).toBe("en-US");
    await act(async () => pending.reject(new Error("synthetic outage")));
    expect(screen.getByTestId("phase")).toHaveTextContent("failed-target");
    expect(readStoredLocale()).not.toBe("de-DE");
    await user.click(screen.getByText("Retry"));
    expect(await screen.findByTestId("locale")).toHaveTextContent("de-DE");
    expect(document.documentElement.lang).toBe("de-DE");
    expect(readStoredLocale()).toBe("de-DE");
    await user.click(screen.getByText("Select English"));
    expect(screen.getByTestId("locale")).toHaveTextContent("en-US");
    await user.click(screen.getByText("Select German"));
    expect(screen.getByTestId("locale")).toHaveTextContent("de-DE");
  });

  it("ignores late failure after a newer selection", async () => {
    const pending = deferred<unknown>();
    const store = new CatalogStore(
      async () => pending.promise,
      async () => en,
    );
    await store.retry("en-US");
    applyDocumentLocale("en-US");
    const user = userEvent.setup();
    render(
      <AnnouncementProvider>
        <MiaIntlProvider
          initialLocale="en-US"
          initialCatalog={en}
          store={store}
        >
          <LocaleControls />
        </MiaIntlProvider>
      </AnnouncementProvider>,
    );
    await user.click(screen.getByText("Select German"));
    await user.click(screen.getByText("Select English"));
    await act(async () => pending.reject(new Error("stale outage")));
    expect(screen.getByTestId("phase")).toHaveTextContent("ready");
    expect(screen.getByTestId("locale")).toHaveTextContent("en-US");
  });

  it("ignores late success after returning to the original locale", async () => {
    const pending = deferred<unknown>();
    const store = new CatalogStore(
      async () => pending.promise,
      async () => en,
    );
    await store.retry("en-US");
    applyDocumentLocale("en-US");
    const user = userEvent.setup();
    render(
      <AnnouncementProvider>
        <MiaIntlProvider
          initialLocale="en-US"
          initialCatalog={en}
          store={store}
        >
          <LocaleControls />
        </MiaIntlProvider>
      </AnnouncementProvider>,
    );
    await user.click(screen.getByText("Select German"));
    await user.click(screen.getByText("Select English"));
    await act(async () => pending.resolve(de));
    expect(screen.getByTestId("phase")).toHaveTextContent("ready");
    expect(screen.getByTestId("locale")).toHaveTextContent("en-US");
    expect(document.documentElement.lang).toBe("en-US");
  });
});
