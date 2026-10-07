import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { MemoryRouter, useLocation } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { RouteDepartureLink } from "./RouteDepartureLink";
import {
  RouteDepartureProvider,
  useRouteDepartureGuard,
  type RouteDeparture,
} from "./routeDeparture";

function Location() {
  return <output data-testid="location">{useLocation().pathname}</output>;
}

function Guard({ decide }: { readonly decide: () => RouteDeparture }) {
  const [guard] = useState(() => decide);
  useRouteDepartureGuard(guard);
  return null;
}

function renderLink({
  decide,
  fallback = null,
  onDepart,
}: {
  readonly decide?: () => RouteDeparture;
  readonly fallback?: (() => RouteDeparture) | null;
  readonly onDepart?: (after?: () => void) => void;
}) {
  return render(
    <MemoryRouter initialEntries={["/start"]}>
      <RouteDepartureProvider fallback={fallback}>
        {decide ? <Guard decide={decide} /> : null}
        <RouteDepartureLink to="/target" {...(onDepart ? { onDepart } : {})}>
          Leave
        </RouteDepartureLink>
        <Location />
      </RouteDepartureProvider>
    </MemoryRouter>,
  );
}

const location = () => screen.getByTestId("location").textContent;

describe("route departure decisions", () => {
  it("asks before a confirm departure and navigates only through proceed", async () => {
    let proceed: (() => void) | null = null;
    renderLink({
      decide: () => ({
        kind: "confirm",
        ask: (next) => {
          proceed = next;
        },
      }),
    });
    await userEvent.setup().click(screen.getByRole("link", { name: "Leave" }));
    expect(location()).toBe("/start");
    expect(proceed).not.toBeNull();
    await vi.waitFor(() => {
      proceed?.();
      expect(location()).toBe("/target");
    });
  });

  it("runs the ask after the host's own departure work, such as closing a drawer", async () => {
    const order: string[] = [];
    renderLink({
      decide: () => ({ kind: "confirm", ask: () => order.push("ask") }),
      onDepart: (after) => {
        order.push("host");
        after?.();
      },
    });
    await userEvent.setup().click(screen.getByRole("link", { name: "Leave" }));
    expect(order).toEqual(["host", "ask"]);
    expect(location()).toBe("/start");
  });

  it("leaves a modified click to the browser without asking", () => {
    const ask = vi.fn();
    renderLink({ decide: () => ({ kind: "confirm", ask }) });
    const link = screen.getByRole("link", { name: "Leave" });
    fireEvent.click(link, { ctrlKey: true });
    expect(ask).not.toHaveBeenCalled();
    // A new tab or window keeps this tab, and its input, where it is.
    expect(location()).toBe("/start");
  });

  it("answers through the host fallback while no route guard is registered", async () => {
    const explain = vi.fn();
    renderLink({ fallback: () => ({ kind: "refuse", explain }) });
    await userEvent.setup().click(screen.getByRole("link", { name: "Leave" }));
    expect(explain).toHaveBeenCalledTimes(1);
    expect(location()).toBe("/start");
  });

  it("navigates ordinarily without a guard or fallback", async () => {
    renderLink({});
    await userEvent.setup().click(screen.getByRole("link", { name: "Leave" }));
    expect(location()).toBe("/target");
  });
});
