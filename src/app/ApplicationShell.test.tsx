import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { delay, http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import {
  authenticatedSessionResponse,
  mfaStateResponse,
  ownProfileCapabilities,
} from "../../test/mfaFixtures";
import { server } from "../../test/server";
import { App } from "./App";
import { AnnouncementProvider } from "../platform/announcer/AnnouncementRegion";
import { applyDocumentLocale } from "../platform/i18n/locales";
import { MiaIntlProvider } from "../platform/i18n/MiaIntlProvider";
import { applyTextSize } from "../platform/prefs/preferences";
import { InvitationLink } from "../platform/session/invitationLink";
import { PasswordResetLink } from "../platform/session/passwordResetLink";

const mediaType = "application/vnd.api+json";
const actions = [
  "profile.view",
  "profile.edit",
  "accounts.administer",
  "audit.view",
  "jobs.view",
  "courses.create",
  "course_records.manage",
  "course_supervisors.manage",
  "courses.supervise",
  "students.manage",
  "students.ban",
  "students.unban",
  "learning.participate",
  "mentoring.fulfill",
] as const;

// Every release-one action available in a scope: administrator, supervisor,
// mentor, and student at once.
function everyCapability() {
  return HttpResponse.json(
    {
      data: {
        type: "account-capabilities",
        id: "account-id",
        attributes: {
          capabilities: actions.map((action) => ({
            action,
            available: true,
            scope: {
              global: action !== "profile.view" && action !== "profile.edit",
              course_ids: ["course-a"],
              student_ids: ["student-a"],
              course_students: [{ course_id: "course-a", student_id: "s-a" }],
              own_resource:
                action === "profile.view" || action === "profile.edit",
            },
          })),
        },
      },
    },
    { headers: { "Content-Type": mediaType } },
  );
}

function stageResponse(stage: "anonymous" | "mfa" | "password-change") {
  if (stage === "anonymous")
    return HttpResponse.json(
      { data: null, meta: { stage: "anonymous" } },
      { headers: { "Content-Type": mediaType } },
    );
  return HttpResponse.json(
    {
      data: {
        type: "auth-sessions",
        id: "account-id",
        attributes: {
          stage,
          ...(stage === "mfa" ? { mfa_challenge_id: "challenge-id" } : {}),
          idle_expires_at: "2026-09-27T10:30:00.000000Z",
          absolute_expires_at: "2026-09-27T22:00:00.000000Z",
        },
      },
    },
    { headers: { "Content-Type": mediaType } },
  );
}

type Counts = { session: number; capabilities: number; mfa: number };

function authenticatedHandlers(
  counts: Counts,
  capabilities: () => Response = () => ownProfileCapabilities(),
  mfa: () => Response | Promise<Response> = () => mfaStateResponse(),
) {
  return [
    http.get("/api/v1/auth/session", () => {
      counts.session++;
      return authenticatedSessionResponse();
    }),
    http.get("/api/v1/users/me/capabilities", () => {
      counts.capabilities++;
      return capabilities();
    }),
    http.get("/api/v1/users/me/mfa", () => {
      counts.mfa++;
      return mfa();
    }),
  ];
}

function renderAt(path: string, ...handlers: Parameters<typeof server.use>) {
  window.history.replaceState(null, "", path);
  document.cookie = `mia_csrf=${crypto.randomUUID()}; Path=/`;
  server.use(...handlers);
  applyDocumentLocale("en-US");
  applyTextSize("standard");
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

function deferred() {
  let release: (() => void) | undefined;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return {
    promise,
    resolve() {
      if (release === undefined) throw new Error("Missing fixture release");
      release();
    },
  };
}

function navigation() {
  return screen.getByRole("navigation", { name: "Application" });
}

function linkNames(): string[] {
  return within(navigation())
    .getAllByRole("link")
    .map((link) => link.textContent);
}

async function home() {
  return screen.findByRole("heading", { level: 1, name: "Home" });
}

describe("application shell", () => {
  it("exposes Home, the authorized Profile and security destination, and Sign out", async () => {
    const counts = { session: 0, capabilities: 0, mfa: 0 };
    renderAt("/", ...authenticatedHandlers(counts));
    expect(await home()).toHaveFocus();
    expect(document.title).toBe("Home | MIA");

    expect(linkNames()).toEqual(["Home", "Multi-factor authentication"]);
    expect(
      within(navigation()).getByRole("link", { name: "Home" }),
    ).toHaveAttribute("aria-current", "page");
    const group = within(navigation()).getByRole("list", {
      name: "Profile and security",
    });
    expect(
      within(group).getByRole("link", { name: "Multi-factor authentication" }),
    ).not.toHaveAttribute("aria-current");
    expect(
      within(navigation()).getByRole("button", { name: "Sign out" }),
    ).toBeVisible();
  });

  it("shows no unimplemented destination or role switcher for every available capability", async () => {
    const counts = { session: 0, capabilities: 0, mfa: 0 };
    renderAt("/", ...authenticatedHandlers(counts, everyCapability));
    await home();

    // Only landed destinations, including joined-scope Learn discovery;
    // no future tutoring destination or role switcher.
    expect(linkNames()).toEqual([
      "Home",
      "Joined courses",
      "Courses",
      "Invitations",
      "Prepare courses",
      "Multi-factor authentication",
    ]);
    expect(within(navigation()).getAllByRole("list")).toHaveLength(6);
    const administer = within(navigation()).getByRole("list", {
      name: "Administer",
    });
    expect(
      within(administer)
        .getAllByRole("link")
        .map((link) => link.textContent),
    ).toEqual(["Courses", "Invitations"]);
    for (const absent of [/mentor/iu, /accounts/iu])
      expect(screen.queryByText(absent)).toBeNull();
    expect(screen.queryByRole("combobox")).toBeNull();
    expect(screen.queryByRole("radiogroup")).toBeNull();
    expect(screen.getAllByRole("navigation")).toHaveLength(1);
  });

  it("omits the Profile and security group without own-scope profile.view", async () => {
    const counts = { session: 0, capabilities: 0, mfa: 0 };
    renderAt(
      "/",
      ...authenticatedHandlers(counts, () =>
        ownProfileCapabilities("account-id", false),
      ),
    );
    await home();

    expect(linkNames()).toEqual(["Home"]);
    expect(screen.queryByText("Profile and security")).toBeNull();
    expect(
      within(navigation()).getByRole("button", { name: "Sign out" }),
    ).toBeVisible();
  });

  it("reads nothing for a destination until it is chosen and mounts the shell only after its route gate", async () => {
    const counts = { session: 0, capabilities: 0, mfa: 0 };
    const gate = deferred();
    renderAt(
      "/",
      ...authenticatedHandlers(counts, undefined, async () => {
        await gate.promise;
        return mfaStateResponse();
      }),
    );
    await home();
    await delay(20);
    expect(counts).toEqual({ session: 1, capabilities: 1, mfa: 0 });

    const user = userEvent.setup();
    await user.click(
      within(navigation()).getByRole("link", {
        name: "Multi-factor authentication",
      }),
    );
    expect(
      await screen.findByRole("heading", { level: 1, name: "Checking access" }),
    ).toBeVisible();
    expect(screen.queryByRole("navigation")).toBeNull();
    expect(screen.queryByRole("button", { name: "Sign out" })).toBeNull();

    gate.resolve();
    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Multi-factor authentication",
      }),
    ).toHaveFocus();
    expect(
      within(navigation()).getByRole("link", {
        name: "Multi-factor authentication",
      }),
    ).toHaveAttribute("aria-current", "page");
    expect(
      within(navigation()).getByRole("link", { name: "Home" }),
    ).not.toHaveAttribute("aria-current");
    expect(counts).toEqual({ session: 2, capabilities: 2, mfa: 1 });
  });

  it.each([
    ["anonymous", "Sign in to MIA"],
    ["mfa", "Verify sign-in"],
    ["password-change", "Choose a new password"],
  ] as const)(
    "renders only the focused %s flow at a protected path",
    async (stage, heading) => {
      let capabilityReads = 0;
      renderAt(
        "/profile/security/mfa",
        http.get("/api/v1/auth/session", () => stageResponse(stage)),
        http.get("/api/v1/users/me/capabilities", () => {
          capabilityReads++;
          return ownProfileCapabilities();
        }),
      );
      expect(
        await screen.findByRole("heading", { level: 1, name: heading }),
      ).toBeVisible();
      expect(screen.queryByRole("navigation")).toBeNull();
      expect(screen.queryByRole("link", { name: "Home" })).toBeNull();
      expect(document.title).not.toMatch(/Multi-factor|Home/u);
      expect(capabilityReads).toBe(0);
    },
  );

  it("keeps a failed capability check and the privacy shield free of navigation", async () => {
    let fail = true;
    renderAt(
      "/",
      http.get("/api/v1/auth/session", () => authenticatedSessionResponse()),
      http.get("/api/v1/users/me/capabilities", () =>
        fail
          ? HttpResponse.json(
              { errors: [{ status: "503", code: "unavailable" }] },
              { status: 503, headers: { "Content-Type": mediaType } },
            )
          : ownProfileCapabilities(),
      ),
    );
    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Unable to check access",
      }),
    ).toBeVisible();
    expect(screen.queryByRole("navigation")).toBeNull();

    fail = false;
    act(() => window.dispatchEvent(new Event("pagehide")));
    expect(
      screen.getByRole("heading", { level: 1, name: "Content hidden" }),
    ).toBeVisible();
    expect(screen.queryByRole("navigation")).toBeNull();
  });

  it("starts with the bypass link and sets the title before the route heading takes focus", async () => {
    const counts = { session: 0, capabilities: 0, mfa: 0 };
    renderAt("/", ...authenticatedHandlers(counts));
    await home();
    const user = userEvent.setup();

    if (document.activeElement instanceof HTMLElement)
      document.activeElement.blur();
    await user.tab();
    const bypass = screen.getByRole("link", { name: "Skip to main content" });
    expect(bypass).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("main")).toHaveFocus();

    const titlesAtHeadingFocus: string[] = [];
    const record = (event: FocusEvent) => {
      if (event.target instanceof HTMLHeadingElement)
        titlesAtHeadingFocus.push(document.title);
    };
    document.addEventListener("focusin", record);
    await user.click(
      within(navigation()).getByRole("link", {
        name: "Multi-factor authentication",
      }),
    );
    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Multi-factor authentication",
      }),
    ).toHaveFocus();
    document.removeEventListener("focusin", record);
    expect(titlesAtHeadingFocus.at(-1)).toBe(
      "Multi-factor authentication | MIA",
    );
  });

  it("signs out from the shell with one fresh-CSRF logout and removes the navigation", async () => {
    const gate = deferred();
    let anonymous = false;
    let posts = 0;
    let csrfMatched = false;
    renderAt(
      "/",
      http.get("/api/v1/auth/session", () =>
        anonymous ? stageResponse("anonymous") : authenticatedSessionResponse(),
      ),
      http.get("/api/v1/users/me/capabilities", () => ownProfileCapabilities()),
      http.post("/api/v1/auth/logout", async ({ request }) => {
        posts++;
        csrfMatched =
          request.headers.get("X-CSRF-Token") ===
          document.cookie.match(/mia_csrf=([^;]+)/u)?.[1];
        await gate.promise;
        anonymous = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    await home();
    await userEvent
      .setup()
      .click(within(navigation()).getByRole("button", { name: "Sign out" }));

    expect(
      await screen.findByRole("heading", { level: 1, name: "Signing out" }),
    ).toHaveFocus();
    expect(screen.queryByRole("navigation")).toBeNull();
    gate.resolve();
    await screen.findByLabelText("Password (required)");
    expect({ posts, csrfMatched }).toEqual({ posts: 1, csrfMatched: true });
    expect(screen.queryByRole("navigation")).toBeNull();
  });

  it("never mounts Home when a delayed Refresh settles after the tab was hidden again", async () => {
    let gate: ReturnType<typeof deferred> | null = null;
    let capabilityReads = 0;
    renderAt(
      "/",
      http.get("/api/v1/auth/session", async () => {
        if (gate) await gate.promise;
        return authenticatedSessionResponse();
      }),
      http.get("/api/v1/users/me/capabilities", () => {
        capabilityReads++;
        return ownProfileCapabilities();
      }),
    );
    await home();
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    expect(
      screen.getByRole("heading", { level: 1, name: "Content hidden" }),
    ).toBeVisible();

    const pending = deferred();
    gate = pending;
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Refresh" }));
    screen.getByRole("button", { name: "Stop waiting" }).focus();
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    pending.resolve();
    await delay(20);

    expect(screen.queryByRole("heading", { name: "Home" })).toBeNull();
    expect(screen.queryByRole("navigation")).toBeNull();
    expect(
      screen.getByRole("heading", { level: 1, name: "Content hidden" }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Refresh" })).toHaveFocus();
    expect(capabilityReads).toBe(1);

    gate = null;
    await user.click(screen.getByRole("button", { name: "Refresh" }));
    expect(await home()).toHaveFocus();
    expect(capabilityReads).toBe(2);
  });

  it("presents Home as a neutral entry without work claims", async () => {
    const counts = { session: 0, capabilities: 0, mfa: 0 };
    renderAt("/", ...authenticatedHandlers(counts));
    await home();
    const main = screen.getByRole("main");

    expect(
      within(main).getByText("Choose an area from the navigation to continue."),
    ).toBeVisible();
    expect(within(main).queryAllByRole("list")).toHaveLength(0);
    expect(within(main).queryAllByRole("link")).toHaveLength(0);
    expect(within(main).queryAllByRole("button")).toHaveLength(0);
  });

  it("opens the narrow-layout navigation drawer and closes it on navigation", async () => {
    const counts = { session: 0, capabilities: 0, mfa: 0 };
    renderAt("/", ...authenticatedHandlers(counts));
    await home();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Open navigation" }));
    const drawer = await screen.findByRole("dialog", { name: "Application" });
    expect(
      within(drawer).getByRole("button", { name: "Close navigation" }),
    ).toBeVisible();
    await user.click(
      within(drawer).getByRole("link", { name: "Multi-factor authentication" }),
    );

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Multi-factor authentication",
      }),
    ).toHaveFocus();
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});
