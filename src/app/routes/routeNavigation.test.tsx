import {
  act,
  configure,
  getConfig,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { delay, http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  authenticatedSessionResponse,
  ownProfileCapabilities,
  mfaStateResponse,
  mfaErrorResponse,
} from "../../../test/mfaFixtures";
import { server } from "../../../test/server";
import { AnnouncementProvider } from "../../platform/announcer/AnnouncementRegion";
import { MiaIntlProvider } from "../../platform/i18n/MiaIntlProvider";
import { InvitationLink } from "../../platform/session/invitationLink";
import { PasswordResetLink } from "../../platform/session/passwordResetLink";
import { App } from "../App";

const path = "/profile/security/mfa";
const defaultError = getConfig().getElementError;
function politeRegion() {
  return Array.from(document.querySelectorAll("[aria-live]")).find(
    (region) => region.getAttribute("aria-live") === "polite",
  );
}
function start(at = "/") {
  window.history.replaceState(null, "", at);
  return render(
    <AnnouncementProvider>
      <MiaIntlProvider initialLocale="en-US">
        <App
          initialTextSize="standard"
          passwordResetLink={new PasswordResetLink(null)}
          invitationLink={new InvitationLink(null)}
        />
      </MiaIntlProvider>
    </AnnouncementProvider>,
  );
}
function backend() {
  const ledger: string[] = [];
  const control = { own: true, sessionDelay: 0, resourceDelay: 0, failure: "" };
  server.use(
    http.get("/api/v1/auth/session", async () => {
      ledger.push("session");
      await delay(control.sessionDelay);
      return control.failure === "session"
        ? mfaErrorResponse(503, "unavailable")
        : authenticatedSessionResponse();
    }),
    http.get("/api/v1/users/me/capabilities", () => {
      ledger.push("capabilities");
      return control.failure === "capabilities"
        ? mfaErrorResponse(503, "unavailable")
        : ownProfileCapabilities("account-id", control.own);
    }),
    http.get("/api/v1/users/me/mfa", async () => {
      ledger.push("resource");
      await delay(control.resourceDelay);
      return control.failure === "resource"
        ? mfaErrorResponse(503, "unavailable")
        : mfaStateResponse();
    }),
  );
  return { ledger, control };
}
async function heading(name: string) {
  await waitFor(() =>
    expect(screen.getByRole("heading", { level: 1, name })).toHaveFocus(),
  );
}
async function enter(at: string) {
  await act(async () => {
    window.history.pushState({ key: crypto.randomUUID(), idx: 1 }, "", at);
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
}
describe("existing-route admission and navigation", () => {
  beforeEach(() =>
    configure({
      getElementError: (message) => new Error((message ?? "").split("\n")[0]),
    }),
  );
  afterEach(() => configure({ getElementError: defaultError }));

  it("orders direct admission and freshly checks every same-path history identity", async () => {
    const { ledger, control } = backend();
    start(path);
    await heading("Multi-factor authentication");
    expect(ledger).toEqual(["session", "capabilities", "resource"]);
    control.resourceDelay = 80;
    await enter(path);
    expect(screen.queryByRole("navigation")).toBeNull();
    expect(document.title).not.toContain("Multi-factor");
    await heading("Multi-factor authentication");
    expect(ledger).toEqual([
      "session",
      "capabilities",
      "resource",
      "session",
      "capabilities",
      "resource",
    ]);
  });

  it("withholds the destination through discovery and routes revoked scope safely without its resource", async () => {
    const { ledger, control } = backend();
    start();
    await heading("Home");
    control.sessionDelay = 80;
    control.own = false;
    await userEvent
      .setup()
      .click(screen.getByRole("link", { name: "Multi-factor authentication" }));
    expect(screen.queryByRole("navigation")).toBeNull();
    expect(document.title).not.toContain("Multi-factor");
    await heading("Home");
    expect(window.location.pathname).toBe("/");
    expect(ledger).toEqual([
      "session",
      "capabilities",
      "session",
      "capabilities",
    ]);
    expect(
      screen.queryByRole("link", { name: "Multi-factor authentication" }),
    ).toBeNull();
  });

  it("supersedes rapid entries and a late resource without exposing its destination", async () => {
    const { ledger, control } = backend();
    start();
    await heading("Home");
    control.resourceDelay = 100;
    await enter(path);
    await waitFor(() => expect(ledger).toContain("resource"));
    await enter("/");
    await heading("Home");
    await delay(130);
    expect(document.title).toBe("Home | MIA");
    expect(
      screen.queryByRole("button", { name: "Set up authenticator app" }),
    ).toBeNull();
    expect(politeRegion()).not.toHaveTextContent("Multi-factor authentication");
  });

  it("fences a route admission on lifecycle return and requires explicit Refresh", async () => {
    const { ledger, control } = backend();
    start();
    await heading("Home");
    control.sessionDelay = 100;
    await enter(path);
    await act(async () => window.dispatchEvent(new Event("focus")));
    await delay(130);
    expect(screen.queryByRole("navigation")).toBeNull();
    expect(ledger).toEqual(["session", "capabilities", "session"]);
    control.sessionDelay = 0;
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Refresh" }));
    await heading("Multi-factor authentication");
    expect(ledger.slice(-3)).toEqual(["session", "capabilities", "resource"]);
  });

  it.each(["session", "capabilities", "resource"])(
    "recovers a failed %s read with explicit reads only",
    async (failure) => {
      const { ledger, control } = backend();
      control.failure = failure;
      start(path);
      await heading("Unable to check access");
      expect(screen.queryByRole("navigation")).toBeNull();
      const user = userEvent.setup();
      control.failure = "";
      await user.click(screen.getByRole("button", { name: "Check again" }));
      await heading("Multi-factor authentication");
      expect(ledger.slice(-(failure === "resource" ? 1 : 3))).toEqual(
        failure === "resource"
          ? ["resource"]
          : ["session", "capabilities", "resource"],
      );
    },
  );

  it("offers a freshly admitted Home exit on resource failure", async () => {
    const { ledger, control } = backend();
    control.failure = "resource";
    start(path);
    await heading("Unable to check access");
    await userEvent
      .setup()
      .click(screen.getByRole("link", { name: "Back to Home" }));
    await heading("Home");
    expect(ledger).toEqual([
      "session",
      "capabilities",
      "resource",
      "session",
      "capabilities",
    ]);
  });

  it("commits title and route announcement before the admitted heading focus, once", async () => {
    backend();
    start();
    await heading("Home");
    expect(politeRegion()).toBeEmptyDOMElement();
    const observed: { title: string; spoken: string | null }[] = [];
    const focus = (event: FocusEvent) => {
      if (
        event.target instanceof HTMLElement &&
        event.target.tagName === "H1" &&
        event.target.textContent === "Multi-factor authentication"
      )
        observed.push({
          title: document.title,
          spoken: politeRegion()?.textContent ?? null,
        });
    };
    document.addEventListener("focusin", focus);
    try {
      await userEvent
        .setup()
        .click(
          screen.getByRole("link", { name: "Multi-factor authentication" }),
        );
      await heading("Multi-factor authentication");
      expect(observed).toEqual([
        {
          title: "Multi-factor authentication | MIA",
          spoken: "Multi-factor authentication",
        },
      ]);
      await userEvent
        .setup()
        .click(screen.getByRole("link", { name: "Back to Home" }));
      await heading("Home");
      expect(
        within(
          screen.getByRole("navigation", { name: "Application" }),
        ).getByRole("link", { name: "Home" }),
      ).toHaveAttribute("aria-current", "page");
    } finally {
      document.removeEventListener("focusin", focus);
    }
  });

  it("public recovery parent returns to login without retaining input", async () => {
    server.use(
      http.get("/api/v1/auth/session", () =>
        HttpResponse.json(
          { data: null, meta: { stage: "anonymous" } },
          { headers: { "Content-Type": "application/vnd.api+json" } },
        ),
      ),
    );
    start("/login/recovery");
    await waitFor(() =>
      expect(
        screen.getByRole("link", { name: "Back to sign-in" }),
      ).toBeVisible(),
    );
    await userEvent
      .setup()
      .click(screen.getByRole("link", { name: "Back to sign-in" }));
    await heading("Sign in to MIA");
    expect(window.location.pathname).toBe("/login");
  });
});
