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
import {
  authenticatedRoute,
  materialPath,
  prepareCoursePath,
  entryRoutes,
} from "./entryRoutes";
import { toCourseId, toMaterialId } from "../../platform/api/entry";

const path = "/profile/security/mfa";
it("readiness and activation preserve canonical opaque scope and explicit parents", () => {
  const course = toCourseId("opaque/course");
  const access = {
    ownProfileView: false,
    invitationAdministration: false,
    courseRecords: true,
    courseCreate: true,
    supervisorAssignments: true,
    courseSupervision: true,
    supervisedCourseIds: [course],
  };
  for (const surface of ["readiness", "activation"] as const) {
    const destination = prepareCoursePath(course, surface);
    expect(
      authenticatedRoute(destination, access).path === destination &&
        authenticatedRoute(destination, { ...access, supervisedCourseIds: [] })
          .key === "home" &&
        authenticatedRoute(`${destination}/`, access).key === "home",
    ).toBe(true);
  }
  expect(
    entryRoutes.preparationActivation.parent.path.endsWith("/readiness") &&
      entryRoutes.preparationReadiness.parent.path ===
        "/prepare/courses/:courseId",
  ).toBe(true);
});
it("material paths preserve opaque identity and require exact assigned supervision", () => {
  const course = toCourseId("opaque/course");
  const material = toMaterialId("opaque/material");
  if (material === null) throw new Error("Invalid synthetic route identity.");
  const access = {
    ownProfileView: false,
    invitationAdministration: false,
    courseRecords: true,
    courseCreate: true,
    supervisorAssignments: true,
    courseSupervision: true,
    supervisedCourseIds: [course],
  };
  for (const destination of [
    materialPath(course),
    materialPath(course, "create"),
    materialPath(course, "detail", material),
    materialPath(course, "files", material),
    materialPath(course, "brief", material),
  ]) {
    expect(authenticatedRoute(destination, access).path === destination).toBe(
      true,
    );
    expect(
      authenticatedRoute(destination, { ...access, supervisedCourseIds: [] })
        .key,
    ).toBe("home");
    expect(
      authenticatedRoute(destination, { ...access, courseSupervision: false })
        .key,
    ).toBe("home");
  }
  for (const suffix of ["/", "/review", "/finalize", "/activate"])
    expect(
      authenticatedRoute(
        `${materialPath(course, "detail", material)}${suffix}`,
        access,
      ).key,
    ).toBe("home");
});
it("course route dispatch keeps opaque identity canonical and excludes later actions", () => {
  const access = {
    ownProfileView: false,
    invitationAdministration: false,
    courseRecords: true,
    courseCreate: true,
    supervisorAssignments: true,
    courseSupervision: true,
  };
  expect(authenticatedRoute("/admin/courses/new", access).key).toBe(
    "courseCreate",
  );
  expect(
    authenticatedRoute("/admin/courses/opaque%2Fidentifier", access).path,
  ).toBe("/admin/courses/opaque%2Fidentifier");
  for (const unsupported of [
    "/admin/courses/",
    "/admin/courses/new/",
    "/admin/courses/id/supervisors",
    "/admin/courses/id/delete",
    "/prepare/courses/id",
    "/admin/courses/%",
  ])
    expect(authenticatedRoute(unsupported, access).key).toBe("home");
  expect(
    authenticatedRoute("/admin/courses/new", {
      ...access,
      supervisorAssignments: false,
    }).key,
  ).toBe("home");
  expect(
    authenticatedRoute("/prepare/courses", {
      ...access,
      courseSupervision: false,
    }).key,
  ).toBe("home");
});
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
