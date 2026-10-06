import { createHash, randomBytes } from "node:crypto";
import { useEffect } from "react";
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
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  authenticatedSessionResponse,
  enrollmentResponse,
  mfaErrorResponse,
  mfaStateResponse,
  ownProfileCapabilities,
  provisioningUriFixture,
  recoveryCodesFixture,
  recoveryCodesResponse,
  totpSecretFixture,
  type MfaStateFixture,
} from "../../test/mfaFixtures";
import {
  expectSameSecret,
  expectSecretAbsent,
} from "../../test/secretAssertions";
import { server } from "../../test/server";
import { App } from "./App";
import {
  createEntryQueryClient,
  type EntryQueryClient,
} from "../platform/data/EntryDataProvider";
import {
  AnnouncementProvider,
  useAnnouncer,
} from "../platform/announcer/AnnouncementRegion";
import { applyDocumentLocale } from "../platform/i18n/locales";
import {
  MiaIntlProvider,
  resolveInitialLocale,
} from "../platform/i18n/MiaIntlProvider";
import {
  applyTextSize,
  readStoredLocale,
  readTextSize,
} from "../platform/prefs/preferences";
import {
  captureInvitationLink,
  InvitationLink,
} from "../platform/session/invitationLink";
import {
  capturePasswordResetLink,
  PasswordResetLink,
} from "../platform/session/passwordResetLink";

const mediaType = "application/vnd.api+json";
const defaultElementError = getConfig().getElementError;

function lifecycleResponse(absolute = false, renewed = false) {
  return HttpResponse.json(
    {
      data: {
        type: "auth-sessions",
        id: "account-id",
        attributes: {
          stage: "authenticated",
          idle_expires_at: renewed
            ? "2026-09-27T11:00:00.000000Z"
            : "2026-09-27T10:30:00.000000Z",
          absolute_expires_at: absolute
            ? "2026-09-27T10:30:00.000000Z"
            : "2026-09-27T22:00:00.000000Z",
        },
      },
    },
    { headers: { "Content-Type": mediaType } },
  );
}

function lifecycleCapabilities() {
  return http.get("/api/v1/users/me/capabilities", () =>
    HttpResponse.json(capabilityDocument(), {
      headers: { "Content-Type": mediaType },
    }),
  );
}

