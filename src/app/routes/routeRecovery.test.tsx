import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { lazy } from "react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { AnnouncementProvider } from "../../platform/announcer/AnnouncementRegion";
import { MiaIntlProvider } from "../../platform/i18n/MiaIntlProvider";
import { RouteDepartureProvider } from "../../platform/ui/routeDeparture";
import { RouteDepartureLink } from "../../platform/ui/RouteDepartureLink";
import { RouteRecoveryBoundary } from "./RouteRecoveryBoundary";
import { SimpleEntrySurface } from "./SimpleEntrySurface";
import { messages } from "../../platform/i18n/messages";

describe("eager lazy-route recovery", () => {
  it.each([false, true])(
    "keeps the frame and truthful exits after import rejection (codes held: %s)",
    async (holdingCodes) => {
      let reject: (reason: Error) => void = () => {};
      const Loaded = lazy(
        () =>
          new Promise<never>((_, fail) => {
            reject = fail;
          }),
      );
      const explained = vi.fn();
      const caught = vi.fn();
      render(
        <AnnouncementProvider>
          <MiaIntlProvider initialLocale="en-US">
            <MemoryRouter>
              <RouteDepartureProvider
                fallback={
                  holdingCodes
                    ? () => ({ kind: "refuse", explain: explained })
                    : null
                }
              >
                <SimpleEntrySurface
                  titleMessage={messages.mfaCodesPageTitle}
                  headingMessage={messages.mfaCodesHeading}
                >
                  <RouteRecoveryBoundary
                    canReload={!holdingCodes}
                    actions={
                      <>
                        <RouteDepartureLink to="/">
                          Back to Home
                        </RouteDepartureLink>
                        <button type="button">Sign out</button>
                      </>
                    }
                  >
                    <Loaded />
                  </RouteRecoveryBoundary>
                </SimpleEntrySurface>
              </RouteDepartureProvider>
            </MemoryRouter>
          </MiaIntlProvider>
        </AnnouncementProvider>,
        { onCaughtError: caught },
      );
      expect(screen.getByText("Loading this page…")).toBeVisible();
      await act(async () => reject(new Error("Synthetic import failure")));
      expect(
        screen.getByRole("heading", {
          level: 2,
          name: "This page could not be loaded",
        }),
      ).toBeVisible();
      expect(screen.getAllByRole("main")).toHaveLength(1);
      expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
      expect(screen.queryByText("Synthetic import failure")).toBeNull();
      expect(screen.getByRole("button", { name: "Sign out" })).toBeVisible();
      expect(
        screen.queryByRole("button", { name: "Reload page" }) !== null,
      ).toBe(!holdingCodes);
      if (holdingCodes) {
        await userEvent
          .setup()
          .click(screen.getByRole("link", { name: "Back to Home" }));
        expect(explained).toHaveBeenCalledOnce();
      }
      expect(caught).toHaveBeenCalled();
    },
  );

  it("drops a pending child on departure so its later resolution cannot mount", async () => {
    let release: () => void = () => {};
    const Loaded = lazy(
      () =>
        new Promise<{ default: () => React.JSX.Element }>((resolve) => {
          release = () =>
            resolve({ default: () => <button>Late child</button> });
        }),
    );
    const view = render(
      <AnnouncementProvider>
        <MiaIntlProvider initialLocale="en-US">
          <RouteRecoveryBoundary>
            <Loaded />
          </RouteRecoveryBoundary>
        </MiaIntlProvider>
      </AnnouncementProvider>,
    );
    expect(screen.getByText("Loading this page…")).toBeVisible();
    view.unmount();
    await act(async () => release());
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Late child" })).toBeNull(),
    );
  });
});
