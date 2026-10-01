import { createHash, randomBytes } from "node:crypto";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { delay, http, HttpResponse } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";
import { server } from "../../test/server";
import { App } from "./App";
import {
  createEntryQueryClient,
  type EntryQueryClient,
} from "../platform/data/EntryDataProvider";
import { AnnouncementProvider } from "../platform/announcer/AnnouncementRegion";
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

const mediaType = "application/vnd.api+json";

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
        <App initialTextSize="standard" />
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
        <App initialTextSize="standard" queryClient={queryClient} />
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
          <App initialTextSize="standard" />
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