describe("lifecycle privacy rendering", () => {
  it.each(["mfa", "anonymous"])(
    "focus preserves typed %s credentials without requests",
    async (stage) => {
      let reads = 0;
      renderEntry(
        stage === "mfa"
          ? sessionHandler("mfa", () => {
              reads++;
            })
          : http.get("/api/v1/auth/session", () => {
              reads++;
              return HttpResponse.json(
                { data: null, meta: { stage: "anonymous" } },
                { headers: { "Content-Type": mediaType } },
              );
            }),
      );
      const field = await screen.findByLabelText<HTMLInputElement>(
        stage === "mfa" ? "Six-digit code (required)" : "Password (required)",
      );
      const value = stage === "mfa" ? mfaCodeFixture() : crypto.randomUUID();
      await userEvent.setup().type(field, value);
      act(() => window.dispatchEvent(new Event("focus")));
      expect(field.isConnected && field.value === value).toBe(true);
      expect(reads).toBe(1);
    },
  );

  it("focus during rotating login does not fence the admitted transition", async () => {
    const gate = deferredVoid();
    let posts = 0;
    renderEntry(
      anonymousHandler(),
      lifecycleCapabilities(),
      http.post("/api/v1/auth/login", async () => {
        posts++;
        await gate.promise;
        return lifecycleResponse();
      }),
    );
    document.cookie = `mia_csrf=${crypto.randomUUID()}; Path=/`;
    const user = userEvent.setup();
    await user.type(
      await screen.findByLabelText("Username (required)"),
      "learner",
    );
    await user.type(
      screen.getByLabelText("Password (required)"),
      crypto.randomUUID(),
    );
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => expect(posts).toBe(1));
    act(() => window.dispatchEvent(new Event("focus")));
    gate.resolve();
    await screen.findByRole("heading", { name: "Home", level: 1 });
    expect(posts).toBe(1);
  });

  it.each([false, true])(
    "warning actions match absolute-governed=%s",
    async (absolute) => {
      vi.setSystemTime(new Date("2026-09-27T10:26:00.000Z"));
      renderEntry(
        http.get("/api/v1/auth/session", () => lifecycleResponse(absolute)),
        lifecycleCapabilities(),
      );
      await screen.findByRole("heading", { name: "Home", level: 1 });
      expect(
        screen.queryByRole("button", { name: "Continue working" }) !== null,
      ).toBe(!absolute);
      expect(
        screen.getAllByRole("button", { name: "Sign out" }).length,
      ).toBeGreaterThan(0);
      expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
        absolute ? "cannot be extended and will end soon" : "nearing expiry",
      );
    },
  );

  it("anonymous pagehide offers Refresh without Sign out", async () => {
    renderEntry();
    await screen.findByLabelText("Password (required)");
    act(() => window.dispatchEvent(new Event("pagehide")));
    expect(screen.getByRole("button", { name: "Refresh" })).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Sign out" }),
    ).not.toBeInTheDocument();
  });

  it.each([false, true])(
    "continuation settlement restores focus from Stop waiting; renewed=%s",
    async (renewed) => {
      vi.setSystemTime(new Date("2026-09-27T10:26:00.000Z"));
      const gate = deferredVoid();
      renderEntry(
        http.get("/api/v1/auth/session", () => lifecycleResponse()),
        lifecycleCapabilities(),
        http.post("/api/v1/auth/session-continuations", async () => {
          await gate.promise;
          return lifecycleResponse(false, renewed);
        }),
      );
      document.cookie = `mia_csrf=${crypto.randomUUID()}; Path=/`;
      const button = await screen.findByRole("button", {
        name: "Continue working",
      });
      await waitFor(() =>
        expect(announcementRegion("polite")).toHaveTextContent(
          "nearing expiry",
        ),
      );
      const announcement = announcementRegion("polite").firstChild;
      await userEvent.setup().click(button);
      expect(announcementRegion("polite").firstChild).toBe(announcement);
      screen.getByRole("button", { name: "Stop waiting" }).focus();
      gate.resolve();
      await waitFor(() =>
        expect(
          renewed
            ? screen.getByRole("heading", { name: "Home", level: 1 })
            : screen.getByRole("button", { name: "Continue working" }),
        ).toHaveFocus(),
      );
    },
  );

  it("failed recovery capabilities retain the shield, feedback, and Refresh focus", async () => {
    const gate = deferredVoid();
    renderEntry(
      http.get("/api/v1/auth/session", () => lifecycleResponse()),
      lifecycleCapabilities(),
    );
    await screen.findByRole("heading", { name: "Home", level: 1 });
    act(() => window.dispatchEvent(new Event("focus")));
    server.use(
      http.get("/api/v1/users/me/capabilities", async () => {
        await gate.promise;
        return HttpResponse.error();
      }),
    );
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Refresh" }));
    screen.getByRole("button", { name: "Stop waiting" }).focus();
    gate.resolve();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Refresh" })).toHaveFocus(),
    );
    expect(
      screen.getByText(/could not check your sign-in and access/u, {
        selector: "p",
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Content hidden" }),
    ).toBeVisible();
  });

  it("Home Sign out sends one fresh-CSRF logout, shows Signing out, then confirms", async () => {
    const gate = deferredVoid();
    const csrf = crypto.randomUUID();
    let anonymous = false;
    let posts = 0;
    let validCsrf = false;
    renderEntry(
      http.get("/api/v1/auth/session", () =>
        anonymous
          ? HttpResponse.json(
              { data: null, meta: { stage: "anonymous" } },
              { headers: { "Content-Type": mediaType } },
            )
          : lifecycleResponse(),
      ),
      lifecycleCapabilities(),
      http.post("/api/v1/auth/logout", async ({ request }) => {
        posts++;
        validCsrf = request.headers.get("X-CSRF-Token") === csrf;
        await gate.promise;
        anonymous = true;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    await screen.findByRole("heading", { name: "Home", level: 1 });
    document.cookie = `mia_csrf=${csrf}; Path=/`;
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Sign out" }));
    await screen.findByRole("heading", { name: "Signing out" });
    await waitFor(() => expect(posts).toBe(1));
    gate.resolve();
    await screen.findByLabelText("Password (required)");
    expect({ posts, validCsrf }).toEqual({ posts: 1, validCsrf: true });
    expect(
      screen.getByText(/Signed out at the last check/u, { selector: "p" }),
    ).toBeVisible();
    act(() => window.dispatchEvent(new Event("pagehide")));
    expect(
      screen.queryByRole("button", { name: "Sign out" }),
    ).not.toBeInTheDocument();
  });

  it("observes supported network changes without requests and removes its listener on unmount", async () => {
    const connection = new EventTarget();
    const original = Object.getOwnPropertyDescriptor(navigator, "connection");
    Object.defineProperty(navigator, "connection", {
      configurable: true,
      value: connection,
    });
    const remove = vi.spyOn(connection, "removeEventListener");
    let reads = 0;
    try {
      const view = renderEntry(
        sessionHandler("authenticated", () => {
          reads++;
        }),
        http.get("/api/v1/users/me/capabilities", () =>
          HttpResponse.json(capabilityDocument(), {
            headers: { "Content-Type": mediaType },
          }),
        ),
      );
      await screen.findByRole("heading", { name: "Home", level: 1 });
      act(() => connection.dispatchEvent(new Event("change")));
      expect(
        screen.getByRole("heading", { name: "Content hidden" }),
      ).toHaveFocus();
      expect(reads).toBe(1);
      view.unmount();
      expect(remove).toHaveBeenCalledWith("change", expect.any(Function));
    } finally {
      if (original) Object.defineProperty(navigator, "connection", original);
      else Reflect.deleteProperty(navigator, "connection");
    }
  });

  it.each(["transport", "protocol", "http"])(
    "visibly explains and announces %s continuation and recovery failures",
    async (kind) => {
      vi.setSystemTime(new Date("2026-09-27T10:26:00.000Z"));
      let reads = 0;
      let posts = 0;
      const failure = () =>
        kind === "transport"
          ? HttpResponse.error()
          : new HttpResponse("unavailable", {
              status: kind === "http" ? 503 : 200,
              headers: { "Content-Type": mediaType },
            });
      renderEntry(
        sessionHandler("authenticated", () => {
          reads++;
        }),
        http.get("/api/v1/users/me/capabilities", () =>
          HttpResponse.json(capabilityDocument(), {
            headers: { "Content-Type": mediaType },
          }),
        ),
        http.post("/api/v1/auth/session-continuations", () => {
          posts++;
          return failure();
        }),
      );
      document.cookie = `mia_csrf=${crypto.randomUUID()}; Path=/`;
      const user = userEvent.setup();
      await user.click(
        await screen.findByRole("button", { name: "Continue working" }),
      );
      await screen.findByRole("heading", { name: "Content hidden" });
      expect(
        screen.getByText(/cannot confirm whether Continue working succeeded/u, {
          selector: "p",
        }),
      ).toBeVisible();
      await waitFor(() =>
        expect(announcementRegion("polite")).toHaveTextContent(
          "cannot confirm whether Continue working succeeded",
        ),
      );
      expect(announcementRegion("assertive")).toBeEmptyDOMElement();
      server.use(
        http.get("/api/v1/auth/session", () => {
          reads++;
          return failure();
        }),
      );
      await user.click(screen.getByRole("button", { name: "Refresh" }));
      await waitFor(() =>
        expect(announcementRegion("polite")).toHaveTextContent(
          "could not check your sign-in and access",
        ),
      );
      expect(
        screen.getByText(/could not check your sign-in and access/u, {
          selector: "p",
        }),
      ).toBeVisible();
      expect(announcementRegion("polite")).not.toHaveTextContent("unavailable");
      expect({ reads, posts }).toEqual({ reads: 2, posts: 1 });
    },
  );

  it.each(["pagehide", "focus", "online", "visibilitychange"])(
    "synchronously shields on %s and sends no request until Refresh",
    async (event) => {
      let reads = 0;
      let capabilities = 0;
      const cache = createEntryQueryClient();
      renderEntryWithQueryClient(
        cache,
        sessionHandler("authenticated", () => {
          reads++;
        }),
        http.get("/api/v1/users/me/capabilities", () => {
          capabilities++;
          return HttpResponse.json(capabilityDocument(), {
            headers: { "Content-Type": mediaType },
          });
        }),
      );
      await screen.findByRole("heading", { name: "Home", level: 1 });
      cache.setQueryData(["protected-fixture"], { present: true });
      act(() => {
        (event === "visibilitychange" ? document : window).dispatchEvent(
          new Event(event),
        );
        expect(
          screen.queryByRole("heading", { name: "Home", level: 1 }),
        ).not.toBeInTheDocument();
        expect(document.title).toBe("MIA");
        expect(cache.getQueryCache().getAll()).toHaveLength(0);
      });
      expect(
        screen.getByRole("heading", { name: "Content hidden" }),
      ).toHaveFocus();
      expect({ reads, capabilities }).toEqual({ reads: 1, capabilities: 1 });
      await userEvent
        .setup()
        .click(screen.getByRole("button", { name: "Refresh" }));
      await screen.findByRole("heading", { name: "Home", level: 1 });
      expect({ reads, capabilities }).toEqual({ reads: 2, capabilities: 2 });
    },
  );
});

function fingerprint(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

const recoveryAlphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

function recoveryFixture(): string {
  return Array.from(
    randomBytes(16),
    (byte) => recoveryAlphabet[byte % recoveryAlphabet.length],
  ).join("");
}

function mfaCodeFixture(): string {
  return String(randomBytes(4).readUInt32BE() % 1_000_000).padStart(6, "0");
}

function anonymousHandler() {
  return http.get("/api/v1/auth/session", () =>
    HttpResponse.json(
      { data: null, meta: { stage: "anonymous" } },
      { headers: { "Content-Type": mediaType } },
    ),
  );
}

function sessionHandler(
  stage: "authenticated" | "mfa" | "password-change",
  onRequest?: () => void,
  identity: { readonly accountId: string; readonly challengeId: string } = {
    accountId: "account-id",
    challengeId: "challenge-id",
  },
) {
  return http.get("/api/v1/auth/session", () => {
    onRequest?.();
    return HttpResponse.json(
      {
        data: {
          type: "auth-sessions",
          id: identity.accountId,
          attributes: {
            stage,
            ...(stage === "mfa"
              ? { mfa_challenge_id: identity.challengeId }
              : {}),
            idle_expires_at: "2026-09-27T10:30:00.000000Z",
            absolute_expires_at: "2026-09-27T22:00:00.000000Z",
          },
        },
      },
      { headers: { "Content-Type": mediaType } },
    );
  });
}

const capabilityActions = [
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

function capabilityDocument(id = "account-id") {
  return {
    data: {
      type: "account-capabilities",
      id,
      attributes: {
        capabilities: capabilityActions.map((action) => ({
          action,
          available: false,
          scope: {
            global: false,
            course_ids: [],
            student_ids: [],
            course_students: [],
            own_resource: false,
          },
        })),
      },
    },
  };
}

function renderEntry(...handlers: Parameters<typeof server.use>) {
  server.use(...(handlers.length === 0 ? [anonymousHandler()] : handlers));
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

function renderEntryWithQueryClient(
  queryClient: EntryQueryClient,
  ...handlers: Parameters<typeof server.use>
) {
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
          queryClient={queryClient}
        />
      </MiaIntlProvider>
    </AnnouncementProvider>,
  );
}

function announcementRegion(priority: "polite" | "assertive"): HTMLElement {
  const region = Array.from(
    document.querySelectorAll<HTMLElement>("[aria-live]"),
  ).find((candidate) => candidate.getAttribute("aria-live") === priority);
  if (region === undefined) throw new Error(`Missing ${priority} live region.`);
  return region;
}

function deferredVoid() {
  const callbacks: {
    resolve?: () => void;
    reject?: (reason: unknown) => void;
  } = {};
  const promise = new Promise<void>((resolve, reject) => {
    callbacks.resolve = resolve;
    callbacks.reject = reject;
  });
  return {
    promise,
    resolve(): void {
      if (callbacks.resolve === undefined)
        throw new Error("Deferred resolve callback was not initialized.");
      callbacks.resolve();
    },
    reject(reason: unknown): void {
      if (callbacks.reject === undefined)
        throw new Error("Deferred reject callback was not initialized.");
      callbacks.reject(reason);
    },
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  document.documentElement.className = "";
  document.cookie = "mia_csrf=; Max-Age=0; Path=/";
  window.history.replaceState(null, "", "/");
});

describe("localized anonymous entry", () => {
  it.each(["transport", "csrf_invalid"])(
    "keeps credentials and safe focus through %s ambiguity and explicit anonymous recovery",
    async (failure) => {
      const user = userEvent.setup();
      const password = ` ${crypto.randomUUID()} é `;
      const raw = JSON.stringify({
        errors: [
          {
            status: "403",
            code: "csrf_invalid",
            detail: "<img src=x onerror=alert(1)>",
          },
        ],
      });
      let reads = 0;
      let posts = 0;
      renderEntry(
        http.get("/api/v1/auth/session", () => {
          reads++;
          return reads === 2
            ? HttpResponse.error()
            : HttpResponse.json(
                { data: null, meta: { stage: "anonymous" } },
                { headers: { "Content-Type": mediaType } },
              );
        }),
        http.post("/api/v1/auth/login", () => {
          posts++;
          return failure === "transport"
            ? HttpResponse.error()
            : new HttpResponse(raw, {
                status: 403,
                headers: { "Content-Type": mediaType },
              });
        }),
      );
      document.cookie = `mia_csrf=${crypto.randomUUID()}; Path=/`;
      const username = await screen.findByLabelText<HTMLInputElement>(
        "Username (required)",
      );
      const input = screen.getByLabelText<HTMLInputElement>(
        "Password (required)",
      );
      username.focus();
      await user.paste("Example.User");
      input.focus();
      await user.paste(password);
      await user.click(
        screen.getByRole("button", { name: "Sign in", exact: true }),
      );
      const recheck = await screen.findByRole("button", {
        name: "Check sign-in status",
      });
      await waitFor(() => expect(recheck).toHaveFocus());
      expect({
        password: fingerprint(input.value),
        username: fingerprint(username.value),
      }).toEqual({
        password: fingerprint(password),
        username: fingerprint("Example.User"),
      });
      expect(input.readOnly).toBe(true);
      const submit = screen.getByRole("button", {
        name: "Sign in",
        exact: true,
      });
      expect(submit).toHaveAttribute("aria-disabled", "true");
      await user.click(submit);
      expect({ posts, reads }).toEqual({ posts: 1, reads: 2 });
      if (failure === "csrf_invalid") {
        const disclosure = screen.getByRole("button", {
          name: "Technical details",
        });
        expect(disclosure).toHaveAttribute("aria-expanded", "false");
        await user.click(disclosure);
        expect(document.querySelector("pre")?.textContent === raw).toBe(true);
        expect(document.querySelector("img[src=x]") === null).toBe(true);
        expect(screen.getByRole("alert").textContent?.includes(raw)).toBe(
          false,
        );
        await user.click(disclosure);
      }
      await user.click(recheck);
      await waitFor(() => expect(username).toHaveFocus());
      expect({
        password: fingerprint(input.value),
        username: fingerprint(username.value),
      }).toEqual({
        password: fingerprint(password),
        username: fingerprint("Example.User"),
      });
      expect(input.readOnly).toBe(false);
      expect({ posts, reads }).toEqual({ posts: 1, reads: 3 });
    },
  );
  it("restores username focus only when an auto-reconciliation control disappears", async () => {
    const user = userEvent.setup();
    let reads = 0;
    let release = () => {};
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    renderEntry(
      http.get("/api/v1/auth/session", async () => {
        reads++;
        if (reads === 2) await pending;
        return HttpResponse.json(
          { data: null, meta: { stage: "anonymous" } },
          { headers: { "Content-Type": mediaType } },
        );
      }),
      http.post("/api/v1/auth/login", () => HttpResponse.error()),
    );
    document.cookie = `mia_csrf=${crypto.randomUUID()}; Path=/`;
    const username = await screen.findByLabelText("Username (required)");
    await user.type(username, "example");
    await user.type(screen.getByLabelText("Password (required)"), "example");
    await user.click(
      screen.getByRole("button", { name: "Sign in", exact: true }),
    );
    const recheck = await screen.findByRole("button", {
      name: "Check sign-in status",
    });
    recheck.focus();
    expect(recheck).toHaveFocus();

    release();

    await waitFor(() => expect(username).toHaveFocus());
    expect(
      screen.queryByRole("button", { name: "Check sign-in status" }),
    ).not.toBeInTheDocument();
  });
  it("does not steal focus when auto reconciliation removes an unfocused control", async () => {
    const user = userEvent.setup();
    let reads = 0;
    let release = () => {};
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    renderEntry(
      http.get("/api/v1/auth/session", async () => {
        reads++;
        if (reads === 2) await pending;
        return HttpResponse.json(
          { data: null, meta: { stage: "anonymous" } },
          { headers: { "Content-Type": mediaType } },
        );
      }),
      http.post("/api/v1/auth/login", () => HttpResponse.error()),
    );
    document.cookie = `mia_csrf=${crypto.randomUUID()}; Path=/`;
    await user.type(
      await screen.findByLabelText("Username (required)"),
      "example",
    );
    await user.type(screen.getByLabelText("Password (required)"), "example");
    await user.click(
      screen.getByRole("button", { name: "Sign in", exact: true }),
    );
    await screen.findByRole("button", { name: "Check sign-in status" });
    const language = screen.getByLabelText("Language");
    language.focus();

    release();

    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "Check sign-in status" }),
      ).not.toBeInTheDocument(),
    );
    expect(language).toHaveFocus();
  });
  it.each([401, 422, 429, 400])(
    "preserves native input and focus after HTTP %s without replay or raw announcements",
    async (status) => {
      const user = userEvent.setup();
      const password = ` ${crypto.randomUUID()} é `;
      const raw = `<script>${crypto.randomUUID()}</script>\r\n`;
      let posts = 0;
      renderEntry(
        anonymousHandler(),
        http.post("/api/v1/auth/login", () => {
          posts++;
          return new HttpResponse(raw, {
            status,
            headers: { "Retry-After": "60" },
          });
        }),
      );
      document.cookie = `mia_csrf=${crypto.randomUUID()}; Path=/`;
      const username = await screen.findByLabelText("Username (required)");
      const input = screen.getByLabelText<HTMLInputElement>(
        "Password (required)",
      );
      await user.type(username, "Example.User");
      input.focus();
      await user.paste(password);
      input.setSelectionRange(1, 5);
      await user.tab();
      const reveal = screen.getByRole("button", { name: "Show password" });
      await user.keyboard(" ");
      expect(reveal).toHaveFocus();
      expect(reveal).toHaveAttribute("aria-pressed", "true");
      expect(input.selectionStart === 1 && input.selectionEnd === 5).toBe(true);
      expect(input.value === password).toBe(true);
      const submit = screen.getByRole("button", {
        name: "Sign in",
        exact: true,
      });
      await user.click(submit);
      await waitFor(() => expect(posts).toBe(1));
      await screen.findByRole("alert");
      expect(submit).toHaveFocus();
      expect(input.value === password).toBe(true);
      expect((username as HTMLInputElement).value === "Example.User").toBe(
        true,
      );
      expect(screen.getByRole("alert").textContent?.includes(raw)).toBe(false);
      expect(
        screen.getByRole("button", { name: "Technical details" }),
      ).toHaveAttribute("aria-expanded", "false");
      await user.click(
        screen.getByRole("button", { name: "Technical details" }),
      );
      await user.click(
        screen.getByRole("button", { name: "Copy technical details" }),
      );
      expect(posts).toBe(1);
      if (status === 429)
        expect(screen.getByRole("alert")).toHaveTextContent("60 seconds");
      expect(posts).toBe(1);
    },
  );

  it.each(["mfa", "password-change", "authenticated"] as const)(
    "routes validated login to %s without redundant discovery",
    async (stage) => {
      const user = userEvent.setup();
      let reads = 0;
      let capabilities = 0;
      renderEntry(
        http.get("/api/v1/auth/session", () => {
          reads++;
          return HttpResponse.json(
            { data: null, meta: { stage: "anonymous" } },
            { headers: { "Content-Type": mediaType } },
          );
        }),
        http.post("/api/v1/auth/login", () =>
          HttpResponse.json(
            {
              data: {
                type: "auth-sessions",
                id: "account-id",
                attributes: {
                  stage,
                  ...(stage === "mfa"
                    ? { mfa_challenge_id: "challenge-id" }
                    : {}),
                  idle_expires_at: "2026-09-30T10:30:00.000000Z",
                  absolute_expires_at: "2026-09-30T22:00:00.000000Z",
                },
              },
            },
            { headers: { "Content-Type": mediaType } },
          ),
        ),
        http.get("/api/v1/users/me/capabilities", async () => {
          capabilities++;
          await delay(50);
          return HttpResponse.json(capabilityDocument(), {
            headers: { "Content-Type": mediaType },
          });
        }),
      );
      document.cookie = `mia_csrf=${crypto.randomUUID()}; Path=/`;
      await user.type(
        await screen.findByLabelText("Username (required)"),
        "example",
      );
      await user.type(
        screen.getByLabelText("Password (required)"),
        crypto.randomUUID(),
      );
      await user.click(
        screen.getByRole("button", { name: "Sign in", exact: true }),
      );
      if (stage === "authenticated") {
        await screen.findByRole("heading", { name: "Checking access" });
        expect(
          screen.queryByRole("heading", { name: "Home" }),
        ).not.toBeInTheDocument();
      }
      await screen.findByRole("heading", {
        name:
          stage === "mfa"
            ? "Verify sign-in"
            : stage === "password-change"
              ? "Choose a new password"
              : "Home",
      });
      expect(reads).toBe(1);
      expect(capabilities).toBe(stage === "authenticated" ? 1 : 0);
      expect(
        screen.queryByLabelText("Password (required)"),
      ).not.toBeInTheDocument();
      if (stage !== "authenticated") {
        expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
        expect(
          await screen.findByRole("button", { name: "Sign out", exact: true }),
        ).toBeInTheDocument();
      }
    },
  );
  it("renders the accessible entry and public build identifier", async () => {
    renderEntry();

    expect(
      await screen.findByRole("heading", { level: 1, name: "Sign in to MIA" }),
    ).toBeInTheDocument();
    expect(document.title).toBe("Sign in | MIA");
    expect(document.documentElement).toHaveAttribute("lang", "en-US");
    expect(document.documentElement).toHaveAttribute("dir", "ltr");
    expect(screen.getByTestId("build-identifier")).toHaveTextContent(
      /^Build \d+\.\d+\.\d+\+/,
    );
  });

  it("changes locale atomically, announces once, and retains selector focus", async () => {
    const user = userEvent.setup();
    renderEntry();
    const language = await screen.findByLabelText("Language");

    language.focus();
    await user.selectOptions(language, "de-DE");

    expect(language).toHaveFocus();
    expect(document.documentElement).toHaveAttribute("lang", "de-DE");
    expect(document.title).toBe("Anmelden | MIA");
    expect(
      screen.getByRole("heading", { level: 1, name: "Bei MIA anmelden" }),
    ).toBeInTheDocument();
    const announcement = screen.getByText(
      "Die Oberflächensprache wurde geändert.",
    );
    const liveRegion = announcement.closest("[aria-live]");
    expect(liveRegion).toHaveAttribute("aria-live", "polite");
    expect(liveRegion).toHaveAttribute("aria-atomic", "true");
    expect(readStoredLocale()).toBe("de-DE");
  });

  it("applies and persists each text size with an exposed current value", async () => {
    const user = userEvent.setup();
    renderEntry();

    const extraLarge = await screen.findByRole("radio", {
      name: "Extra large",
    });
    await user.click(extraLarge);
    expect(extraLarge).toBeChecked();
    expect(document.documentElement).toHaveClass("text-xl");
    expect(readTextSize()).toBe("extra-large");

    const large = screen.getByRole("radio", { name: "Large" });
    await user.click(large);
    expect(large).toBeChecked();
    expect(document.documentElement).toHaveClass("text-lg");

    const standard = screen.getByRole("radio", { name: "Standard" });
    await user.click(standard);
    expect(standard).toBeChecked();
    expect(document.documentElement).toHaveClass("text-base");
    expect(document.documentElement).not.toHaveClass("text-lg");
    expect(document.documentElement).not.toHaveClass("text-xl");
  });

  it("stays operable when browser preference storage is unavailable", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("storage unavailable");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("storage unavailable");
    });
    const initialLocale = resolveInitialLocale(["fr-CA"]);
    const user = userEvent.setup();

    applyDocumentLocale(initialLocale);
    applyTextSize("standard");
    server.use(anonymousHandler());
    render(
      <AnnouncementProvider>
        <MiaIntlProvider initialLocale={initialLocale}>
          <App
            initialTextSize="standard"
            passwordResetLink={new PasswordResetLink(null)}
            invitationLink={new InvitationLink(null)}
          />
        </MiaIntlProvider>
      </AnnouncementProvider>,
    );

    expect(
      await screen.findByRole("heading", { name: "Se connecter à MIA" }),
    ).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Langue"), "de-DE");
    await user.click(screen.getByRole("radio", { name: "Sehr groß" }));
    expect(document.documentElement).toHaveClass("text-xl");
  });

  it.each([
    ["mfa", "/auth/mfa", "Verify sign-in"],
    ["password-change", "/auth/password-change", "Choose a new password"],
  ] as const)(
    "dispatches the %s stage to its restricted canonical route",
    async (stage, path, heading) => {
      window.history.replaceState(null, "", "/login");
      renderEntry(sessionHandler(stage));

      const routeHeading = await screen.findByRole("heading", {
        name: heading,
      });
      await waitFor(() => expect(routeHeading).toHaveFocus());
      expect(window.location.pathname).toBe(path);
      expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
      expect(screen.queryByText("Home")).not.toBeInTheDocument();
    },
  );

  it("normalizes recovery-code display input before one dispatch and chains to password change", async () => {
    const user = userEvent.setup();
    const wireCode = recoveryFixture();
    const displayed = wireCode.toLowerCase().replace(/(.{4})(?=.)/gu, "$1- ");
    let posts = 0;
    let exactWire = false;
    renderEntry(
      sessionHandler("mfa"),
      http.post(
        "/api/v1/auth/mfa-challenges/challenge-id/recovery-code-consumptions",
        async ({ request }) => {
          posts++;
          exactWire =
            fingerprint(await request.text()) ===
            fingerprint(
              JSON.stringify({
                data: {
                  type: "mfa-recovery-code-consumptions",
                  attributes: { code: wireCode },
                },
              }),
            );
          return HttpResponse.json(
            {
              data: {
                type: "auth-sessions",
                id: "account-id",
                attributes: {
                  stage: "password-change",
                  idle_expires_at: "2026-09-30T10:30:00.000000Z",
                  absolute_expires_at: "2026-09-30T10:30:00.000000Z",
                },
              },
            },
            { headers: { "Content-Type": mediaType } },
          );
        },
      ),
    );
    document.cookie = `mia_csrf=${crypto.randomUUID()}; Path=/`;
    await user.click(
      await screen.findByRole("button", {
        name: "Use a recovery code instead",
      }),
    );
    expect(window.location.pathname).toBe("/auth/mfa/recovery");
    const input = screen.getByLabelText("Recovery code (required)");
    await user.click(input);
    await user.paste(displayed);
    await user.click(screen.getByRole("button", { name: "Use recovery code" }));

    expect(
      await screen.findByRole("heading", { name: "Choose a new password" }),
    ).toBeInTheDocument();
    expect({ exactWire, posts }).toEqual({ exactWire: true, posts: 1 });
  });

  it("rejects malformed recovery input locally without dispatch or alias mapping", async () => {
    const user = userEvent.setup();
    let posts = 0;
    renderEntry(
      sessionHandler("mfa"),
      http.post(
        "/api/v1/auth/mfa-challenges/challenge-id/recovery-code-consumptions",
        () => {
          posts++;
          return HttpResponse.error();
        },
      ),
    );
    await user.click(
      await screen.findByRole("button", {
        name: "Use a recovery code instead",
      }),
    );
    const invalid = `I${recoveryFixture().slice(1)}`;
    const input = screen.getByLabelText<HTMLInputElement>(
      "Recovery code (required)",
    );
    await user.type(input, invalid);
    await user.click(screen.getByRole("button", { name: "Use recovery code" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Enter a valid 16-character recovery code.",
    );
    expect(posts).toBe(0);
    expect(fingerprint(input.value)).toBe(fingerprint(invalid));
    expect(input).toHaveFocus();
  });

  it.each([
    [403, "auth_mfa_step_used", "already used", false],
    [422, "auth_invalid_mfa_code", "was not accepted", false],
    [429, "rate_limited", "temporarily limited", false],
  ] as const)(
    "renders MFA error code %s without replay and applies safe input retention",
    async (status, code, copy) => {
      const user = userEvent.setup();
      const entered = mfaCodeFixture();
      let posts = 0;
      renderEntry(
        sessionHandler("mfa"),
        http.post(
          "/api/v1/auth/mfa-challenges/challenge-id/verifications",
          () => {
            posts++;
            return HttpResponse.json(
              { errors: [{ status: String(status), code }] },
              {
                status,
                headers: { "Content-Type": mediaType, "Retry-After": "29" },
              },
            );
          },
        ),
      );
      document.cookie = `mia_csrf=${crypto.randomUUID()}; Path=/`;
      const input = await screen.findByLabelText<HTMLInputElement>(
        "Six-digit code (required)",
      );
      await user.type(input, entered);
      await user.click(screen.getByRole("button", { name: "Verify code" }));

      expect(await screen.findByRole("alert")).toHaveTextContent(copy);
      expect(posts).toBe(1);
      expect(fingerprint(input.value)).toBe(fingerprint(entered));
      expect(input).toHaveFocus();
      expect(
        screen.getByRole("button", { name: "Technical details" }),
      ).toHaveAttribute("aria-expanded", "false");
      if (status === 429)
        expect(screen.getByRole("alert")).toHaveTextContent("29 seconds");
    },
  );

  it.each([
    [
      "challenge",
      "/auth/mfa",
      "Six-digit code (required)",
      "Verify code",
      "/api/v1/auth/mfa-challenges/challenge-id/verifications",
      () => mfaCodeFixture(),
    ],
    [
      "recovery",
      "/auth/mfa/recovery",
      "Recovery code (required)",
      "Use recovery code",
      "/api/v1/auth/mfa-challenges/challenge-id/recovery-code-consumptions",
      () => recoveryFixture(),
    ],
  ] as const)(
    "moves focus to a terminal restart presentation when the %s challenge expires",
    async (_route, path, label, submit, endpoint, fixture) => {
      const user = userEvent.setup();
      vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
      let posts = 0;
      window.history.replaceState(null, "", path);
      renderEntry(
        sessionHandler("mfa"),
        http.post(endpoint, () => {
          posts++;
          return HttpResponse.json(
            {
              errors: [{ status: "422", code: "auth_mfa_challenge_expired" }],
            },
            { status: 422, headers: { "Content-Type": mediaType } },
          );
        }),
      );
      document.cookie = `mia_csrf=${crypto.randomUUID()}; Path=/`;
      const input = await screen.findByLabelText<HTMLInputElement>(label);
      await user.type(input, fixture());
      await user.click(screen.getByRole("button", { name: submit }));

      const heading = await screen.findByRole("heading", {
        name: "Start sign-in again",
      });
      await waitFor(() => expect(heading).toHaveFocus());
      expect(document.title).toBe("Start sign-in again | MIA");
      expect(
        screen.getByText(/no longer valid/u, { selector: "p" }),
      ).toBeVisible();
      expect(announcementRegion("assertive")).toHaveTextContent(
        "no longer valid",
      );
      expect(input).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: submit })).toBeNull();
      expect(posts).toBe(1);

      await user.tab();
      expect(
        screen.getByRole("button", { name: "Technical details" }),
      ).toHaveFocus();
      await user.tab();
      expect(screen.getByRole("button", { name: "Sign out" })).toHaveFocus();

      await user.click(
        screen.getByRole("button", { name: "Technical details" }),
      );
      await user.click(
        screen.getByRole("button", { name: "Copy technical details" }),
      );
      await waitFor(() =>
        expect(announcementRegion("polite")).toHaveTextContent(
          "Technical details copied.",
        ),
      );
      expect(announcementRegion("assertive")).toBeEmptyDOMElement();
    },
  );

  it("tears down an entered secret when reconciliation discovers a replacement security context", async () => {
    const user = userEvent.setup();
    const firstCode = mfaCodeFixture();
    const replacementCode = mfaCodeFixture();
    let replacement = false;
    let posts = 0;
    let replacementWire = false;
    renderEntry(
      http.get("/api/v1/auth/session", () => {
        const identity = replacement
          ? { accountId: "account-b", challengeId: "challenge-b" }
          : { accountId: "account-a", challengeId: "challenge-a" };
        return HttpResponse.json(
          {
            data: {
              type: "auth-sessions",
              id: identity.accountId,
              attributes: {
                stage: "mfa",
                mfa_challenge_id: identity.challengeId,
                idle_expires_at: "2026-09-27T10:30:00.000000Z",
                absolute_expires_at: "2026-09-27T22:00:00.000000Z",
              },
            },
          },
          { headers: { "Content-Type": mediaType } },
        );
      }),
      http.post("/api/v1/auth/mfa-challenges/challenge-a/verifications", () => {
        posts++;
        replacement = true;
        return HttpResponse.error();
      }),
      http.post(
        "/api/v1/auth/mfa-challenges/challenge-b/verifications",
        async ({ request }) => {
          posts++;
          replacementWire =
            fingerprint(await request.text()) ===
            fingerprint(
              JSON.stringify({
                data: {
                  type: "mfa-verifications",
                  attributes: { code: replacementCode },
                },
              }),
            );
          return HttpResponse.json(
            {
              errors: [{ status: "422", code: "auth_invalid_mfa_code" }],
            },
            { status: 422, headers: { "Content-Type": mediaType } },
          );
        },
      ),
    );
    document.cookie = `mia_csrf=${crypto.randomUUID()}; Path=/`;
    const firstInput = await screen.findByLabelText<HTMLInputElement>(
      "Six-digit code (required)",
    );
    await user.type(firstInput, firstCode);
    await user.click(screen.getByRole("button", { name: "Verify code" }));

    await waitFor(() => expect(firstInput).not.toBeInTheDocument());
    const replacementInput = screen.getByLabelText<HTMLInputElement>(
      "Six-digit code (required)",
    );
    expect(replacementInput).toHaveValue("");
    await user.click(screen.getByRole("button", { name: "Verify code" }));
    expect(posts).toBe(1);

    await user.type(replacementInput, replacementCode);
    await user.keyboard("{Enter}");
    await screen.findByText(/That six-digit code was not accepted\./u);
    expect({ posts, replacementWire }).toEqual({
      posts: 2,
      replacementWire: true,
    });
  });

  it("chains MFA completion through the authenticated capability gate", async () => {
    const user = userEvent.setup();
    let capabilities = 0;
    let posts = 0;
    renderEntry(
      sessionHandler("mfa"),
      http.post(
        "/api/v1/auth/mfa-challenges/challenge-id/verifications",
        () => {
          posts++;
          return HttpResponse.json(
            {
              data: {
                type: "auth-sessions",
                id: "account-id",
                attributes: {
                  stage: "authenticated",
                  idle_expires_at: "2026-09-30T10:30:00.000000Z",
                  absolute_expires_at: "2026-09-30T22:00:00.000000Z",
                },
              },
            },
            { headers: { "Content-Type": mediaType } },
          );
        },
      ),
      http.get("/api/v1/users/me/capabilities", async () => {
        capabilities++;
        await delay(20);
        return HttpResponse.json(capabilityDocument(), {
          headers: { "Content-Type": mediaType },
        });
      }),
    );
    document.cookie = `mia_csrf=${crypto.randomUUID()}; Path=/`;
    await user.type(
      await screen.findByLabelText("Six-digit code (required)"),
      mfaCodeFixture(),
    );
    await user.click(screen.getByRole("button", { name: "Verify code" }));

    expect(
      await screen.findByRole("heading", { name: "Checking access" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Home" })).toBeNull();
    expect(
      await screen.findByRole("heading", { name: "Home" }),
    ).toBeInTheDocument();
    expect({ capabilities, posts }).toEqual({ capabilities: 1, posts: 1 });
  });

  it("keeps the MFA surface method-neutral, isolated, and free of Resend", async () => {
    const user = userEvent.setup();
    renderEntry(sessionHandler("mfa"));
    const challengeInput = await screen.findByLabelText<HTMLInputElement>(
      "Six-digit code (required)",
    );
    expect(challengeInput).toHaveAttribute("autocomplete", "one-time-code");
    await user.type(challengeInput, mfaCodeFixture());
    await user.click(
      screen.getByRole("button", { name: "Use a recovery code instead" }),
    );
    expect(
      screen.getByLabelText<HTMLInputElement>("Recovery code (required)").value,
    ).toBe("");
    expect(challengeInput).not.toBeInTheDocument();
    expect(screen.queryByText(/resend/iu)).toBeNull();
    expect(screen.queryByRole("navigation")).toBeNull();
    expect(screen.queryByText("Home")).toBeNull();
    expect(screen.getAllByRole("textbox")).toHaveLength(1);
  });

  it.each([
    ["anonymous", anonymousHandler(), "Sign in to MIA"],
    ["mfa", sessionHandler("mfa"), "Verify sign-in"],
    [
      "password-change",
      sessionHandler("password-change"),
      "Choose a new password",
    ],
  ] as const)(
    "does not retain %s session or challenge data in React Query",
    async (_stage, handler, heading) => {
      const queryClient = createEntryQueryClient();
      renderEntryWithQueryClient(queryClient, handler);

      expect(
        await screen.findByRole("heading", { name: heading }),
      ).toBeInTheDocument();
      expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
      expect(
        JSON.stringify(
          queryClient
            .getQueryCache()
            .getAll()
            .map((query) => query.state.data),
        ),
      ).not.toContain("challenge-id");
    },
  );

  it("shields the restricted stage, sends one CSRF-protected logout, and confirms anonymously", async () => {
    const user = userEvent.setup();
    let discoveryCount = 0;
    let logoutCount = 0;
    const csrfToken = crypto.randomUUID();
    document.cookie = `mia_csrf=${csrfToken}; Path=/`;
    renderEntry(
      http.get("/api/v1/auth/session", () => {
        discoveryCount += 1;
        return discoveryCount === 1
          ? HttpResponse.json(
              {
                data: {
                  type: "auth-sessions",
                  id: "account-id",
                  attributes: {
                    stage: "mfa",
                    mfa_challenge_id: "challenge-id",
                    idle_expires_at: "2026-09-27T10:30:00.000000Z",
                    absolute_expires_at: "2026-09-27T22:00:00.000000Z",
                  },
                },
              },
              { headers: { "Content-Type": mediaType } },
            )
          : HttpResponse.json(
              { data: null, meta: { stage: "anonymous" } },
              { headers: { "Content-Type": mediaType } },
            );
      }),
      http.post("/api/v1/auth/logout", ({ request }) => {
        logoutCount += 1;
        expect(request.headers.get("X-CSRF-Token") === csrfToken).toBe(true);
        return delay(30).then(() => new HttpResponse(null, { status: 204 }));
      }),
      http.post("/api/v1/auth/mfa-challenges/challenge-id/verifications", () =>
        HttpResponse.json(
          {
            errors: [{ status: "422", code: "auth_mfa_challenge_expired" }],
          },
          { status: 422, headers: { "Content-Type": mediaType } },
        ),
      ),
    );

    await user.type(
      await screen.findByLabelText("Six-digit code (required)"),
      mfaCodeFixture(),
    );
    await user.click(screen.getByRole("button", { name: "Verify code" }));
    await waitFor(() =>
      expect(announcementRegion("assertive")).toHaveTextContent(
        "no longer valid",
      ),
    );

    const logout = await screen.findByRole("button", { name: "Sign out" });
    await user.dblClick(logout);

    expect(
      await screen.findByRole("heading", { name: "Signing out" }),
    ).toBeInTheDocument();
    expect(window.location.pathname).toBe("/auth/logout");
    expect(
      screen.queryByText("Additional verification is required"),
    ).toBeNull();
    expect(
      await screen.findByText(/Signed out at the last check/),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Additional verification is required"),
    ).toBeNull();
    expect(window.location.pathname).toBe("/login");
    expect(announcementRegion("assertive")).toBeEmptyDOMElement();
    await user.selectOptions(screen.getByLabelText("Language"), "de-DE");
    await waitFor(() =>
      expect(announcementRegion("polite")).toHaveTextContent(
        "Die Oberflächensprache wurde geändert.",
      ),
    );
    expect(announcementRegion("assertive")).toBeEmptyDOMElement();
    expect(logoutCount).toBe(1);
    expect(discoveryCount).toBe(2);
  });

  it.each(["success", "failure"] as const)(
    "ignores deferred clipboard %s feedback after MFA teardown",
    async (outcome) => {
      const user = userEvent.setup();
      const clipboard = deferredVoid();
      vi.spyOn(navigator.clipboard, "writeText").mockReturnValue(
        clipboard.promise,
      );
      let signedOut = false;
      document.cookie = `mia_csrf=${crypto.randomUUID()}; Path=/`;
      renderEntry(
        http.get("/api/v1/auth/session", () =>
          signedOut
            ? HttpResponse.json(
                { data: null, meta: { stage: "anonymous" } },
                { headers: { "Content-Type": mediaType } },
              )
            : HttpResponse.json(
                {
                  data: {
                    type: "auth-sessions",
                    id: "account-id",
                    attributes: {
                      stage: "mfa",
                      mfa_challenge_id: "challenge-id",
                      idle_expires_at: "2026-09-27T10:30:00.000000Z",
                      absolute_expires_at: "2026-09-27T22:00:00.000000Z",
                    },
                  },
                },
                { headers: { "Content-Type": mediaType } },
              ),
        ),
        http.post(
          "/api/v1/auth/mfa-challenges/challenge-id/verifications",
          () =>
            HttpResponse.json(
              {
                errors: [{ status: "422", code: "auth_mfa_challenge_expired" }],
              },
              { status: 422, headers: { "Content-Type": mediaType } },
            ),
        ),
        http.post("/api/v1/auth/logout", () => {
          signedOut = true;
          return new HttpResponse(null, { status: 204 });
        }),
      );
      await user.type(
        await screen.findByLabelText("Six-digit code (required)"),
        mfaCodeFixture(),
      );
      await user.click(screen.getByRole("button", { name: "Verify code" }));
      await user.click(
        await screen.findByRole("button", { name: "Technical details" }),
      );
      await user.click(
        screen.getByRole("button", { name: "Copy technical details" }),
      );

      await user.click(screen.getByRole("button", { name: "Sign out" }));
      await screen.findByRole("heading", { name: "Sign in to MIA" });
      await user.selectOptions(screen.getByLabelText("Language"), "de-DE");
      await waitFor(() =>
        expect(announcementRegion("polite")).toHaveTextContent(
          "Die Oberflächensprache wurde geändert.",
        ),
      );

      await act(async () => {
        if (outcome === "success") clipboard.resolve();
        else clipboard.reject(new Error("Clipboard access denied."));
        await clipboard.promise.catch(() => undefined);
      });

      expect(announcementRegion("polite")).toHaveTextContent(
        "Die Oberflächensprache wurde geändert.",
      );
      expect(announcementRegion("assertive")).toBeEmptyDOMElement();
      expect(document.body).not.toHaveTextContent("Technical details copied.");
      expect(document.body).not.toHaveTextContent(
        "Technical details could not be copied.",
      );
    },
  );

  it("does not replay a failed logout and offers an explicit retry", async () => {
    const user = userEvent.setup();
    let logoutCount = 0;
    document.cookie = `mia_csrf=${crypto.randomUUID()}; Path=/`;
    renderEntry(
      sessionHandler("password-change"),
      http.post("/api/v1/auth/logout", () => {
        logoutCount += 1;
        return new HttpResponse("rejected", { status: 500 });
      }),
    );

    await user.click(await screen.findByRole("button", { name: "Sign out" }));

    expect(
      await screen.findByRole("heading", { name: "Sign-out not confirmed" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Retry logout" }),
    ).toBeInTheDocument();
    const disclosure = screen.getByRole("button", {
      name: "Technical details",
    });
    expect(disclosure).toHaveAttribute("aria-expanded", "false");
    await user.click(disclosure);
    expect(screen.getByText("HTTP status: 500")).toBeVisible();
    expect(screen.getByText("rejected")).toBeVisible();
    expect(logoutCount).toBe(1);
  });

  it("reconciles CSRF before one explicitly retried ambiguous logout", async () => {
    const user = userEvent.setup();
    let discoveryCount = 0;
    let logoutCount = 0;
    document.cookie = `mia_csrf=${crypto.randomUUID()}; Path=/`;
    renderEntry(
      http.get("/api/v1/auth/session", () => {
        discoveryCount += 1;
        return discoveryCount <= 2
          ? HttpResponse.json(
              {
                data: {
                  type: "auth-sessions",
                  id: "account-id",
                  attributes: {
                    stage: "password-change",
                    idle_expires_at: "2026-09-27T10:30:00.000000Z",
                    absolute_expires_at: "2026-09-27T22:00:00.000000Z",
                  },
                },
              },
              { headers: { "Content-Type": mediaType } },
            )
          : HttpResponse.json(
              { data: null, meta: { stage: "anonymous" } },
              { headers: { "Content-Type": mediaType } },
            );
      }),
      http.post("/api/v1/auth/logout", () => {
        logoutCount += 1;
        return logoutCount === 1
          ? HttpResponse.error()
          : new HttpResponse(null, { status: 204 });
      }),
    );

    await user.click(await screen.findByRole("button", { name: "Sign out" }));
    expect(
      await screen.findByRole("heading", { name: "Sign-out not confirmed" }),
    ).toBeInTheDocument();
    await delay(20);
    expect(logoutCount).toBe(1);
    expect(discoveryCount).toBe(1);

    await user.click(screen.getByRole("button", { name: "Retry logout" }));

    expect(
      await screen.findByText(/Signed out at the last check/),
    ).toBeInTheDocument();
    expect(logoutCount).toBe(2);
    expect(discoveryCount).toBe(3);
  });

  it("requests capabilities only after authenticated session discovery and then mounts basic Home", async () => {
    const requests: string[] = [];
    renderEntry(
      sessionHandler("authenticated", () =>
        requests.push("/api/v1/auth/session"),
      ),
      http.get("/api/v1/users/me/capabilities", async () => {
        requests.push("/api/v1/users/me/capabilities");
        await delay(20);
        return HttpResponse.json(capabilityDocument(), {
          headers: { "Content-Type": mediaType },
        });
      }),
    );

    expect(
      await screen.findByRole("heading", { name: "Checking access" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Home" }),
    ).not.toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Home" })).toHaveFocus();
    expect(window.location.pathname).toBe("/");
    expect(requests).toEqual([
      "/api/v1/auth/session",
      "/api/v1/users/me/capabilities",
    ]);
  });

  it("keeps protected content suppressed and shows an honest capability error", async () => {
    const user = userEvent.setup();
    renderEntry(
      sessionHandler("authenticated"),
      http.get(
        "/api/v1/users/me/capabilities",
        () =>
          new HttpResponse("service unavailable", {
            headers: { "Content-Type": mediaType },
            status: 500,
          }),
      ),
    );

    expect(
      await screen.findByRole("heading", { name: "Unable to check access" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Home" }),
    ).not.toBeInTheDocument();
    const disclosure = screen.getByRole("button", {
      name: "Technical details",
    });
    expect(disclosure).toHaveAttribute("aria-expanded", "false");
    await user.click(disclosure);
    expect(screen.getByText("HTTP status: 500")).toBeVisible();
    expect(screen.getByText("service unavailable")).toBeVisible();
  });

  it("rejects capabilities returned for a different account identity", async () => {
    renderEntry(
      sessionHandler("authenticated"),
      http.get("/api/v1/users/me/capabilities", () =>
        HttpResponse.json(capabilityDocument("different-account"), {
          headers: { "Content-Type": mediaType },
        }),
      ),
    );

    expect(
      await screen.findByRole("heading", { name: "Unable to check access" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Home" })).toBeNull();
    expect(screen.queryByText("Technical details")).toBeNull();
  });

  it.each([401, 403] as const)(
    "keeps protected content suppressed for capability HTTP %s",
    async (status) => {
      renderEntry(
        sessionHandler("authenticated"),
        http.get(
          "/api/v1/users/me/capabilities",
          () =>
            new HttpResponse("access check rejected", {
              headers: { "Content-Type": mediaType },
              status,
            }),
        ),
      );

      expect(
        await screen.findByRole("heading", { name: "Unable to check access" }),
      ).toBeInTheDocument();
      expect(screen.queryByRole("heading", { name: "Home" })).toBeNull();
    },
  );

  it("copies only the untouched response body and announces the result", async () => {
    const user = userEvent.setup();
    let copiedText = "";
    const writeText = vi
      .spyOn(navigator.clipboard, "writeText")
      .mockImplementation((text) => {
        copiedText = text;
        return Promise.resolve();
      });
    const body = ["line one", "<script>inert</script>"].join("\r\n");
    renderEntry(
      sessionHandler("authenticated"),
      http.get(
        "/api/v1/users/me/capabilities",
        () =>
          new HttpResponse(body, {
            headers: { "Content-Type": mediaType },
            status: 500,
          }),
      ),
    );

    await user.click(
      await screen.findByRole("button", { name: "Technical details" }),
    );
    const copyButton = screen.getByRole("button", {
      name: "Copy technical details",
    });
    await user.click(copyButton);

    expect(writeText).toHaveBeenCalledTimes(1);
    expect(copiedText === body).toBe(true);
    expect(copyButton).toHaveFocus();
    expect(screen.getByText("Technical details copied.")).toBeInTheDocument();
  });

  it("keeps manual selection available when clipboard access is denied", async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(
      new Error("clipboard denied"),
    );
    renderEntry(
      sessionHandler("authenticated"),
      http.get(
        "/api/v1/users/me/capabilities",
        () => new HttpResponse("manual response text", { status: 500 }),
      ),
    );

    await user.click(
      await screen.findByRole("button", { name: "Technical details" }),
    );
    const copyButton = screen.getByRole("button", {
      name: "Copy technical details",
    });
    await user.click(copyButton);

    expect(copyButton).toHaveFocus();
    expect(
      screen.getByText(
        "Copying is unavailable. Select and copy the response text manually.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Technical details could not be copied."),
    ).toBeInTheDocument();
  });
});

describe("required password replacement", () => {
  function authenticatedResponse() {
    return HttpResponse.json(
      {
        data: {
          type: "auth-sessions",
          id: "account-id",
          attributes: {
            stage: "authenticated",
            idle_expires_at: "2026-10-01T10:30:00.000000Z",
            absolute_expires_at: "2026-10-01T22:00:00.000000Z",
          },
        },
      },
      { headers: { "Content-Type": mediaType } },
    );
  }

  async function fillReplacement(
    user: ReturnType<typeof userEvent.setup>,
    password: string,
    confirmation = password,
  ) {
    const newPassword = await screen.findByLabelText<HTMLInputElement>(
      "New password (required)",
    );
    const confirm = screen.getByLabelText<HTMLInputElement>(
      "Confirm new password (required)",
    );
    newPassword.focus();
    await user.paste(password);
    confirm.focus();
    await user.paste(confirmation);
    return { newPassword, confirm };
  }

  function saveButton() {
    return screen.getByRole("button", { name: "Save new password" });
  }

  it("renders only the focused replacement form with new-password purposes and rules before entry", async () => {
    let capabilities = 0;
    renderEntry(
      sessionHandler("password-change"),
      http.get("/api/v1/users/me/capabilities", () => {
        capabilities++;
        return HttpResponse.json(capabilityDocument(), {
          headers: { "Content-Type": mediaType },
        });
      }),
    );

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Choose a new password",
      }),
    ).toBeInTheDocument();
    expect(document.title).toBe("Choose a new password | MIA");
    const newPassword = await screen.findByLabelText("New password (required)");
    const confirm = screen.getByLabelText("Confirm new password (required)");
    for (const input of [newPassword, confirm]) {
      expect(input).toHaveAttribute("type", "password");
      expect(input).toHaveAttribute("autocomplete", "new-password");
      expect(input).not.toHaveAttribute("aria-invalid", "true");
    }
    expect(newPassword).toHaveAccessibleDescription(
      /12 to 128 characters and at most 512 bytes.*not trimmed or normalized.*Very common passwords/u,
    );
    expect(screen.queryByLabelText(/current password/iu)).toBeNull();
    expect(screen.queryByRole("navigation")).toBeNull();
    expect(screen.queryByText("Home")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Sign out" }),
    ).toBeInTheDocument();
    expect(capabilities).toBe(0);
  });

  it("submits exact pasted bytes once and reaches Home only through the capability gate", async () => {
    const user = userEvent.setup();
    const password = ` ${crypto.randomUUID()} é `;
    let reads = 0;
    let posts = 0;
    let capabilities = 0;
    let bodyFingerprint = "";
    renderEntry(
      sessionHandler("password-change", () => {
        reads++;
      }),
      http.post("/api/v1/auth/password-changes", async ({ request }) => {
        posts++;
        bodyFingerprint = fingerprint(await request.text());
        return authenticatedResponse();
      }),
      http.get("/api/v1/users/me/capabilities", async () => {
        capabilities++;
        await delay(20);
        return HttpResponse.json(capabilityDocument(), {
          headers: { "Content-Type": mediaType },
        });
      }),
    );
    document.cookie = `mia_csrf=${crypto.randomUUID()}; Path=/`;
    await fillReplacement(user, password);

    await user.click(saveButton());

    expect(
      await screen.findByRole("heading", { name: "Checking access" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Home" })).toBeNull();
    expect(
      await screen.findByRole("heading", { name: "Home" }),
    ).toBeInTheDocument();
    expect(bodyFingerprint).toBe(
      fingerprint(
        JSON.stringify({
          data: {
            type: "password-changes",
            attributes: { password, password_confirmation: password },
          },
        }),
      ),
    );
    expect({ reads, posts, capabilities }).toEqual({
      reads: 1,
      posts: 1,
      capabilities: 1,
    });
    expect(screen.queryByLabelText("New password (required)")).toBeNull();
  });

  it.each([
    ["too short", "a".repeat(11), "a".repeat(11), "new", "is too short"],
    ["too long", "a".repeat(129), "a".repeat(129), "new", "is too long"],
    [
      "mismatched",
      "a".repeat(12),
      `${"a".repeat(12)} `,
      "confirm",
      "does not match",
    ],
  ] as const)(
    "names a %s single-field rule, focuses that field, and sends nothing",
    async (_label, password, confirmation, field, copy) => {
      const user = userEvent.setup();
      let posts = 0;
      renderEntry(
        sessionHandler("password-change"),
        http.post("/api/v1/auth/password-changes", () => {
          posts++;
          return authenticatedResponse();
        }),
      );
      document.cookie = `mia_csrf=${crypto.randomUUID()}; Path=/`;
      const { newPassword, confirm } = await fillReplacement(
        user,
        password,
        confirmation,
      );

      await user.click(saveButton());

      const invalid = field === "new" ? newPassword : confirm;
      const valid = field === "new" ? confirm : newPassword;
      await waitFor(() => expect(invalid).toHaveFocus());
      expect(invalid).toHaveAttribute("aria-invalid", "true");
      expect(invalid).toHaveAccessibleDescription(new RegExp(copy, "u"));
      expect(valid).toHaveAttribute("aria-invalid", "false");
      expect(screen.queryByRole("heading", { level: 2 })).toBeNull();
      expect(newPassword.value === password).toBe(true);
      expect(confirm.value === confirmation).toBe(true);
      expect(posts).toBe(0);
    },
  );

  it("summarizes multiple failed rules, links to each control, and clears stale errors on a corrected submit", async () => {
    const user = userEvent.setup();
    let posts = 0;
    renderEntry(
      sessionHandler("password-change"),
      http.post("/api/v1/auth/password-changes", () => {
        posts++;
        return authenticatedResponse();
      }),
      http.get("/api/v1/users/me/capabilities", () =>
        HttpResponse.json(capabilityDocument(), {
          headers: { "Content-Type": mediaType },
        }),
      ),
    );
    document.cookie = `mia_csrf=${crypto.randomUUID()}; Path=/`;
    const { newPassword, confirm } = await fillReplacement(
      user,
      "short",
      "other",
    );

    await user.click(saveButton());

    const heading = await screen.findByRole("heading", {
      level: 2,
      name: "Correct these problems before saving your new password:",
    });
    const summary = heading.closest<HTMLElement>("[tabindex='-1']");
    if (summary === null) throw new Error("Missing focusable error summary.");
    await waitFor(() => expect(summary).toHaveFocus());
    expect(newPassword).toHaveAttribute("aria-invalid", "true");
    expect(confirm).toHaveAttribute("aria-invalid", "true");
    const links = within(summary).getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual([
      "The new password is too short. Use at least 12 characters.",
      "The confirmation does not match the new password. Enter exactly the same password in both fields.",
    ]);
    const confirmationLink = links[1];
    if (confirmationLink === undefined)
      throw new Error("Missing confirmation summary link.");
    await user.click(confirmationLink);
    expect(confirm).toHaveFocus();
    expect(window.location.hash === "").toBe(true);
    expect(posts).toBe(0);

    const corrected = crypto.randomUUID();
    await user.clear(newPassword);
    await user.clear(confirm);
    await fillReplacement(user, corrected);
    await user.click(saveButton());

    expect(
      await screen.findByRole("heading", { name: "Home" }),
    ).toBeInTheDocument();
    expect(posts).toBe(1);
  });

  it.each([
    [422, "auth_invalid_password", "That password was not accepted"],
    [429, "rate_limited", "temporarily limited"],
    [400, "malformed_request", "could not save the new password"],
  ] as const)(
    "preserves moved focus, values, and the form when delayed HTTP %s completes",
    async (status, code, copy) => {
      const user = userEvent.setup();
      const password = ` ${crypto.randomUUID()} é `;
      const raw = JSON.stringify({
        errors: [
          { status: String(status), code, detail: "<img src=x onerror=1>" },
        ],
      });
      const response = deferredVoid();
      let posts = 0;
      renderEntry(
        sessionHandler("password-change"),
        http.post("/api/v1/auth/password-changes", async () => {
          posts++;
          await response.promise;
          return new HttpResponse(raw, {
            status,
            headers: { "Content-Type": mediaType, "Retry-After": "42" },
          });
        }),
      );
      document.cookie = `mia_csrf=${crypto.randomUUID()}; Path=/`;
      const { newPassword, confirm } = await fillReplacement(user, password);

      await user.click(saveButton());
      await waitFor(() => expect(posts).toBe(1));
      expect(announcementRegion("polite")).toHaveTextContent(
        "Saving new password…",
      );
      const signOut = screen.getByRole("button", { name: "Sign out" });
      // Keyboard navigation continues while the response is pending.
      signOut.focus();
      response.resolve();

      await waitFor(() =>
        expect(announcementRegion("assertive")).toHaveTextContent(copy),
      );
      expect(signOut).toHaveFocus();
      expect(
        document.getElementById("password-change-status"),
      ).toHaveTextContent(copy);
      expect(screen.queryByRole("alert")).toBeNull();
      expect(screen.queryByRole("status")).toBeNull();
      expect(announcementRegion("assertive").textContent?.includes(raw)).toBe(
        false,
      );
      expect(newPassword.value === password).toBe(true);
      expect(confirm.value === password).toBe(true);
      expect(newPassword).toHaveAttribute(
        "aria-invalid",
        status === 422 ? "true" : "false",
      );
      if (status === 429)
        expect(announcementRegion("assertive")).toHaveTextContent("42 seconds");
      else
        expect(announcementRegion("assertive")).not.toHaveTextContent(
          "42 seconds",
        );
      expect(
        screen.getByRole("button", { name: "Technical details" }),
      ).toHaveAttribute("aria-expanded", "false");
      expect(document.querySelector("img")).toBeNull();
      expect(posts).toBe(1);
    },
  );

  it("rediscovers the stage after auth_password_change_required and returns anonymous users to sign-in", async () => {
    const user = userEvent.setup();
    let reads = 0;
    let posts = 0;
    renderEntry(
      http.get("/api/v1/auth/session", () => {
        reads++;
        return reads === 1
          ? HttpResponse.json(
              {
                data: {
                  type: "auth-sessions",
                  id: "account-id",
                  attributes: {
                    stage: "password-change",
                    idle_expires_at: "2026-10-01T10:30:00.000000Z",
                    absolute_expires_at: "2026-10-01T10:30:00.000000Z",
                  },
                },
              },
              { headers: { "Content-Type": mediaType } },
            )
          : HttpResponse.json(
              { data: null, meta: { stage: "anonymous" } },
              { headers: { "Content-Type": mediaType } },
            );
      }),
      http.post("/api/v1/auth/password-changes", () => {
        posts++;
        return HttpResponse.json(
          {
            errors: [{ status: "403", code: "auth_password_change_required" }],
          },
          { status: 403, headers: { "Content-Type": mediaType } },
        );
      }),
    );
    document.cookie = `mia_csrf=${crypto.randomUUID()}; Path=/`;
    await fillReplacement(user, crypto.randomUUID());

    await user.click(saveButton());

    expect(
      await screen.findByRole("heading", { name: "Sign in to MIA" }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("New password (required)")).toBeNull();
    expect({ reads, posts }).toEqual({ reads: 2, posts: 1 });
  });

  it("shows outcome unknown without moving focus, keeps an explicit recheck focused, and never resends", async () => {
    const user = userEvent.setup();
    const password = crypto.randomUUID();
    const recovery = deferredVoid();
    let reads = 0;
    let posts = 0;
    renderEntry(
      http.get("/api/v1/auth/session", async () => {
        reads++;
        if (reads === 2) return HttpResponse.error();
        if (reads === 3) await recovery.promise;
        return HttpResponse.json(
          {
            data: {
              type: "auth-sessions",
              id: "account-id",
              attributes: {
                stage: "password-change",
                idle_expires_at: "2026-10-01T10:30:00.000000Z",
                absolute_expires_at: "2026-10-01T10:30:00.000000Z",
              },
            },
          },
          { headers: { "Content-Type": mediaType } },
        );
      }),
      http.post("/api/v1/auth/password-changes", () => {
        posts++;
        return new HttpResponse("upstream", { status: 502 });
      }),
    );
    document.cookie = `mia_csrf=${crypto.randomUUID()}; Path=/`;
    const { newPassword } = await fillReplacement(user, password);

    await user.click(saveButton());

    await waitFor(() =>
      expect(announcementRegion("assertive")).toHaveTextContent(
        "The outcome is unknown and status could not be checked.",
      ),
    );
    const recheck = screen.getByRole("button", {
      name: "Check sign-in status",
    });
    expect(saveButton()).toHaveFocus();
    expect(saveButton()).toHaveAttribute("aria-disabled", "true");
    expect(newPassword).toHaveAttribute("readonly");
    await user.click(saveButton());
    expect(posts).toBe(1);

    await user.click(recheck);
    expect(recheck).toHaveFocus();
    expect(recheck).toHaveAttribute("aria-disabled", "true");
    expect(announcementRegion("polite")).toHaveTextContent(
      "The outcome is unknown. Checking current sign-in status…",
    );
    recovery.resolve();

    await waitFor(() =>
      expect(announcementRegion("assertive")).toHaveTextContent(
        "The outcome was not confirmed. This browser still requires a new password.",
      ),
    );
    expect(
      screen.queryByRole("button", { name: "Check sign-in status" }),
    ).toBeNull();
    expect(newPassword).toHaveFocus();
    expect(newPassword.value === password).toBe(true);
    expect({ reads, posts }).toEqual({ reads: 3, posts: 1 });
  });

  it("announces each invalid submission assertively through the shared owner", async () => {
    const user = userEvent.setup();
    let posts = 0;
    renderEntry(
      sessionHandler("password-change"),
      http.post("/api/v1/auth/password-changes", () => {
        posts++;
        return authenticatedResponse();
      }),
    );
    document.cookie = `mia_csrf=${crypto.randomUUID()}; Path=/`;
    await fillReplacement(user, "short", "other");

    await user.click(saveButton());
    await waitFor(() =>
      expect(announcementRegion("assertive")).toHaveTextContent(
        "Correct these problems before saving your new password: The new password is too short. Use at least 12 characters. The confirmation does not match the new password. Enter exactly the same password in both fields.",
      ),
    );
    const firstNode = announcementRegion("assertive").firstElementChild;
    expect(announcementRegion("polite")).toBeEmptyDOMElement();

    await user.click(saveButton());
    await waitFor(() =>
      expect(announcementRegion("assertive").firstElementChild).not.toBe(
        firstNode,
      ),
    );
    expect(announcementRegion("assertive")).toHaveTextContent(
      "Correct these problems before saving your new password:",
    );
    expect(document.querySelectorAll("main [aria-live]")).toHaveLength(0);
    // The entered confirmation never reaches the announcement.
    expect(announcementRegion("assertive").textContent?.includes("other")).toBe(
      false,
    );

    const confirm = screen.getByLabelText<HTMLInputElement>(
      "Confirm new password (required)",
    );
    await user.clear(confirm);
    confirm.focus();
    await user.paste("short");
    await user.click(saveButton());
    await waitFor(() =>
      expect(announcementRegion("assertive")).toHaveTextContent(
        /^The new password is too short\. Use at least 12 characters\.$/u,
      ),
    );
    expect(posts).toBe(0);
  });

  it("lets copy feedback replace an outcome and retires the form's announcement on logout", async () => {
    const user = userEvent.setup();
    let posts = 0;
    renderEntry(
      sessionHandler("password-change"),
      http.post("/api/v1/auth/password-changes", () => {
        posts++;
        return HttpResponse.json(
          { errors: [{ status: "422", code: "auth_invalid_password" }] },
          { status: 422, headers: { "Content-Type": mediaType } },
        );
      }),
      http.post("/api/v1/auth/logout", async () => {
        await delay(50);
        return new HttpResponse(null, { status: 204 });
      }),
    );
    document.cookie = `mia_csrf=${crypto.randomUUID()}; Path=/`;
    await fillReplacement(user, crypto.randomUUID());
    await user.click(saveButton());
    await waitFor(() =>
      expect(announcementRegion("assertive")).toHaveTextContent(
        "That password was not accepted.",
      ),
    );

    await user.click(screen.getByRole("button", { name: "Technical details" }));
    await user.click(
      screen.getByRole("button", { name: "Copy technical details" }),
    );
    await waitFor(() =>
      expect(announcementRegion("polite")).toHaveTextContent(
        /Technical details (copied|could not be copied)\./u,
      ),
    );
    expect(announcementRegion("assertive")).toBeEmptyDOMElement();

    await user.click(saveButton());
    await waitFor(() =>
      expect(announcementRegion("assertive")).toHaveTextContent(
        "That password was not accepted.",
      ),
    );
    await user.click(screen.getByRole("button", { name: "Sign out" }));
    await screen.findByRole("heading", { level: 1, name: "Signing out" });
    expect(announcementRegion("assertive")).not.toHaveTextContent(
      "That password was not accepted.",
    );
    expect(posts).toBe(2);
  });

  it("lets a same-turn authentication-loss announcement win arbitration over form validation", async () => {
    const user = userEvent.setup();
    function AuthLossOnSubmit() {
      const { announce } = useAnnouncer();
      useEffect(() => {
        const listener = () => announce("Sign-in expired.", "auth");
        document.addEventListener("submit", listener, true);
        return () => document.removeEventListener("submit", listener, true);
      }, [announce]);
      return null;
    }
    server.use(sessionHandler("password-change"));
    applyDocumentLocale("en-US");
    applyTextSize("standard");
    render(
      <AnnouncementProvider>
        <AuthLossOnSubmit />
        <MiaIntlProvider initialLocale="en-US">
          <App
            initialTextSize="standard"
            passwordResetLink={new PasswordResetLink(null)}
            invitationLink={new InvitationLink(null)}
          />
        </MiaIntlProvider>
      </AnnouncementProvider>,
    );
    await fillReplacement(user, "short", "short");

    await user.click(saveButton());

    await waitFor(() =>
      expect(announcementRegion("assertive")).toHaveTextContent(
        "Sign-in expired.",
      ),
    );
    expect(announcementRegion("assertive")).not.toHaveTextContent("too short");
    expect(screen.getByLabelText("New password (required)")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  it("reveals each password with an object-specific pressed toggle that keeps value and selection", async () => {
    const user = userEvent.setup();
    renderEntry(sessionHandler("password-change"));
    const password = ` ${crypto.randomUUID()} é `;
    const { newPassword, confirm } = await fillReplacement(user, password);
    newPassword.focus();
    newPassword.setSelectionRange(2, 6);
    await user.tab();
    const reveal = screen.getByRole("button", { name: "Show new password" });
    expect(reveal).toHaveFocus();
    await user.keyboard(" ");

    expect(reveal).toHaveAttribute("aria-pressed", "true");
    expect(reveal).toHaveAccessibleName("Hide new password");
    expect(newPassword).toHaveAttribute("type", "text");
    expect(confirm).toHaveAttribute("type", "password");
    expect(newPassword.value === password).toBe(true);
    expect(
      newPassword.selectionStart === 2 && newPassword.selectionEnd === 6,
    ).toBe(true);
    const confirmationReveal = screen.getByRole("button", {
      name: "Show password confirmation",
    });
    await user.click(confirmationReveal);
    expect(confirm).toHaveAttribute("type", "text");
    expect(confirmationReveal).toHaveAttribute("aria-pressed", "true");
  });
});

describe("password recovery and token reset", () => {
  function renderAt(
    path: string,
    ...handlers: Parameters<typeof server.use>
  ): ReturnType<typeof render> {
    window.history.replaceState(null, "", path);
    // The production bootstrap order: capture before anything renders.
    const passwordResetLink = capturePasswordResetLink(
      window.location,
      window.history,
    );
    const invitationLink = captureInvitationLink(
      window.location,
      window.history,
    );
    server.use(...handlers);
    applyDocumentLocale("en-US");
    applyTextSize("standard");
    return render(
      <AnnouncementProvider>
        <MiaIntlProvider initialLocale="en-US">
          <App
            initialTextSize="standard"
            passwordResetLink={passwordResetLink}
            invitationLink={invitationLink}
          />
        </MiaIntlProvider>
      </AnnouncementProvider>,
    );
  }

  function noContent() {
    return new HttpResponse(null, { status: 204 });
  }

  function errorResponse(status: number, code: string, retryAfter?: string) {
    return HttpResponse.json(
      { errors: [{ status: String(status), code }] },
      {
        status,
        headers: {
          "Content-Type": mediaType,
          ...(retryAfter === undefined ? {} : { "Retry-After": retryAfter }),
        },
      },
    );
  }

  async function fillPasswords(
    user: ReturnType<typeof userEvent.setup>,
    password: string,
  ): Promise<void> {
    await user.type(
      await screen.findByLabelText("New password (required)"),
      password,
    );
    await user.type(
      screen.getByLabelText("Confirm new password (required)"),
      password,
    );
  }

  function resetInputs() {
    return [
      screen.getByLabelText<HTMLInputElement>("New password (required)"),
      screen.getByLabelText<HTMLInputElement>(
        "Confirm new password (required)",
      ),
    ];
  }

  it("links sign-in to recovery and shows only the uniform accepted result", async () => {
    const user = userEvent.setup();
    let posts = 0;
    let exactWire = false;
    document.cookie = `mia_csrf=${crypto.randomUUID()}; Path=/`;
    renderAt(
      "/login",
      anonymousHandler(),
      http.post(
        "/api/v1/auth/password-recovery-requests",
        async ({ request }) => {
          posts++;
          exactWire =
            (await request.text()) ===
            JSON.stringify({
              data: {
                type: "password-recovery-requests",
                attributes: { username: "Example.Staff" },
              },
            });
          return noContent();
        },
      ),
    );

    await user.click(
      await screen.findByRole("link", { name: "Forgot your password?" }),
    );
    expect(
      await screen.findByRole("heading", { level: 1, name: "Recover access" }),
    ).toHaveFocus();
    expect(document.title).toBe("Recover access | MIA");
    expect(window.location.pathname).toBe("/login/recovery");
    expect(screen.queryByRole("navigation")).toBeNull();
    await user.type(
      screen.getByLabelText("Username (required)"),
      "Example.Staff",
    );
    await user.click(screen.getByRole("button", { name: "Send reset link" }));

    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: "Check your email",
      }),
    ).toHaveFocus();
    expect(
      within(screen.getByRole("main")).getByText(
        /^If an eligible account exists, we've sent an email/u,
      ),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(announcementRegion("polite")).toHaveTextContent(
        /^If an eligible account exists/u,
      ),
    );
    expect(screen.queryByLabelText("Username (required)")).toBeNull();
    expect({ posts, exactWire }).toEqual({ posts: 1, exactWire: true });
    await user.click(screen.getByRole("link", { name: "Back to sign-in" }));
    expect(
      await screen.findByRole("heading", { level: 1, name: "Sign in to MIA" }),
    ).toBeInTheDocument();
  });

  it.each([
    [500, "controlled", "We couldn't confirm your request.", "Send again"],
    [
      422,
      "auth_invalid_request",
      "Your request couldn't be processed.",
      "Send reset link",
    ],
    [
      400,
      "malformed_request",
      "Your request couldn't be processed.",
      "Send reset link",
    ],
    [
      406,
      "not_acceptable",
      "Your request couldn't be processed.",
      "Send reset link",
    ],
    [
      413,
      "request_too_large",
      "Your request couldn't be processed.",
      "Send reset link",
    ],
    [
      415,
      "unsupported_media_type",
      "Your request couldn't be processed.",
      "Send reset link",
    ],
    [
      403,
      "csrf_invalid",
      "The security check for this page expired.",
      "Send reset link",
    ],
  ] as const)(
    "keeps the username after HTTP %s %s and sends again only on a click",
    async (status, code, copy, action) => {
      const user = userEvent.setup();
      let posts = 0;
      let reads = 0;
      document.cookie = `mia_csrf=${crypto.randomUUID()}; Path=/`;
      renderAt(
        "/login/recovery",
        http.get("/api/v1/auth/session", () => {
          reads++;
          return HttpResponse.json(
            { data: null, meta: { stage: "anonymous" } },
            { headers: { "Content-Type": mediaType } },
          );
        }),
        http.post("/api/v1/auth/password-recovery-requests", () => {
          posts++;
          return errorResponse(status, code);
        }),
      );
      const username = await screen.findByLabelText<HTMLInputElement>(
        "Username (required)",
      );
      await user.type(username, "Example.Staff");
      await user.click(screen.getByRole("button", { name: "Send reset link" }));

      await waitFor(() =>
        expect(announcementRegion("assertive")).toHaveTextContent(copy),
      );
      expect(username.value).toBe("Example.Staff");
      expect(screen.getByRole("button", { name: action })).toHaveFocus();
      await delay(50);
      expect(posts).toBe(1);
      expect(reads).toBe(code === "csrf_invalid" ? 2 : 1);
      await user.click(screen.getByRole("button", { name: action }));
      await waitFor(() => expect(posts).toBe(2));
    },
  );

  it("captures the token before render, resets once, and keeps a focused success", async () => {
    const user = userEvent.setup();
    const token = crypto.randomUUID();
    const password = ` ${crypto.randomUUID()} `;
    let posts = 0;
    let exactWire = false;
    document.cookie = `mia_csrf=${crypto.randomUUID()}; Path=/`;
    renderAt(
      `/password-reset#token=${token}`,
      anonymousHandler(),
      http.post("/api/v1/auth/password-resets", async ({ request }) => {
        posts++;
        exactWire =
          fingerprint(await request.text()) ===
          fingerprint(
            JSON.stringify({
              data: {
                type: "password-resets",
                attributes: {
                  token,
                  password,
                  password_confirmation: password,
                },
              },
            }),
          );
        return noContent();
      }),
    );
    expect(window.location.hash).toBe("");

    await fillPasswords(user, password);
    expect(document.title).toBe("Reset password | MIA");
    await user.click(screen.getByRole("button", { name: "Change password" }));

    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: "Your password has been changed.",
      }),
    ).toHaveFocus();
    expect(
      screen.getByText(
        "If you use multi-factor authentication, it remains enabled.",
      ),
    ).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(/signed out everywhere/iu);
    await waitFor(() =>
      expect(announcementRegion("polite")).toHaveTextContent(
        /^Your password has been changed\./u,
      ),
    );
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/login",
    );
    expect(screen.queryByLabelText("New password (required)")).toBeNull();
    await delay(50);
    expect(window.location.pathname).toBe("/password-reset");
    expect({ posts, exactWire }).toEqual({ posts: 1, exactWire: true });
    const exposed = JSON.stringify({
      href: window.location.href,
      history: window.history.state as unknown,
      title: document.title,
      body: new XMLSerializer().serializeToString(document.body),
    });
    expect(exposed.includes(token)).toBe(false);
  });

  it("offers a direct sign-in exit from the usable reset form and drops its token", async () => {
    const user = userEvent.setup();
    renderAt(
      `/password-reset#token=${crypto.randomUUID()}`,
      anonymousHandler(),
    );

    await user.click(await screen.findByRole("link", { name: "Go back" }));

    expect(window.location.pathname).toBe("/login");
    expect(screen.queryByLabelText("New password (required)")).toBeNull();
  });

  // Every 422 auth_invalid_reset_token cause (invalid, expired, consumed,
  // throttled) and a missing token share one presentation, focus target,
  // announcement, and waiting treatment.
  it("renders every unusable cause exactly like a missing token", async () => {
    const user = userEvent.setup();
    const unusableHeading = "This link is invalid or no longer usable";
    async function observeResult() {
      const heading = await screen.findByRole("heading", {
        level: 1,
        name: unusableHeading,
      });
      await waitFor(() => expect(heading).toHaveFocus());
      await waitFor(() =>
        expect(announcementRegion("assertive")).toHaveTextContent(
          `${unusableHeading} Request a new password-reset link, or go back to sign-in.`,
        ),
      );
      return {
        main: new XMLSerializer().serializeToString(screen.getByRole("main")),
        title: document.title,
        path: window.location.pathname,
        hash: window.location.hash,
        focused: document.activeElement?.textContent ?? null,
        polite: announcementRegion("polite").textContent,
        assertive: announcementRegion("assertive").textContent,
      };
    }

    const results = [];
    for (const detail of ["invalid", "expired", "consumed", "throttled"]) {
      document.cookie = `mia_csrf=${crypto.randomUUID()}; Path=/`;
      const waiting: string[] = [];
      const view = renderAt(
        `/password-reset#token=${crypto.randomUUID()}`,
        anonymousHandler(),
        http.post("/api/v1/auth/password-resets", async () => {
          await delay(20);
          return HttpResponse.json(
            {
              errors: [
                { status: "422", code: "auth_invalid_reset_token", detail },
              ],
            },
            { status: 422, headers: { "Content-Type": mediaType } },
          );
        }),
      );
      await fillPasswords(user, crypto.randomUUID());
      await user.click(screen.getByRole("button", { name: "Change password" }));
      waiting.push(
        document.getElementById("password-reset-status")?.textContent ?? "",
      );
      const result = await observeResult();
      results.push({ ...result, waiting });
      expect(screen.queryByRole("button", { name: "Technical details" })).toBe(
        null,
      );
      expect(
        screen.getByRole("link", { name: "Request a new link" }),
      ).toHaveAttribute("href", "/login/recovery");
      expect(
        screen.getByRole("link", { name: "Back to sign-in" }),
      ).toHaveAttribute("href", "/login");
      view.unmount();
    }
    for (const result of results)
      expect(result).toEqual({
        ...results[0],
        waiting: ["Changing your password…"],
      });

    renderAt("/password-reset", anonymousHandler());
    const missing = await observeResult();
    const { waiting: _waiting, ...rejection } = results[0] ?? {
      waiting: [],
    };
    void _waiting;
    expect(missing).toEqual(rejection);
  });

  it("discards the link after a generic rejection and offers no resubmit", async () => {
    const user = userEvent.setup();
    let posts = 0;
    document.cookie = `mia_csrf=${crypto.randomUUID()}; Path=/`;
    renderAt(
      `/password-reset#token=${crypto.randomUUID()}`,
      anonymousHandler(),
      http.post("/api/v1/auth/password-resets", () => {
        posts++;
        return errorResponse(415, "unsupported_media_type");
      }),
    );
    await fillPasswords(user, crypto.randomUUID());
    await user.click(screen.getByRole("button", { name: "Change password" }));

    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: "Password not changed",
      }),
    ).toHaveFocus();
    expect(
      within(screen.getByRole("main")).getByText(
        "Your request couldn't be processed. Try again later.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("New password (required)")).toBeNull();
    expect(screen.queryByRole("button", { name: "Change password" })).toBe(
      null,
    );
    expect(
      screen.getByRole("button", { name: "Technical details" }),
    ).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.getByRole("link", { name: "Request a new link" }),
    ).toHaveAttribute("href", "/login/recovery");
    expect(
      screen.getByRole("link", { name: "Back to sign-in" }),
    ).toHaveAttribute("href", "/login");
    await delay(50);
    expect(posts).toBe(1);
  });

  it("moves focus with the bypass link without a fragment or losing entered values", async () => {
    const user = userEvent.setup();
    const token = crypto.randomUUID();
    const password = crypto.randomUUID();
    let tokenSent = false;
    document.cookie = `mia_csrf=${crypto.randomUUID()}; Path=/`;
    renderAt(
      `/password-reset#token=${token}`,
      anonymousHandler(),
      http.post("/api/v1/auth/password-resets", async ({ request }) => {
        tokenSent = (await request.text()).includes(token);
        return noContent();
      }),
    );
    await fillPasswords(user, password);
    const bypass = screen.getByRole("link", { name: "Skip to main content" });
    bypass.focus();
    await user.keyboard("{Enter}");

    expect(screen.getByRole("main")).toHaveFocus();
    expect(window.location.hash).toBe("");
    expect(resetInputs().every((input) => input.value === password)).toBe(true);
    await user.click(screen.getByRole("button", { name: "Change password" }));
    await screen.findByRole("heading", {
      level: 2,
      name: "Your password has been changed.",
    });
    expect(tokenSent).toBe(true);
  });

  it("keeps values for a rejected password and clears them when throttled", async () => {
    const user = userEvent.setup();
    const password = crypto.randomUUID();
    let response: "reject" | "throttle" | "accept" = "reject";
    const tokens: string[] = [];
    const token = crypto.randomUUID();
    document.cookie = `mia_csrf=${crypto.randomUUID()}; Path=/`;
    renderAt(
      `/password-reset#token=${token}`,
      anonymousHandler(),
      http.post("/api/v1/auth/password-resets", async ({ request }) => {
        const body: unknown = await request.json();
        tokens.push(JSON.stringify(body).includes(token) ? "same" : "other");
        if (response === "reject")
          return errorResponse(422, "auth_invalid_password");
        if (response === "throttle")
          return errorResponse(429, "rate_limited", "30");
        return noContent();
      }),
    );
    await fillPasswords(user, password);
    const submit = screen.getByRole("button", { name: "Change password" });
    await user.click(submit);
    await waitFor(() =>
      expect(announcementRegion("assertive")).toHaveTextContent(
        "That password was not accepted.",
      ),
    );
    const [newPassword, confirmation] = resetInputs();
    expect(newPassword?.value === password).toBe(true);
    expect(confirmation?.value === password).toBe(true);
    expect(newPassword).toHaveAttribute("aria-invalid", "true");
    expect(submit).toHaveFocus();

    response = "throttle";
    await user.click(submit);
    await waitFor(() =>
      expect(
        document.getElementById("password-reset-status"),
      ).toHaveTextContent(
        "Too many attempts. Try again later. Wait at least 30 seconds before trying again.",
      ),
    );
    expect(resetInputs().map((input) => input.value)).toEqual(["", ""]);

    await fillPasswords(user, password);
    expect(submit).toHaveAttribute("aria-disabled", "true");
    expect(tokens).toEqual(["same", "same"]);
  });

  it("sends nothing for a local rule failure and clears passwords after csrf_invalid", async () => {
    const user = userEvent.setup();
    const token = crypto.randomUUID();
    let reads = 0;
    const sent: boolean[] = [];
    let rejectCsrf = true;
    document.cookie = `mia_csrf=${crypto.randomUUID()}; Path=/`;
    renderAt(
      `/password-reset#token=${token}`,
      http.get("/api/v1/auth/session", () => {
        reads++;
        return HttpResponse.json(
          { data: null, meta: { stage: "anonymous" } },
          { headers: { "Content-Type": mediaType } },
        );
      }),
      http.post("/api/v1/auth/password-resets", async ({ request }) => {
        sent.push((await request.text()).includes(token));
        if (rejectCsrf) {
          rejectCsrf = false;
          return errorResponse(403, "csrf_invalid");
        }
        return noContent();
      }),
    );
    await user.type(
      await screen.findByLabelText("New password (required)"),
      "short",
    );
    await user.type(
      screen.getByLabelText("Confirm new password (required)"),
      "other",
    );
    await user.click(screen.getByRole("button", { name: "Change password" }));
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: "Correct these problems before saving your new password:",
      }),
    ).toBeInTheDocument();
    expect(sent).toEqual([]);

    const password = crypto.randomUUID();
    for (const input of resetInputs()) await user.clear(input);
    await fillPasswords(user, password);
    await user.click(screen.getByRole("button", { name: "Change password" }));
    await waitFor(() =>
      expect(announcementRegion("assertive")).toHaveTextContent(
        "The security check for this page expired.",
      ),
    );
    expect(resetInputs().map((input) => input.value)).toEqual(["", ""]);
    expect(reads).toBe(2);
    await delay(50);
    expect(sent).toEqual([true]);

    await fillPasswords(user, password);
    await user.click(screen.getByRole("button", { name: "Change password" }));
    await screen.findByRole("heading", {
      level: 2,
      name: "Your password has been changed.",
    });
    expect(sent).toEqual([true, true]);
  });

  it("drops the token on an unknown outcome and offers no resubmit", async () => {
    const user = userEvent.setup();
    let posts = 0;
    document.cookie = `mia_csrf=${crypto.randomUUID()}; Path=/`;
    renderAt(
      `/password-reset#token=${crypto.randomUUID()}`,
      anonymousHandler(),
      http.post("/api/v1/auth/password-resets", () => {
        posts++;
        return HttpResponse.error();
      }),
    );
    await fillPasswords(user, crypto.randomUUID());
    await user.click(screen.getByRole("button", { name: "Change password" }));

    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: "Password change not confirmed",
      }),
    ).toHaveFocus();
    expect(screen.queryByRole("button", { name: "Change password" })).toBe(
      null,
    );
    expect(
      screen.getByRole("link", {
        name: "Try signing in with your new password",
      }),
    ).toHaveAttribute("href", "/login");
    expect(
      screen.getByRole("link", { name: "Request a new link" }),
    ).toHaveAttribute("href", "/login/recovery");
    await delay(50);
    expect(posts).toBe(1);
  });

  function stageHandlers(state: {
    stage: "authenticated" | "anonymous";
    capabilities: number;
    capabilityStatus: 200 | 500;
  }) {
    return [
      http.get("/api/v1/auth/session", () =>
        HttpResponse.json(
          state.stage === "anonymous"
            ? { data: null, meta: { stage: state.stage } }
            : {
                data: {
                  type: "auth-sessions",
                  id: "account-id",
                  attributes: {
                    stage: state.stage,
                    idle_expires_at: "2026-10-01T10:30:00.000000Z",
                    absolute_expires_at: "2026-10-01T22:00:00.000000Z",
                  },
                },
              },
          { headers: { "Content-Type": mediaType } },
        ),
      ),
      http.get("/api/v1/users/me/capabilities", () => {
        state.capabilities++;
        return state.capabilityStatus === 200
          ? HttpResponse.json(capabilityDocument(), {
              headers: { "Content-Type": mediaType },
            })
          : new HttpResponse("controlled", { status: 500 });
      }),
    ];
  }

  it.each([200, 500] as const)(
    "shows the signed-in interstitial from stage discovery alone (capabilities %s) and resets after sign-out",
    async (capabilityStatus) => {
      const user = userEvent.setup();
      const state = {
        stage: "authenticated" as "authenticated" | "anonymous",
        capabilities: 0,
        capabilityStatus,
      };
      let logouts = 0;
      let resets = 0;
      document.cookie = `mia_csrf=${crypto.randomUUID()}; Path=/`;
      renderAt(
        `/password-reset#token=${crypto.randomUUID()}`,
        ...stageHandlers(state),
        http.post("/api/v1/auth/logout", () => {
          logouts++;
          state.stage = "anonymous";
          return noContent();
        }),
        http.post("/api/v1/auth/password-resets", () => {
          resets++;
          return noContent();
        }),
      );

      expect(
        await screen.findByText(
          "You're currently signed in. To reset a password with this link, sign out first.",
        ),
      ).toBeInTheDocument();
      expect(window.location.pathname).toBe("/password-reset");
      expect(document.title).toBe("Reset password | MIA");
      expect(screen.queryByRole("heading", { name: "Home" })).toBeNull();
      expect(screen.queryByRole("navigation")).toBeNull();
      await delay(50);
      expect(state.capabilities).toBe(0);
      await user.click(
        screen.getByRole("button", { name: "Sign out and continue" }),
      );

      const newPassword = await screen.findByLabelText(
        "New password (required)",
      );
      await waitFor(() => expect(newPassword).toHaveFocus());
      await waitFor(() =>
        expect(announcementRegion("polite")).toHaveTextContent(
          "Signed out. You can now choose a new password.",
        ),
      );
      expect(logouts).toBe(1);
      const password = crypto.randomUUID();
      await fillPasswords(user, password);
      await user.click(screen.getByRole("button", { name: "Change password" }));
      await screen.findByRole("heading", {
        level: 2,
        name: "Your password has been changed.",
      });
      expect({ resets, capabilities: state.capabilities }).toEqual({
        resets: 1,
        capabilities: 0,
      });
    },
  );

  it.each([
    [200, "Home", "/"],
    // A failed gate keeps the neutral error where it happened, as on any path.
    [500, "Unable to check access", "/password-reset"],
  ] as const)(
    "runs the capability gate only after a deliberate Go back (capabilities %s)",
    async (capabilityStatus, heading, path) => {
      const user = userEvent.setup();
      const state = {
        stage: "authenticated" as "authenticated" | "anonymous",
        capabilities: 0,
        capabilityStatus,
      };
      renderAt(
        `/password-reset#token=${crypto.randomUUID()}`,
        ...stageHandlers(state),
      );
      await user.click(await screen.findByRole("button", { name: "Go back" }));

      expect(
        await screen.findByRole("heading", { level: 1, name: heading }),
      ).toBeInTheDocument();
      expect(state.capabilities).toBe(1);
      expect(window.location.pathname).toBe(path);
    },
  );

  it("drops the token on Go back and dispatches to the current stage", async () => {
    const user = userEvent.setup();
    let resets = 0;
    renderAt(
      `/password-reset#token=${crypto.randomUUID()}`,
      sessionHandler("password-change"),
      http.post("/api/v1/auth/password-resets", () => {
        resets++;
        return noContent();
      }),
    );
    await user.click(await screen.findByRole("button", { name: "Go back" }));

    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Choose a new password",
      }),
    ).toHaveFocus();
    expect(window.location.pathname).toBe("/auth/password-change");
    expect(resets).toBe(0);
  });
});

describe("invitation preview and acceptance", () => {
  function renderAt(
    path: string,
    ...handlers: Parameters<typeof server.use>
  ): ReturnType<typeof render> {
    window.history.replaceState(null, "", path);
    // The production bootstrap order: capture both links before anything renders.
    const passwordResetLink = capturePasswordResetLink(
      window.location,
      window.history,
    );
    const invitationLink = captureInvitationLink(
      window.location,
      window.history,
    );
    server.use(...handlers);
    applyDocumentLocale("en-US");
    applyTextSize("standard");
    return render(
      <AnnouncementProvider>
        <MiaIntlProvider initialLocale="en-US">
          <App
            initialTextSize="standard"
            passwordResetLink={passwordResetLink}
            invitationLink={invitationLink}
          />
        </MiaIntlProvider>
      </AnnouncementProvider>,
    );
  }

  function errorResponse(status: number, code: string, retryAfter?: string) {
    return HttpResponse.json(
      { errors: [{ status: String(status), code }] },
      {
        status,
        headers: {
          "Content-Type": mediaType,
          ...(retryAfter === undefined ? {} : { "Retry-After": retryAfter }),
        },
      },
    );
  }

  function previewResponse(role = "supervisor") {
    return HttpResponse.json(
      {
        data: {
          type: "invitation-previews",
          id: "preview",
          attributes: { platform: "mia", role },
        },
      },
      { headers: { "Content-Type": mediaType } },
    );
  }

  function createdResponse() {
    return HttpResponse.json(
      { data: { type: "users", id: "user-id", attributes: {} } },
      { status: 201, headers: { "Content-Type": mediaType } },
    );
  }

  const invalidHeading = "This invitation link is invalid or no longer usable";
  const invalidBody =
    "If you already have an account, sign in. Otherwise, ask the person who invited you for a new invitation.";

  async function openAcceptance(
    user: ReturnType<typeof userEvent.setup>,
  ): Promise<void> {
    await user.click(
      await screen.findByRole("link", { name: "Accept invitation" }),
    );
    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Create your MIA account",
      }),
    ).toHaveFocus();
  }

  async function fillAcceptance(
    user: ReturnType<typeof userEvent.setup>,
    password: string,
    options: { readonly username?: string; readonly country?: string } = {},
  ): Promise<void> {
    const username = screen.getByLabelText<HTMLInputElement>(
      "Username (required)",
    );
    await user.clear(username);
    await user.type(username, options.username ?? "example.supervisor");
    await user.type(screen.getByLabelText("New password (required)"), password);
    await user.type(
      screen.getByLabelText("Confirm new password (required)"),
      password,
    );
    if (options.country !== "")
      await user.selectOptions(
        screen.getByLabelText("Country (required)"),
        options.country ?? "DE",
      );
  }

  function passwordValues(): string[] {
    return [
      screen.getByLabelText<HTMLInputElement>("New password (required)").value,
      screen.getByLabelText<HTMLInputElement>("Confirm new password (required)")
        .value,
    ];
  }

  it("captures the token before render, previews once, accepts once, and claims no session", async () => {
    const user = userEvent.setup();
    const token = crypto.randomUUID();
    const password = ` ${crypto.randomUUID()} `;
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    let previews = 0;
    let acceptances = 0;
    let exactPreview = false;
    let exactAcceptance = false;
    document.cookie = `mia_csrf=${crypto.randomUUID()}; Path=/`;
    renderAt(
      `/invitation#token=${token}`,
      anonymousHandler(),
      http.post("/api/v1/invitation-previews", async ({ request }) => {
        previews++;
        exactPreview =
          fingerprint(await request.text()) ===
          fingerprint(
            JSON.stringify({
              data: { type: "invitation-previews", attributes: { token } },
            }),
          );
        return previewResponse();
      }),
      http.post("/api/v1/invitation-acceptances", async ({ request }) => {
        acceptances++;
        exactAcceptance =
          fingerprint(await request.text()) ===
          fingerprint(
            JSON.stringify({
              data: {
                type: "invitation-acceptances",
                attributes: {
                  token,
                  username: "example.supervisor",
                  password,
                  password_confirmation: password,
                  language: "en-US",
                  country: "DE",
                  time_zone: timeZone,
                },
              },
            }),
          );
        return createdResponse();
      }),
    );
    expect(window.location.hash).toBe("");

    expect(
      await screen.findByText("Invited role: Supervisor", {
        selector: "main *",
      }),
    ).toBeInTheDocument();
    expect(document.title).toBe("Invitation | MIA");
    expect(
      screen.getByRole("heading", { level: 1, name: "Your MIA invitation" }),
    ).toHaveFocus();
    expect(screen.queryByRole("navigation")).toBeNull();
    await waitFor(() =>
      expect(announcementRegion("polite")).toHaveTextContent(
        "Invited role: Supervisor",
      ),
    );
    await openAcceptance(user);
    expect(window.location.pathname).toBe("/invitation/accept");
    expect(document.title).toBe("Create account | MIA");
    expect(
      screen.getByLabelText<HTMLSelectElement>("Language (required)").value,
    ).toBe("en-US");
    expect(
      screen.getByLabelText<HTMLSelectElement>("Time zone (required)").value,
    ).toBe(timeZone);
    expect(
      screen.getByLabelText<HTMLSelectElement>("Country (required)").value,
    ).toBe("");
    await fillAcceptance(user, password);
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: "Your account has been created.",
      }),
    ).toHaveFocus();
    expect(
      screen.getByText(
        "You are not signed in yet. Sign in with the username and password you chose.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/login",
    );
    expect(screen.queryByLabelText("New password (required)")).toBeNull();
    await delay(50);
    expect(window.location.pathname).toBe("/invitation/accept");
    expect({ previews, acceptances, exactPreview, exactAcceptance }).toEqual({
      previews: 1,
      acceptances: 1,
      exactPreview: true,
      exactAcceptance: true,
    });
    const exposed = JSON.stringify({
      href: window.location.href,
      history: window.history.state as unknown,
      title: document.title,
      body: new XMLSerializer().serializeToString(document.body),
    });
    expect(exposed.includes(token)).toBe(false);
    expect(exposed.includes(password.trim())).toBe(false);
  });

  it("renders every invalid cause with one heading, copy, action, focus, title, and announcement", async () => {
    const user = userEvent.setup();
    async function observeResult() {
      const heading = await screen.findByRole("heading", {
        level: 1,
        name: invalidHeading,
      });
      await waitFor(() => expect(heading).toHaveFocus());
      await waitFor(() =>
        expect(announcementRegion("assertive")).toHaveTextContent(
          `${invalidHeading} ${invalidBody}`,
        ),
      );
      expect(screen.queryByRole("button")).toBeNull();
      return {
        main: new XMLSerializer().serializeToString(screen.getByRole("main")),
        title: document.title,
        path: window.location.pathname,
        hash: window.location.hash,
        focused: document.activeElement?.textContent ?? null,
        assertive: announcementRegion("assertive").textContent,
      };
    }

    const results = [];
    // 422 invitation_invalid on preview.
    document.cookie = `mia_csrf=${crypto.randomUUID()}; Path=/`;
    let view = renderAt(
      `/invitation#token=${crypto.randomUUID()}`,
      anonymousHandler(),
      http.post("/api/v1/invitation-previews", () =>
        errorResponse(422, "invitation_invalid"),
      ),
    );
    results.push(await observeResult());
    view.unmount();
    // 422 invitation_invalid on acceptance.
    view = renderAt(
      `/invitation#token=${crypto.randomUUID()}`,
      anonymousHandler(),
      http.post("/api/v1/invitation-previews", () => previewResponse()),
      http.post("/api/v1/invitation-acceptances", () =>
        errorResponse(422, "invitation_invalid"),
      ),
    );
    await openAcceptance(user);
    await fillAcceptance(user, crypto.randomUUID());
    await user.click(screen.getByRole("button", { name: "Create account" }));
    results.push(await observeResult());
    view.unmount();
    // A malformed fragment, a missing fragment, and a bare acceptance path.
    let posts = 0;
    for (const path of [
      `/invitation#token=${crypto.randomUUID().toUpperCase()}`,
      "/invitation",
      "/invitation/accept",
    ]) {
      view = renderAt(
        path,
        anonymousHandler(),
        http.post("/api/v1/invitation-previews", () => {
          posts++;
          return previewResponse();
        }),
      );
      results.push(await observeResult());
      view.unmount();
    }

    for (const result of results) expect(result).toEqual(results[0]);
    expect(results[0]?.title).toBe("Invitation | MIA");
    expect(results[0]?.path).toBe("/invitation");
    expect(posts).toBe(0);
  });

  it.each([
    [409, "username_taken", "That username is already taken."],
    [422, "auth_invalid_password", "That password was not accepted."],
    [422, "auth_invalid_request", "Some details were not accepted."],
    [429, "rate_limited", "Too many attempts."],
    [403, "csrf_invalid", "The security check for this page expired."],
  ] as const)(
    "keeps the form after HTTP %s %s, clears passwords, and resubmits only deliberately",
    async (status, code, copy) => {
      const user = userEvent.setup();
      const token = crypto.randomUUID();
      const sent: boolean[] = [];
      let reads = 0;
      document.cookie = `mia_csrf=${crypto.randomUUID()}; Path=/`;
      renderAt(
        `/invitation#token=${token}`,
        http.get("/api/v1/auth/session", () => {
          reads++;
          return HttpResponse.json(
            { data: null, meta: { stage: "anonymous" } },
            { headers: { "Content-Type": mediaType } },
          );
        }),
        http.post("/api/v1/invitation-previews", () => previewResponse()),
        http.post("/api/v1/invitation-acceptances", async ({ request }) => {
          sent.push((await request.text()).includes(token));
          return sent.length === 1
            ? errorResponse(status, code, status === 429 ? "0" : undefined)
            : createdResponse();
        }),
      );
      await openAcceptance(user);
      const password = crypto.randomUUID();
      await fillAcceptance(user, password, { username: "taken.name" });
      await user.click(screen.getByRole("button", { name: "Create account" }));

      await waitFor(() =>
        expect(announcementRegion("assertive")).toHaveTextContent(copy),
      );
      expect(document.getElementById("invitation-status")).toHaveTextContent(
        copy,
      );
      expect(passwordValues()).toEqual(["", ""]);
      expect(
        screen.getByLabelText<HTMLInputElement>("Username (required)").value,
      ).toBe("taken.name");
      expect(
        screen.getByLabelText<HTMLSelectElement>("Country (required)").value,
      ).toBe("DE");
      // Only a taken username is attributed to the username field; a profile
      // rejection may concern any field.
      expect(screen.getByLabelText("Username (required)")).toHaveAttribute(
        "aria-invalid",
        code === "username_taken" ? "true" : "false",
      );
      await delay(50);
      expect(sent).toEqual([true]);
      expect(reads).toBe(code === "csrf_invalid" ? 2 : 1);

      await user.type(
        screen.getByLabelText("New password (required)"),
        password,
      );
      await user.type(
        screen.getByLabelText("Confirm new password (required)"),
        password,
      );
      await user.click(screen.getByRole("button", { name: "Create account" }));
      await screen.findByRole("heading", {
        level: 2,
        name: "Your account has been created.",
      });
      expect(sent).toEqual([true, true]);
    },
  );

  it("sends nothing when a local check fails and names each failed field", async () => {
    const user = userEvent.setup();
    let posts = 0;
    document.cookie = `mia_csrf=${crypto.randomUUID()}; Path=/`;
    renderAt(
      `/invitation#token=${crypto.randomUUID()}`,
      anonymousHandler(),
      http.post("/api/v1/invitation-previews", () => previewResponse()),
      http.post("/api/v1/invitation-acceptances", () => {
        posts++;
        return createdResponse();
      }),
    );
    await openAcceptance(user);
    await fillAcceptance(user, crypto.randomUUID(), { country: "" });
    await user.click(screen.getByRole("button", { name: "Create account" }));

    const country = screen.getByLabelText("Country (required)");
    expect(country).toHaveFocus();
    expect(country).toHaveAttribute("aria-invalid", "true");
    expect(country).toHaveAccessibleDescription("Choose your country.");
    await waitFor(() =>
      expect(announcementRegion("assertive")).toHaveTextContent(
        "Choose your country.",
      ),
    );

    for (const input of [
      screen.getByLabelText("New password (required)"),
      screen.getByLabelText("Confirm new password (required)"),
    ])
      await user.clear(input);
    await user.type(screen.getByLabelText("New password (required)"), "short");
    await user.type(
      screen.getByLabelText("Confirm new password (required)"),
      "short",
    );
    await user.click(screen.getByRole("button", { name: "Create account" }));
    expect(screen.getByLabelText("New password (required)")).toHaveFocus();
    await delay(50);
    expect(posts).toBe(0);
  });

  it.each([
    [409, "invitation_email_registered", /^An account already uses the email/u],
    [400, "malformed_request", /^Your request couldn't be processed\./u],
    [415, "unsupported_media_type", /^Your request couldn't be processed\./u],
  ] as const)(
    "ends the flow after HTTP %s %s without a resubmit",
    async (status, code, copy) => {
      const user = userEvent.setup();
      let posts = 0;
      document.cookie = `mia_csrf=${crypto.randomUUID()}; Path=/`;
      renderAt(
        `/invitation#token=${crypto.randomUUID()}`,
        anonymousHandler(),
        http.post("/api/v1/invitation-previews", () => previewResponse()),
        http.post("/api/v1/invitation-acceptances", () => {
          posts++;
          return errorResponse(status, code);
        }),
      );
      await openAcceptance(user);
      await fillAcceptance(user, crypto.randomUUID());
      await user.click(screen.getByRole("button", { name: "Create account" }));

      expect(
        await screen.findByRole("heading", {
          level: 2,
          name: "Account not created",
        }),
      ).toHaveFocus();
      expect(within(screen.getByRole("main")).getByText(copy)).toBeVisible();
      expect(
        screen.getByRole("button", { name: "Technical details" }),
      ).toHaveAttribute("aria-expanded", "false");
      expect(screen.queryByLabelText("New password (required)")).toBeNull();
      expect(screen.queryByRole("button", { name: "Create account" })).toBe(
        null,
      );
      expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
        "href",
        "/login",
      );
      await delay(50);
      expect(posts).toBe(1);
    },
  );

  it("makes no creation claim after response loss and offers no resubmit", async () => {
    const user = userEvent.setup();
    let posts = 0;
    document.cookie = `mia_csrf=${crypto.randomUUID()}; Path=/`;
    renderAt(
      `/invitation#token=${crypto.randomUUID()}`,
      anonymousHandler(),
      http.post("/api/v1/invitation-previews", () => previewResponse()),
      http.post("/api/v1/invitation-acceptances", () => {
        posts++;
        return HttpResponse.error();
      }),
    );
    await openAcceptance(user);
    await fillAcceptance(user, crypto.randomUUID());
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: "Account creation not confirmed",
      }),
    ).toHaveFocus();
    expect(
      within(screen.getByRole("main")).getByText(
        /Neither step proves whether the account was created\./u,
      ),
    ).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(
      "Your account has been created",
    );
    expect(screen.queryByRole("button", { name: "Create account" })).toBeNull();
    await delay(50);
    expect(posts).toBe(1);
  });

  it("enters outcome unknown on Stop waiting and ignores the late response", async () => {
    const user = userEvent.setup();
    let posts = 0;
    const response = deferredVoid();
    document.cookie = `mia_csrf=${crypto.randomUUID()}; Path=/`;
    renderAt(
      `/invitation#token=${crypto.randomUUID()}`,
      anonymousHandler(),
      http.post("/api/v1/invitation-previews", () => previewResponse()),
      http.post("/api/v1/invitation-acceptances", async () => {
        posts++;
        await response.promise;
        return createdResponse();
      }),
    );
    await openAcceptance(user);
    await fillAcceptance(user, crypto.randomUUID());
    await user.click(screen.getByRole("button", { name: "Create account" }));
    await waitFor(() => expect(posts).toBe(1));
    expect(screen.getByLabelText("Username (required)")).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    await user.click(screen.getByRole("button", { name: "Stop waiting" }));

    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: "Account creation not confirmed",
      }),
    ).toHaveFocus();
    response.resolve();
    await delay(50);
    expect(
      screen.queryByRole("heading", { name: "Your account has been created." }),
    ).toBeNull();
    expect(posts).toBe(1);
  });

  it("keeps the token for a deliberate preview retry after throttling and CSRF rejection", async () => {
    const user = userEvent.setup();
    const token = crypto.randomUUID();
    const sent: boolean[] = [];
    let reads = 0;
    document.cookie = `mia_csrf=${crypto.randomUUID()}; Path=/`;
    renderAt(
      `/invitation#token=${token}`,
      http.get("/api/v1/auth/session", () => {
        reads++;
        return HttpResponse.json(
          { data: null, meta: { stage: "anonymous" } },
          { headers: { "Content-Type": mediaType } },
        );
      }),
      http.post("/api/v1/invitation-previews", async ({ request }) => {
        sent.push((await request.text()).includes(token));
        if (sent.length === 1) return errorResponse(429, "rate_limited", "0");
        if (sent.length === 2) return errorResponse(403, "csrf_invalid");
        return previewResponse("mentor");
      }),
    );

    const retry = await screen.findByRole("button", { name: "Try again" });
    await waitFor(() =>
      expect(announcementRegion("assertive")).toHaveTextContent(
        "Too many attempts to check this invitation.",
      ),
    );
    await delay(50);
    expect(sent).toEqual([true]);
    await user.click(retry);
    await waitFor(() =>
      expect(announcementRegion("assertive")).toHaveTextContent(
        "The security check for this page expired. Try again.",
      ),
    );
    expect(retry).toHaveFocus();
    expect(reads).toBe(2);
    await user.click(retry);

    expect(
      await screen.findByText("Invited role: Mentor", { selector: "main *" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Accept invitation" }),
    ).toHaveFocus();
    expect(sent).toEqual([true, true, true]);
  });

  it.each([
    [503, "unavailable"],
    [400, "malformed_request"],
  ] as const)(
    "drops the token after preview HTTP %s and asks to reopen the email link",
    async (status, code) => {
      let posts = 0;
      document.cookie = `mia_csrf=${crypto.randomUUID()}; Path=/`;
      renderAt(
        `/invitation#token=${crypto.randomUUID()}`,
        anonymousHandler(),
        http.post("/api/v1/invitation-previews", () => {
          posts++;
          return errorResponse(status, code);
        }),
      );

      expect(
        await screen.findByRole("heading", {
          level: 2,
          name: "Invitation could not be checked",
        }),
      ).toBeInTheDocument();
      expect(
        within(screen.getByRole("main")).getByText(
          /open the link in your invitation email again/u,
        ),
      ).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
      expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
        "href",
        "/login",
      );
      await delay(50);
      expect(posts).toBe(1);
    },
  );

  it("keeps the token across Back and Forward between the two paths and drops it on departure", async () => {
    const user = userEvent.setup();
    let previews = 0;
    document.cookie = `mia_csrf=${crypto.randomUUID()}; Path=/`;
    renderAt(
      `/invitation#token=${crypto.randomUUID()}`,
      anonymousHandler(),
      http.post("/api/v1/invitation-previews", () => {
        previews++;
        return previewResponse();
      }),
    );
    await openAcceptance(user);

    act(() => window.history.back());
    expect(
      await screen.findByRole("link", { name: "Accept invitation" }),
    ).toBeInTheDocument();
    act(() => window.history.forward());
    expect(
      await screen.findByLabelText("Username (required)"),
    ).toBeInTheDocument();

    await act(async () => {
      window.history.pushState(null, "", "/login");
      window.dispatchEvent(new PopStateEvent("popstate"));
      await delay(20);
    });
    await screen.findByRole("heading", { level: 1, name: "Sign in to MIA" });
    act(() => window.history.back());
    expect(
      await screen.findByRole("heading", { level: 1, name: invalidHeading }),
    ).toBeInTheDocument();
    expect(previews).toBe(1);
  });

  function stageHandlers(state: {
    stage: "authenticated" | "anonymous";
    capabilities: number;
  }) {
    return [
      http.get("/api/v1/auth/session", () =>
        HttpResponse.json(
          state.stage === "anonymous"
            ? { data: null, meta: { stage: state.stage } }
            : {
                data: {
                  type: "auth-sessions",
                  id: "account-id",
                  attributes: {
                    stage: state.stage,
                    idle_expires_at: "2026-10-03T10:30:00.000000Z",
                    absolute_expires_at: "2026-10-03T22:00:00.000000Z",
                  },
                },
              },
          { headers: { "Content-Type": mediaType } },
        ),
      ),
      http.get("/api/v1/users/me/capabilities", () => {
        state.capabilities++;
        return HttpResponse.json(capabilityDocument(), {
          headers: { "Content-Type": mediaType },
        });
      }),
    ];
  }

  it("shows the signed-in interstitial from stage discovery alone and previews after confirmed sign-out", async () => {
    const user = userEvent.setup();
    const state = {
      stage: "authenticated" as "authenticated" | "anonymous",
      capabilities: 0,
    };
    let logouts = 0;
    let previews = 0;
    document.cookie = `mia_csrf=${crypto.randomUUID()}; Path=/`;
    renderAt(
      `/invitation#token=${crypto.randomUUID()}`,
      ...stageHandlers(state),
      http.post("/api/v1/auth/logout", () => {
        logouts++;
        state.stage = "anonymous";
        return new HttpResponse(null, { status: 204 });
      }),
      http.post("/api/v1/invitation-previews", () => {
        previews++;
        return previewResponse();
      }),
    );

    expect(
      await screen.findByText(
        "You're currently signed in. To use this invitation, sign out first.",
      ),
    ).toBeInTheDocument();
    expect(document.title).toBe("Invitation | MIA");
    expect(screen.queryByRole("navigation")).toBeNull();
    await delay(50);
    expect({ capabilities: state.capabilities, previews }).toEqual({
      capabilities: 0,
      previews: 0,
    });
    await user.click(
      screen.getByRole("button", { name: "Sign out and continue" }),
    );

    expect(
      await screen.findByText("Invited role: Supervisor", {
        selector: "main *",
      }),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.getByRole("link", { name: "Accept invitation" }),
      ).toHaveFocus(),
    );
    expect({ logouts, previews, capabilities: state.capabilities }).toEqual({
      logouts: 1,
      previews: 1,
      capabilities: 0,
    });
  });

  it("runs the capability gate only after a deliberate Go back and drops the token", async () => {
    const user = userEvent.setup();
    const state = {
      stage: "authenticated" as "authenticated" | "anonymous",
      capabilities: 0,
    };
    let previews = 0;
    renderAt(
      `/invitation#token=${crypto.randomUUID()}`,
      ...stageHandlers(state),
      http.post("/api/v1/invitation-previews", () => {
        previews++;
        return previewResponse();
      }),
    );
    await user.click(await screen.findByRole("button", { name: "Go back" }));

    expect(
      await screen.findByRole("heading", { level: 1, name: "Home" }),
    ).toBeInTheDocument();
    expect(state.capabilities).toBe(1);
    expect(window.location.pathname).toBe("/");
    expect(previews).toBe(0);
  });

  it("keeps Try again unavailable during a nonzero preview Retry-After and sends nothing until it passes", async () => {
    const user = userEvent.setup();
    let previews = 0;
    document.cookie = `mia_csrf=${crypto.randomUUID()}; Path=/`;
    renderAt(
      `/invitation#token=${crypto.randomUUID()}`,
      anonymousHandler(),
      http.post("/api/v1/invitation-previews", () => {
        previews++;
        return previews === 1
          ? errorResponse(429, "rate_limited", "2")
          : previewResponse();
      }),
    );

    const retry = await screen.findByRole("button", { name: "Try again" });
    expect(retry).toHaveAttribute("aria-disabled", "true");
    expect(
      within(screen.getByRole("main")).getByText(
        /Wait at least 2 seconds before trying again\./u,
      ),
    ).toBeInTheDocument();
    await user.click(retry);
    await delay(50);
    expect(previews).toBe(1);

    await waitFor(
      () => expect(retry).toHaveAttribute("aria-disabled", "false"),
      { timeout: 3000 },
    );
    await user.click(retry);
    expect(
      await screen.findByText("Invited role: Supervisor", {
        selector: "main *",
      }),
    ).toBeInTheDocument();
    expect(previews).toBe(2);
  });

  it("keeps Create account unavailable during a nonzero acceptance Retry-After and sends nothing until it passes", async () => {
    const user = userEvent.setup();
    let acceptances = 0;
    document.cookie = `mia_csrf=${crypto.randomUUID()}; Path=/`;
    renderAt(
      `/invitation#token=${crypto.randomUUID()}`,
      anonymousHandler(),
      http.post("/api/v1/invitation-previews", () => previewResponse()),
      http.post("/api/v1/invitation-acceptances", () => {
        acceptances++;
        return acceptances === 1
          ? errorResponse(429, "rate_limited", "2")
          : createdResponse();
      }),
    );
    await openAcceptance(user);
    const password = crypto.randomUUID();
    await fillAcceptance(user, password);
    const submit = screen.getByRole("button", { name: "Create account" });
    await user.click(submit);

    await waitFor(() =>
      expect(document.getElementById("invitation-status")).toHaveTextContent(
        "Wait at least 2 seconds before trying again.",
      ),
    );
    expect(submit).toHaveAttribute("aria-disabled", "true");
    await user.click(submit);
    await delay(50);
    expect(acceptances).toBe(1);

    await waitFor(
      () => expect(submit).toHaveAttribute("aria-disabled", "false"),
      { timeout: 3000 },
    );
    await user.type(screen.getByLabelText("New password (required)"), password);
    await user.type(
      screen.getByLabelText("Confirm new password (required)"),
      password,
    );
    await user.click(submit);
    await screen.findByRole("heading", {
      level: 2,
      name: "Your account has been created.",
    });
    expect(acceptances).toBe(2);
  });

  it.each(["mfa", "password-change"] as const)(
    "holds a %s-stage link behind the focused interstitial with no restricted form, prefetch, or preview until sign-out",
    async (stage) => {
      const user = userEvent.setup();
      let current: "mfa" | "password-change" | "anonymous" = stage;
      let capabilities = 0;
      let logouts = 0;
      let previews = 0;
      document.cookie = `mia_csrf=${crypto.randomUUID()}; Path=/`;
      renderAt(
        `/invitation#token=${crypto.randomUUID()}`,
        http.get("/api/v1/auth/session", () =>
          current === "anonymous"
            ? HttpResponse.json(
                { data: null, meta: { stage: "anonymous" } },
                { headers: { "Content-Type": mediaType } },
              )
            : HttpResponse.json(
                {
                  data: {
                    type: "auth-sessions",
                    id: "account-id",
                    attributes: {
                      stage: current,
                      ...(current === "mfa"
                        ? { mfa_challenge_id: "challenge-id" }
                        : {}),
                      idle_expires_at: "2026-10-04T10:30:00.000000Z",
                      absolute_expires_at: "2026-10-04T10:30:00.000000Z",
                    },
                  },
                },
                { headers: { "Content-Type": mediaType } },
              ),
        ),
        http.get("/api/v1/users/me/capabilities", () => {
          capabilities++;
          return HttpResponse.json(capabilityDocument(), {
            headers: { "Content-Type": mediaType },
          });
        }),
        http.post("/api/v1/auth/logout", () => {
          logouts++;
          current = "anonymous";
          return new HttpResponse(null, { status: 204 });
        }),
        http.post("/api/v1/invitation-previews", () => {
          previews++;
          return previewResponse();
        }),
      );

      expect(
        await screen.findByText(
          "You're currently signed in. To use this invitation, sign out first.",
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("heading", { level: 1, name: "Your MIA invitation" }),
      ).toHaveFocus();
      expect(window.location.pathname).toBe("/invitation");
      expect(document.title).toBe("Invitation | MIA");
      expect(screen.queryByRole("navigation")).toBeNull();
      expect(screen.queryByLabelText("Six-digit code (required)")).toBeNull();
      expect(screen.queryByLabelText("New password (required)")).toBeNull();
      await delay(50);
      expect({ capabilities, previews }).toEqual({
        capabilities: 0,
        previews: 0,
      });

      await user.click(
        screen.getByRole("button", { name: "Sign out and continue" }),
      );
      expect(
        await screen.findByText("Invited role: Supervisor", {
          selector: "main *",
        }),
      ).toBeInTheDocument();
      expect({ logouts, previews, capabilities }).toEqual({
        logouts: 1,
        previews: 1,
        capabilities: 0,
      });
    },
  );
});

describe("TOTP enrollment and recovery codes", () => {
  const pendingId = "mfe_pending";
  // Secret-bearing DOM must never reach a failure message: report only the
  // query, not the pretty-printed DOM or the accessible-name inventory.
  beforeEach(() =>
    configure({
      getElementError: (message) => {
        const error = new Error((message ?? "").split("\n")[0]);
        error.name = "TestingLibraryElementError";
        return error;
      },
    }),
  );
  afterEach(() => configure({ getElementError: defaultElementError }));
  let mfaState: MfaStateFixture = {};
  let counts = { reads: 0, starts: 0, verifies: 0, cancels: 0 };

  function mfaHandlers(
    options: {
      readonly uri?: () => string;
      readonly verify?: () => Response;
      readonly ownProfileView?: boolean;
      readonly ownResource?: boolean;
      readonly read?: () => Response;
    } = {},
  ) {
    return [
      http.get("/api/v1/auth/session", () => authenticatedSessionResponse()),
      http.get("/api/v1/users/me/capabilities", () =>
        ownProfileCapabilities(
          "account-id",
          options.ownProfileView ?? true,
          options.ownResource,
        ),
      ),
      http.get("/api/v1/users/me/mfa", () => {
        counts.reads++;
        return options.read?.() ?? mfaStateResponse(mfaState);
      }),
      http.post("/api/v1/users/me/mfa-enrollments", () => {
        counts.starts++;
        mfaState = { pending: { id: pendingId } };
        return enrollmentResponse(
          pendingId,
          (options.uri ?? (() => provisioningUriFixture()))(),
        );
      }),
      http.post(
        `/api/v1/users/me/mfa-enrollments/${pendingId}/verifications`,
        () => {
          counts.verifies++;
          return (
            options.verify ??
            (() => {
              mfaState = { active: "totp" };
              return recoveryCodesResponse(pendingId, recoveryCodesFixture());
            })
          )();
        },
      ),
      http.delete(`/api/v1/users/me/mfa-enrollments/${pendingId}`, () => {
        counts.cancels++;
        mfaState = {};
        return new HttpResponse(null, { status: 204 });
      }),
    ];
  }

  function beginAt(path: string) {
    mfaState = {};
    counts = { reads: 0, starts: 0, verifies: 0, cancels: 0 };
    document.cookie = `mia_csrf=${crypto.randomUUID()}; Path=/`;
    window.history.replaceState(null, "", path);
    storageWrites = [];
    const setItem = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (
      this: Storage,
      key: string,
      value: string,
    ) {
      storageWrites.push(key, value);
      setItem.call(this, key, value);
    });
  }

  let storageWrites: string[] = [];

  function documentText(): string {
    return `${new XMLSerializer().serializeToString(document)}${document.title}${window.location.href}${JSON.stringify(window.history.state)}`;
  }

  function storageText(): string {
    return storageWrites.join("\n");
  }

  async function startSetup(user: ReturnType<typeof userEvent.setup>) {
    await user.click(
      await screen.findByRole("button", { name: "Start setup" }),
    );
    return screen.findByRole("heading", {
      level: 1,
      name: "Verify multi-factor authentication",
    });
  }

  it("links Home to the MFA overview only with own-scope profile.view", async () => {
    beginAt("/");
    renderEntry(...mfaHandlers());
    const user = userEvent.setup();
    await user.click(
      await screen.findByRole("link", { name: "Multi-factor authentication" }),
    );
    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Multi-factor authentication",
      }),
    ).toHaveFocus();
    expect(document.title).toBe("Multi-factor authentication | MIA");
    expect(
      await screen.findByText("Multi-factor authentication is off"),
    ).toBeVisible();
    expect(counts.reads).toBe(1);
  });

  it.each([
    [true, false],
    [false, true],
    [false, false],
  ])(
    "falls back without MFA reads or Home link for available=%s own_resource=%s",
    async (available, ownResource) => {
      beginAt("/profile/security/mfa/enroll");
      renderEntry(...mfaHandlers({ ownProfileView: available, ownResource }));
      await screen.findByRole("heading", { level: 1, name: "Home" });
      expect(window.location.pathname).toBe("/");
      expect(
        screen.queryByRole("link", { name: "Multi-factor authentication" }),
      ).toBeNull();
      await delay(20);
      expect(counts.reads).toBe(0);
    },
  );

  it("withholds the protected route body after a failed resource read until deliberate Check again", async () => {
    beginAt("/profile/security/mfa");
    let failing = true;
    renderEntry(
      ...mfaHandlers({
        read: () =>
          failing ? mfaErrorResponse(503, "unavailable") : mfaStateResponse(),
      }),
    );
    const retry = await screen.findByRole("button", { name: "Check again" });
    expect(
      screen.getByText(
        "We could not check your multi-factor authentication status.",
      ),
    ).toBeVisible();
    expect(
      screen.queryByRole("heading", {
        name: "Multi-factor authentication",
        level: 1,
      }),
    ).toBeNull();
    expect(screen.queryByText("Multi-factor authentication is off")).toBeNull();
    expect(
      screen.queryByRole("link", { name: "Set up authenticator app" }),
    ).toBeNull();
    failing = false;
    await delay(20);
    expect(counts.reads).toBe(1);
    await userEvent.setup().click(retry);
    expect(
      await screen.findByText("Multi-factor authentication is off"),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Set up authenticator app" }),
    ).toBeVisible();
    expect(counts.reads).toBe(2);
  });

  it.each(["state read 401", "verify 403"] as const)(
    "renders access-lost explanation and deliberate Refresh after MFA %s",
    async (failure) => {
      beginAt("/profile/security/mfa/enroll");
      const secret = totpSecretFixture();
      let denyRead = false;
      renderEntry(
        ...mfaHandlers({
          uri: () => provisioningUriFixture(secret),
          read: () =>
            denyRead
              ? mfaErrorResponse(401, "auth_unauthenticated")
              : mfaStateResponse(mfaState),
          verify: () => mfaErrorResponse(403, "auth_password_change_required"),
        }),
      );
      const user = userEvent.setup();
      await startSetup(user);
      if (failure === "state read 401") {
        denyRead = true;
        act(() => window.dispatchEvent(new Event("focus")));
        await user.click(screen.getByRole("button", { name: "Refresh" }));
      } else {
        await user.type(
          screen.getByLabelText(
            "Six-digit code from your authenticator app (required)",
          ),
          mfaCodeFixture(),
        );
        await user.click(screen.getByRole("button", { name: "Verify code" }));
      }
      expect(
        await screen.findByText(
          "MIA could not confirm your sign-in or access. Content is hidden. Refresh to check your sign-in.",
          { selector: "main p" },
        ),
      ).toBeVisible();
      expect(
        screen.getByRole("heading", { level: 1, name: "Content hidden" }),
      ).toBeVisible();
      expectSecretAbsent(documentText(), secret, "Access-lost document");
      expect(screen.queryByRole("img")).toBeNull();
      const reads = counts.reads;
      denyRead = false;
      await delay(20);
      expect(counts.reads).toBe(reads);
      await user.click(screen.getByRole("button", { name: "Refresh" }));
      expect(await screen.findByText(/cannot be shown again/u)).toBeVisible();
      expectSecretAbsent(documentText(), secret, "Reauthorized document");
      expect(counts.verifies).toBe(failure === "verify 403" ? 1 : 0);
      expect(counts.reads).toBe(reads + 1);
    },
  );

  it("renders a local SVG QR code and selectable manual values from one valid URI", async () => {
    beginAt("/profile/security/mfa/enroll");
    const secret = totpSecretFixture();
    const requests: string[] = [];
    const onRequest = ({ request }: { request: Request }) => {
      requests.push(new URL(request.url).pathname);
    };
    server.events.on("request:start", onRequest);
    renderEntry(...mfaHandlers({ uri: () => provisioningUriFixture(secret) }));
    const user = userEvent.setup();
    await startSetup(user);
    const qr = await screen.findByRole("img", {
      name: "QR code for adding MIA to your authenticator app",
    });
    expect(qr.tagName.toLowerCase()).toBe("svg");
    expect(qr.querySelector("path")?.getAttribute("d")).not.toBe("");
    expect(document.querySelector("img, image, canvas")).toBeNull();
    expect(document.querySelector('a[href^="otpauth:"]')).toBeNull();
    const term = screen.getByText("Setup key");
    expectSameSecret(
      term.nextElementSibling?.textContent,
      secret,
      "Manual setup key",
    );
    expect(
      screen.getByText("MIA (mia.example.test):example.learner"),
    ).toBeVisible();
    expect(counts.starts).toBe(1);
    server.events.removeListener("request:start", onRequest);
    expect(requests.every((path) => path.startsWith("/api/v1/"))).toBe(true);
    expectSecretAbsent(storageText(), secret, "Browser storage");
    expectSecretAbsent(
      `${document.title}${window.location.href}${JSON.stringify(window.history.state)}`,
      secret,
      "URL, title, and history state",
    );
    expectSecretAbsent(
      announcementRegion("polite").textContent ?? "",
      secret,
      "Announcements",
    );
  });

  it("renders no QR code or manual value for a rejected URI and offers Cancel", async () => {
    beginAt("/profile/security/mfa/enroll");
    const secret = totpSecretFixture();
    renderEntry(
      ...mfaHandlers({
        uri: () =>
          provisioningUriFixture(secret, "mia.example.test", "x", "&image=1"),
      }),
    );
    const user = userEvent.setup();
    await user.click(
      await screen.findByRole("button", { name: "Start setup" }),
    );
    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: /setup data it cannot use/u,
      }),
    ).toBeVisible();
    expect(screen.queryByRole("img")).toBeNull();
    expectSecretAbsent(documentText(), secret, "Rejected setup document");
    await user.click(screen.getByRole("button", { name: "Cancel setup" }));
    expect(
      await screen.findByText("Setup cancelled.", { selector: "main *" }),
    ).toBeVisible();
    expect(counts).toMatchObject({ starts: 1, cancels: 1 });
  });

  it("offers code entry and Cancel for a pending enrollment without a held URI", async () => {
    beginAt("/profile/security/mfa/verify");
    renderEntry(...mfaHandlers());
    mfaState = { pending: { id: pendingId } };
    expect(await screen.findByText(/cannot be shown again/u)).toBeVisible();
    expect(screen.queryByRole("img")).toBeNull();
    expect(
      screen.getByLabelText(
        "Six-digit code from your authenticator app (required)",
      ),
    ).toHaveAttribute("autocomplete", "one-time-code");
    expect(screen.getByRole("button", { name: "Cancel setup" })).toBeVisible();
    expect(counts.starts).toBe(0);
  });

  it("masks setup on a lifecycle shield and reveals it only after Refresh and a fresh read", async () => {
    beginAt("/profile/security/mfa/enroll");
    const secret = totpSecretFixture();
    renderEntry(...mfaHandlers({ uri: () => provisioningUriFixture(secret) }));
    const user = userEvent.setup();
    await startSetup(user);
    act(() => window.dispatchEvent(new Event("focus")));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Content hidden",
    );
    expectSecretAbsent(documentText(), secret, "Shielded document");
    const readsBefore = counts.reads;
    await user.click(screen.getByRole("button", { name: "Refresh" }));
    await screen.findByText("Setup details are hidden");
    expect(counts.reads).toBe(readsBefore + 1);
    expectSecretAbsent(documentText(), secret, "Masked setup");
    await user.click(
      screen.getByRole("button", { name: "Show setup details" }),
    );
    expectSameSecret(
      screen.getByText("Setup key").nextElementSibling?.textContent,
      secret,
      "Revealed setup key",
    );
    expect(counts.starts).toBe(1);
  });

  it.each(["non-persisted pagehide", "route departure"])(
    "destroys setup on %s",
    async (cause) => {
      beginAt("/profile/security/mfa/enroll");
      const secret = totpSecretFixture();
      renderEntry(
        ...mfaHandlers({ uri: () => provisioningUriFixture(secret) }),
      );
      const user = userEvent.setup();
      await startSetup(user);
      if (cause === "route departure") {
        await user.click(
          screen.getByRole("link", {
            name: "Back to multi-factor authentication",
          }),
        );
        await screen.findByText("Setup is pending");
        await user.click(screen.getByRole("link", { name: "Continue setup" }));
      } else {
        act(() =>
          window.dispatchEvent(
            new PageTransitionEvent("pagehide", { persisted: false }),
          ),
        );
        await user.click(screen.getByRole("button", { name: "Refresh" }));
      }
      expect(await screen.findByText(/cannot be shown again/u)).toBeVisible();
      expectSecretAbsent(documentText(), secret, "Destroyed setup");
    },
  );

  it("re-reads after an unknown verify outcome and explains unrecoverable codes", async () => {
    beginAt("/profile/security/mfa/enroll");
    renderEntry(
      ...mfaHandlers({
        verify: () => {
          mfaState = { active: "totp" };
          return HttpResponse.error();
        },
      }),
    );
    const user = userEvent.setup();
    await startSetup(user);
    const readsBefore = counts.reads;
    await user.type(
      screen.getByLabelText(
        "Six-digit code from your authenticator app (required)",
      ),
      mfaCodeFixture(),
    );
    await user.click(screen.getByRole("button", { name: "Verify code" }));
    expect(
      await screen.findByText(
        /recovery codes from this setup could not be shown/u,
        { selector: "main *" },
      ),
    ).toBeVisible();
    expect(counts).toMatchObject({ verifies: 1, reads: readsBefore + 1 });
  });

  it("keeps the setup and input after an invalid code without resubmitting", async () => {
    beginAt("/profile/security/mfa/enroll");
    const secret = totpSecretFixture();
    renderEntry(
      ...mfaHandlers({
        uri: () => provisioningUriFixture(secret),
        verify: () => mfaErrorResponse(422, "auth_invalid_mfa_code"),
      }),
    );
    const user = userEvent.setup();
    await startSetup(user);
    const field = screen.getByLabelText<HTMLInputElement>(
      "Six-digit code from your authenticator app (required)",
    );
    const code = mfaCodeFixture();
    await user.type(field, code);
    await user.click(screen.getByRole("button", { name: "Verify code" }));
    await screen.findByRole("heading", {
      level: 2,
      name: /code was not accepted/u,
    });
    await waitFor(() => expect(field).toHaveFocus());
    expect(field.value === code).toBe(true);
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(field).toHaveAccessibleDescription(/code was not accepted/u);
    expectSameSecret(
      screen.getByText("Setup key").nextElementSibling?.textContent,
      secret,
      "Retained setup key",
    );
    expect(counts.verifies).toBe(1);
  });

  it.each(["unknown", "throttled", "reconcile failed"])(
    "keeps a valid code valid and focuses feedback after %s",
    async (result) => {
      beginAt("/profile/security/mfa/verify");
      renderEntry(
        ...mfaHandlers({
          verify: () =>
            result === "throttled"
              ? mfaErrorResponse(429, "rate_limited")
              : HttpResponse.error(),
        }),
      );
      mfaState = { pending: { id: pendingId } };
      const user = userEvent.setup();
      const field = await screen.findByLabelText<HTMLInputElement>(
        "Six-digit code from your authenticator app (required)",
      );
      if (result === "reconcile failed")
        server.use(
          http.get("/api/v1/users/me/mfa", () => HttpResponse.error()),
        );
      const code = mfaCodeFixture();
      await user.type(field, code);
      await user.click(screen.getByRole("button", { name: "Verify code" }));
      const feedback =
        result === "reconcile failed"
          ? await screen.findByRole("button", { name: "Check again" })
          : await screen.findByRole("heading", { level: 2 });
      await waitFor(() => expect(feedback).toHaveFocus());
      expect(field).toHaveAttribute("aria-invalid", "false");
      expectSecretAbsent(
        announcementRegion("assertive").textContent ?? "",
        code,
        "Result announcement",
      );
      expect(counts.verifies).toBe(1);
    },
  );

  it("replaces enroll with verify in history and destroys setup on intentional Back", async () => {
    beginAt("/profile/security/mfa");
    const secret = totpSecretFixture();
    renderEntry(...mfaHandlers({ uri: () => provisioningUriFixture(secret) }));
    const user = userEvent.setup();
    await user.click(
      await screen.findByRole("link", { name: "Set up authenticator app" }),
    );
    await startSetup(user);
    act(() => window.history.back());
    await screen.findByRole("heading", {
      level: 1,
      name: "Multi-factor authentication",
    });
    expect(window.location.pathname).toBe("/profile/security/mfa");
    expectSecretAbsent(documentText(), secret, "Intentional Back departure");
  });

  it("shows ten grouped codes once with copy, a codes-only print view, and acknowledgement-gated Done", async () => {
    beginAt("/profile/security/mfa/enroll");
    const codes = recoveryCodesFixture();
    let copied = "";
    vi.spyOn(navigator.clipboard, "writeText").mockImplementation((text) => {
      copied = text;
      return Promise.resolve();
    });
    const print = vi.spyOn(window, "print").mockImplementation(() => {});
    renderEntry(
      ...mfaHandlers({
        verify: () => {
          mfaState = { active: "totp" };
          return recoveryCodesResponse(pendingId, codes);
        },
      }),
    );
    const user = userEvent.setup();
    await startSetup(user);
    await user.type(
      screen.getByLabelText(
        "Six-digit code from your authenticator app (required)",
      ),
      mfaCodeFixture(),
    );
    await user.click(screen.getByRole("button", { name: "Verify code" }));
    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "MFA recovery codes",
      }),
    ).toHaveFocus();
    expect(window.location.pathname).toBe(
      "/profile/security/mfa/recovery-codes",
    );
    const grouped = codes.map((code) => code.replace(/(.{4})(?=.)/gu, "$1-"));
    const reveal = await screen.findByRole("button", {
      name: "Show recovery codes",
    });
    for (const code of [...codes, ...grouped])
      expectSecretAbsent(documentText(), code, "Before initial Reveal");
    expect(screen.queryByTestId("recovery-code-print")).toBeNull();
    expect(screen.getByText(/cannot show them again/u)).toBeVisible();
    await user.click(reveal);
    const list = await within(screen.getByRole("main")).findByRole("list", {
      name: "Recovery codes",
    });
    expectSameSecret(
      within(list)
        .getAllByRole("listitem")
        .map((item) => item.textContent)
        .join("\n"),
      grouped.join("\n"),
      "Rendered grouped codes",
    );
    act(() => window.dispatchEvent(new Event("focus")));
    for (const code of grouped)
      expectSecretAbsent(documentText(), code, "Lifecycle-masked codes");
    expect(screen.queryByTestId("recovery-code-print")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Refresh" }));
    const revealAgain = await screen.findByRole("button", {
      name: "Show recovery codes",
    });
    for (const code of grouped)
      expectSecretAbsent(documentText(), code, "Before guarded re-reveal");
    await user.click(revealAgain);
    expect(
      within(screen.getByRole("main")).getByText(/cannot show them again/u),
    ).toBeVisible();
    expect(
      screen.getByRole("group", { name: "Safe storage confirmation" }),
    ).toBeVisible();

    const copy = screen.getByRole("button", {
      name: "Copy all recovery codes",
    });
    await user.click(copy);
    expectSameSecret(copied, grouped.join("\n"), "Copied codes");
    expect(copy).toHaveFocus();
    await waitFor(() =>
      expect(announcementRegion("polite")).toHaveTextContent(
        "Recovery codes copied.",
      ),
    );

    const printView = screen.getByTestId("recovery-code-print");
    expect(document.getElementById("root")?.contains(printView)).not.toBe(true);
    expectSameSecret(
      within(printView)
        .getAllByRole("listitem", { hidden: true })
        .map((item) => item.textContent)
        .join("\n"),
      grouped.join("\n"),
      "Printed codes",
    );
    expectSameSecret(
      printView.textContent,
      `${within(screen.getByRole("main")).getByText(/cannot show them again/u).textContent}${grouped.join("")}`,
      "Print view contains only the warning and codes",
    );
    await user.click(
      screen.getByRole("button", { name: "Print recovery codes" }),
    );
    expect(print).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(announcementRegion("polite")).toHaveTextContent(
        "Print dialog requested. Printing is not confirmed.",
      ),
    );

    const done = screen.getByRole("button", { name: "Done" });
    expect(done).toHaveAttribute("aria-disabled", "true");
    await user.click(done);
    expect(
      screen.getByLabelText("I have saved my recovery codes"),
    ).toHaveFocus();
    expect(window.location.pathname).toBe(
      "/profile/security/mfa/recovery-codes",
    );
    await user.click(screen.getByLabelText("I have saved my recovery codes"));
    await user.click(done);
    expect(
      await screen.findByText("Multi-factor authentication is on"),
    ).toBeVisible();
    expect(window.location.pathname).toBe("/profile/security/mfa");
    for (const code of grouped)
      expectSecretAbsent(documentText(), code, "Document after Done");
    expect(counts.verifies).toBe(1);
  });

  it("announces a copy failure and leaves the codes selectable", async () => {
    beginAt("/profile/security/mfa/enroll");
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(
      new Error("denied"),
    );
    renderEntry(...mfaHandlers());
    const user = userEvent.setup();
    await startSetup(user);
    await user.type(
      screen.getByLabelText(
        "Six-digit code from your authenticator app (required)",
      ),
      mfaCodeFixture(),
    );
    await user.click(screen.getByRole("button", { name: "Verify code" }));
    await user.click(
      await screen.findByRole("button", { name: "Show recovery codes" }),
    );
    await user.click(
      await screen.findByRole("button", { name: "Copy all recovery codes" }),
    );
    await waitFor(() =>
      expect(announcementRegion("assertive")).toHaveTextContent(
        "Recovery codes could not be copied.",
      ),
    );
    expect(
      within(screen.getByRole("main")).getByRole("list", {
        name: "Recovery codes",
      }),
    ).toBeVisible();
  });
});
