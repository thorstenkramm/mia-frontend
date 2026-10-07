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
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import { authenticatedSessionResponse } from "../../../test/mfaFixtures";
import { server } from "../../../test/server";
import { App } from "../App";
import { AnnouncementProvider } from "../../platform/announcer/AnnouncementRegion";
import { applyDocumentLocale } from "../../platform/i18n/locales";
import { MiaIntlProvider } from "../../platform/i18n/MiaIntlProvider";
import { applyTextSize } from "../../platform/prefs/preferences";
import { InvitationLink } from "../../platform/session/invitationLink";
import { PasswordResetLink } from "../../platform/session/passwordResetLink";
import { holdGuardedHistoryTraversals } from "../../platform/ui/routeDeparture";

// Synthetic, per-test invitation fixtures. Invitee addresses are protected
// personal data: assertions refer to them through variables only, and element
// errors never print the DOM.
const mediaType = "application/vnd.api+json";
const etagA = `"${"a".repeat(64)}"`;
const etagB = `"${"b".repeat(64)}"`;
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
];
const defaultElementError = getConfig().getElementError;

type InvitationFixture = {
  id: string;
  email: string;
  role?: "administrator" | "supervisor" | "mentor";
  status?: "pending" | "accepted" | "revoked" | "faulty";
  delivery_state?: "queued" | "delivered" | "ambiguous" | "failed";
  delivery_code?:
    | "invitation_delivery_timeout"
    | "invitation_delivery_ambiguous"
    | "invitation_delivery_rejected"
    | null;
  failure_code?: string;
  attempted?: boolean;
};

function inviteeAddress(): string {
  return `invitee-${crypto.randomUUID()}@example.test`;
}

function resource(invitation: InvitationFixture) {
  return {
    type: "invitations",
    id: invitation.id,
    attributes: {
      email: invitation.email,
      role: invitation.role ?? "supervisor",
      status: invitation.status ?? "pending",
      ...(invitation.failure_code === undefined
        ? {}
        : { failure_code: invitation.failure_code }),
      delivery_state: invitation.delivery_state ?? "queued",
      delivery_code: invitation.delivery_code ?? null,
      delivery_attempted_at: invitation.attempted
        ? "2026-09-27T09:00:00.000000Z"
        : null,
      created_at: "2026-09-27T08:00:00.000000Z",
      updated_at: "2026-09-27T09:00:00.000000Z",
    },
  };
}

function capabilities(administrator: boolean) {
  return HttpResponse.json(
    {
      data: {
        type: "account-capabilities",
        id: "account-id",
        attributes: {
          capabilities: actions.map((action) => ({
            action,
            available:
              action === "profile.view" ||
              (administrator && action === "accounts.administer"),
            scope: {
              global: administrator && action === "accounts.administer",
              course_ids: [],
              student_ids: [],
              course_students: [],
              own_resource: action === "profile.view",
            },
          })),
        },
      },
    },
    { headers: { "Content-Type": mediaType } },
  );
}

function errorResponse(status: number, code: string) {
  return HttpResponse.json(
    { errors: [{ status: String(status), code }] },
    { status, headers: { "Content-Type": mediaType } },
  );
}

type Backend = {
  administrator: boolean;
  invitations: Map<string, { value: InvitationFixture; etag: string }>;
  page: {
    items: string[];
    hasMore: boolean;
    prev?: string;
    next?: string;
  };
  ledger: string[];
  // Content-free observations of actual dispatches.
  creates: { role: unknown; sameEmail: boolean }[];
  resends: number;
  deletes: { ifMatch: string | null }[];
  lastCreateEmail: string | null;
  createResponse: () => Promise<Response> | Response;
  resendResponse: () => Promise<Response> | Response;
  deleteResponse: (id: string) => Promise<Response> | Response;
  // Runs after a GET of one invitation is answered (simulated concurrency).
  afterGet: (() => void) | null;
  logouts: number;
};

function backend(): Backend {
  const state: Backend = {
    administrator: true,
    invitations: new Map(),
    page: { items: [], hasMore: false },
    ledger: [],
    creates: [],
    resends: 0,
    deletes: [],
    lastCreateEmail: null,
    createResponse: () => new HttpResponse(null, { status: 500 }),
    resendResponse: () => new HttpResponse(null, { status: 204 }),
    deleteResponse: (id) =>
      HttpResponse.json(
        {
          data: {
            type: "invitation-deletions",
            id: "invd_1",
            attributes: { invitation_id: id, effect: "revoked" },
          },
        },
        { headers: { "Content-Type": mediaType } },
      ),
    afterGet: null,
    logouts: 0,
  };
  let anonymous = false;
  server.use(
    http.get("/api/v1/auth/session", () => {
      state.ledger.push("session");
      return anonymous
        ? HttpResponse.json(
            { data: null, meta: { stage: "anonymous" } },
            { headers: { "Content-Type": mediaType } },
          )
        : authenticatedSessionResponse();
    }),
    http.get("/api/v1/users/me/capabilities", () => {
      state.ledger.push("capabilities");
      return capabilities(state.administrator);
    }),
    http.get("/api/v1/invitations", ({ request }) => {
      const url = new URL(request.url);
      state.ledger.push(`list:${url.searchParams.get("page[offset]")}`);
      return HttpResponse.json(
        {
          data: state.page.items.map((id) =>
            resource(state.invitations.get(id)!.value),
          ),
          meta: { has_more: state.page.hasMore },
          ...(state.page.prev || state.page.next
            ? {
                links: {
                  ...(state.page.prev ? { prev: state.page.prev } : {}),
                  ...(state.page.next ? { next: state.page.next } : {}),
                },
              }
            : {}),
        },
        { headers: { "Content-Type": mediaType } },
      );
    }),
    http.get("/api/v1/invitations/:id", ({ params }) => {
      state.ledger.push("get");
      const entry = state.invitations.get(String(params.id));
      if (entry === undefined)
        return errorResponse(404, "invitation_not_found");
      const response = HttpResponse.json(
        { data: resource(entry.value) },
        { headers: { "Content-Type": mediaType, ETag: entry.etag } },
      );
      const after = state.afterGet;
      state.afterGet = null;
      after?.();
      return response;
    }),
    http.post("/api/v1/invitations", async ({ request }) => {
      state.ledger.push("create");
      const body = (await request.json()) as {
        data: { attributes: { email: string; role: unknown } };
      };
      state.creates.push({
        role: body.data.attributes.role,
        sameEmail: body.data.attributes.email === state.lastCreateEmail,
      });
      return state.createResponse();
    }),
    http.post("/api/v1/invitations/:id/resends", () => {
      state.ledger.push("resend");
      state.resends++;
      return state.resendResponse();
    }),
    http.delete("/api/v1/invitations/:id", ({ request, params }) => {
      state.ledger.push("delete");
      state.deletes.push({ ifMatch: request.headers.get("If-Match") });
      return state.deleteResponse(String(params.id));
    }),
    http.post("/api/v1/auth/logout", () => {
      state.logouts++;
      anonymous = true;
      return new HttpResponse(null, { status: 204 });
    }),
  );
  return state;
}

function add(state: Backend, invitation: InvitationFixture, etag = etagA) {
  state.invitations.set(invitation.id, { value: invitation, etag });
}

function invitationEntry(state: Backend, id: string) {
  const entry = state.invitations.get(id);
  if (entry === undefined)
    throw new Error("The invitation fixture is missing.");
  return entry;
}

function start(at: string) {
  window.history.replaceState(null, "", at);
  document.cookie = `mia_csrf=${crypto.randomUUID()}; Path=/`;
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

async function heading(name: string) {
  await waitFor(() =>
    expect(screen.getByRole("heading", { level: 1, name })).toHaveFocus(),
  );
  // The lazily loaded route content has arrived.
  await waitFor(() =>
    expect(screen.queryByText("Loading this page…")).toBeNull(),
  );
}

function liveText(): string {
  return Array.from(document.querySelectorAll("[aria-live]"))
    .map((region) => region.textContent ?? "")
    .join(" ");
}

async function disclosure(status: number, body: string) {
  const details = screen.getByRole("button", {
    name: "Technical details",
  });
  expect(details).toHaveAttribute("aria-expanded", "false");
  expect(document.querySelector("main pre")).toBeNull();
  expect(liveText().includes(body)).toBe(false);
  await userEvent.setup().click(details);
  expect(document.querySelector("main pre")?.textContent === body).toBe(true);
  expect(screen.getByText(`HTTP status: ${status}`)).toBeVisible();
  expect(document.querySelector("main pre script")).toBeNull();
  expect(liveText().includes(body)).toBe(false);
  await userEvent.setup().click(details);
}

function boundedFailure(status: number, code: string) {
  const body = JSON.stringify({
    errors: [
      {
        status: String(status),
        code,
        detail: `<script>${crypto.randomUUID()}</script>`,
      },
    ],
  });
  return {
    body,
    response: () =>
      new HttpResponse(body, {
        status,
        headers: { "Content-Type": mediaType },
      }),
  };
}

async function unavailableWithoutIdentity(address: string) {
  await heading("Not available");
  expect(document.title).toBe("Not available | MIA");
  expect(document.body.textContent?.includes(address)).toBe(false);
  expect(screen.queryByRole("navigation")).toBeNull();
  expect(screen.queryByRole("table")).toBeNull();
  expect(screen.queryByRole("definition")).toBeNull();
  expect(screen.queryByRole("button", { name: "Refresh" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Check again" })).toBeNull();
  expect(screen.queryByRole("link", { name: "Resend invitation" })).toBeNull();
  expect(screen.queryByRole("link", { name: "Revoke invitation" })).toBeNull();
  expectNoAddressOutsideContent(address);
}

// Protected identity never reaches the URL, history state, title, or a live region.
function expectNoAddressOutsideContent(address: string) {
  expect(window.location.href.includes(address)).toBe(false);
  expect(JSON.stringify(window.history.state ?? null).includes(address)).toBe(
    false,
  );
  expect(document.title.includes(address)).toBe(false);
  expect(liveText().includes(address)).toBe(false);
}

describe("administrator invitation management", () => {
  // As in the bootstrap: installed before any router listens to `popstate`.
  let releaseTraversalGate: () => void = () => {};
  beforeAll(() => {
    releaseTraversalGate = holdGuardedHistoryTraversals(window);
  });
  afterAll(() => releaseTraversalGate());
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

  it("admits the list after the session, capability, and page reads and links it from the shell", async () => {
    const state = backend();
    add(state, { id: "inv_1", email: inviteeAddress() });
    state.page.items = ["inv_1"];
    start("/");
    await heading("Home");
    const navigation = screen.getByRole("navigation", { name: "Application" });
    await userEvent
      .setup()
      .click(within(navigation).getByRole("link", { name: "Invitations" }));
    await heading("Invitations");
    expect(document.title).toBe("Invitations | MIA");
    expect(state.ledger).toEqual([
      "session",
      "capabilities",
      "session",
      "capabilities",
      "list:0",
    ]);
  });

  it("withholds the shell and title until the page read completes", async () => {
    const state = backend();
    let release: () => void = () => {};
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      http.get("/api/v1/invitations", async () => {
        state.ledger.push("list:held");
        await held;
        return HttpResponse.json(
          { data: [], meta: { has_more: false } },
          { headers: { "Content-Type": mediaType } },
        );
      }),
    );
    start("/admin/invitations");
    await heading("Checking access");
    await waitFor(() => expect(state.ledger).toContain("list:held"));
    expect(screen.queryByRole("navigation")).toBeNull();
    expect(document.title).not.toContain("Invitations");
    release();
    await heading("Invitations");
    expect(screen.getByText("No invitations")).toBeVisible();
    expect(
      screen.getAllByRole("link", { name: "Invite a supervisor" }),
    ).toHaveLength(2);
  });

  it.each([
    "/admin/invitations",
    "/admin/invitations/new",
    "/admin/invitations/inv_1",
  ])(
    "routes a non-administrator from %s to Home without any invitation request",
    async (path) => {
      const state = backend();
      state.administrator = false;
      start(path);
      await heading("Home");
      expect(window.location.pathname).toBe("/");
      expect(
        state.ledger.some((entry) => !/^(session|capabilities)$/u.test(entry)),
      ).toBe(false);
      expect(screen.queryByRole("link", { name: "Invitations" })).toBeNull();
    },
  );

  it("shows lifecycle and delivery as separate states with only a detail link per row", async () => {
    const state = backend();
    const fixtures: InvitationFixture[] = [
      { id: "inv_q", email: inviteeAddress() },
      {
        id: "inv_a",
        email: inviteeAddress(),
        delivery_state: "ambiguous",
        delivery_code: "invitation_delivery_timeout",
        attempted: true,
      },
      {
        id: "inv_f",
        email: inviteeAddress(),
        status: "faulty",
        delivery_state: "failed",
        delivery_code: "invitation_delivery_rejected",
        failure_code: "invitation_delivery_rejected",
        attempted: true,
      },
      {
        id: "inv_c",
        email: inviteeAddress(),
        role: "mentor",
        status: "accepted",
        delivery_state: "delivered",
        attempted: true,
      },
    ];
    for (const fixture of fixtures) add(state, fixture);
    state.page.items = fixtures.map((fixture) => fixture.id);
    start("/admin/invitations");
    await heading("Invitations");
    const table = screen.getByRole("table", { name: "Invitations" });
    const rows = within(table).getAllByRole("row").slice(1);
    expect(
      rows.map((row) => within(row).getAllByRole("cell")[1]?.textContent),
    ).toEqual(["Pending", "Pending", "Faulty", "Accepted"]);
    expect(
      rows.map((row) => within(row).getAllByRole("cell")[2]?.textContent),
    ).toEqual([
      "Delivery queued",
      "Delivery unconfirmed",
      "Delivery failed",
      "Accepted by mail server",
    ]);
    for (const row of rows) {
      expect(within(row).getAllByRole("link")).toHaveLength(1);
      expect(within(row).queryByRole("button")).toBeNull();
    }
    expect(within(rows[3]!).getAllByRole("cell")[0]).toHaveTextContent(
      "Mentor",
    );
  });

  it("follows the canonical next link and rejects a foreign one", async () => {
    const state = backend();
    add(state, { id: "inv_1", email: inviteeAddress() });
    state.page = {
      items: ["inv_1"],
      hasMore: true,
      next: "/api/v1/invitations?page%5Blimit%5D=25&page%5Boffset%5D=25",
    };
    start("/admin/invitations");
    await heading("Invitations");
    state.page = {
      items: [],
      hasMore: false,
      prev: "/api/v1/invitations?page%5Blimit%5D=25&page%5Boffset%5D=0",
    };
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { level: 2, name: "Invitation list" }),
      ).toHaveFocus(),
    );
    expect(state.ledger.at(-1)).toBe("list:25");
    expect(screen.getByText("No invitations on this page")).toBeVisible();
    expect(screen.getByRole("button", { name: "Previous" })).toBeVisible();
  });

  it("treats a pagination link outside the invitation collection as a failed read", async () => {
    const state = backend();
    state.page = {
      items: [],
      hasMore: true,
      next: "/api/v1/users?page%5Blimit%5D=25&page%5Boffset%5D=25",
    };
    start("/admin/invitations");
    await heading("Unable to check access");
    expect(screen.queryByRole("navigation")).toBeNull();
    expect(screen.getByRole("link", { name: "Back to Home" })).toBeVisible();
  });

  it("uses one fixed unavailable result for a missing and an unauthorized invitation", async () => {
    const state = backend();
    const observe = async (path: string) => {
      const view = start(path);
      await heading("Not available");
      const main = screen.getByRole("main");
      const snapshot = {
        title: document.title,
        text: main.textContent,
        links: within(main)
          .getAllByRole("link")
          .map((link) => [link.textContent, link.getAttribute("href")]),
        buttons: within(main)
          .getAllByRole("button")
          .map((button) => button.textContent),
      };
      view.unmount();
      return snapshot;
    };
    const missing = await observe("/admin/invitations/inv_missing");
    server.use(
      http.get("/api/v1/invitations/:id", () =>
        errorResponse(403, "invitation_role_unauthorized"),
      ),
    );
    const denied = await observe("/admin/invitations/inv_other");
    expect(denied).toEqual(missing);
    expect(screen.queryByRole("navigation")).toBeNull();
    expect(state.ledger.filter((entry) => entry === "get")).toHaveLength(1);
  });

  it.each([404, 403])(
    "tears down a denied direct detail read (%i) and retains only collapsed disclosure",
    async (status) => {
      backend();
      const failure = boundedFailure(
        status,
        status === 404
          ? "invitation_not_found"
          : "invitation_role_unauthorized",
      );
      server.use(http.get("/api/v1/invitations/:id", failure.response));
      start("/admin/invitations/inv_p");
      await unavailableWithoutIdentity(inviteeAddress());
      await disclosure(status, failure.body);
    },
  );

  it.each(["list", "detail"] as const)(
    "clears an authorized %s after a hidden Refresh denial",
    async (surface) => {
      const state = backend();
      const address = inviteeAddress();
      add(state, { id: "inv_p", email: address });
      state.page.items = ["inv_p"];
      start(
        surface === "list" ? "/admin/invitations" : "/admin/invitations/inv_p",
      );
      await heading(surface === "list" ? "Invitations" : "Invitation details");
      const status = surface === "list" ? 403 : 404;
      const failure = boundedFailure(
        status,
        surface === "list"
          ? "invitation_list_unauthorized"
          : "invitation_not_found",
      );
      let reads = 0;
      server.use(
        http.get(
          surface === "list"
            ? "/api/v1/invitations"
            : "/api/v1/invitations/:id",
          () => {
            reads++;
            return failure.response();
          },
        ),
      );
      await userEvent
        .setup()
        .click(screen.getByRole("button", { name: "Refresh" }));
      await unavailableWithoutIdentity(address);
      await disclosure(status, failure.body);
      expect(reads).toBe(1);
      expect(state.creates).toHaveLength(0);
      expect(state.resends).toBe(0);
      expect(state.deletes).toHaveLength(0);
    },
  );

  it.each(["create", "resend", "revoke"] as const)(
    "clears the target after denied %s without replay",
    async (operation) => {
      const state = backend();
      const address = inviteeAddress();
      add(state, { id: "inv_p", email: address });
      const failure = boundedFailure(403, "invitation_role_unauthorized");
      state.createResponse = failure.response;
      state.resendResponse = failure.response;
      state.deleteResponse = failure.response;
      start(
        operation === "create"
          ? "/admin/invitations/new"
          : `/admin/invitations/inv_p/${operation}`,
      );
      await heading(
        operation === "create"
          ? "Invite a supervisor"
          : operation === "resend"
            ? "Resend invitation"
            : "Revoke invitation",
      );
      const user = userEvent.setup();
      if (operation === "create")
        await user.type(
          screen.getByLabelText("Supervisor’s email address"),
          address,
        );
      await user.click(
        screen.getByRole("button", {
          name:
            operation === "create"
              ? "Send invitation"
              : operation === "resend"
                ? "Resend invitation"
                : "Revoke invitation",
        }),
      );
      await unavailableWithoutIdentity(address);
      expect(screen.queryByLabelText("Supervisor’s email address")).toBeNull();
      await disclosure(403, failure.body);
      expect(state.creates.length + state.resends + state.deletes.length).toBe(
        1,
      );
    },
  );

  it("clears an unknown revoke target on hidden reconciliation without a success claim or replay", async () => {
    const state = backend();
    const address = inviteeAddress();
    add(state, { id: "inv_p", email: address });
    state.deleteResponse = () => new HttpResponse(null, { status: 502 });
    start("/admin/invitations/inv_p/revoke");
    await heading("Revoke invitation");
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Revoke invitation" }));
    await screen.findByRole("heading", { name: "Revocation not confirmed" });
    const failure = boundedFailure(404, "invitation_not_found");
    server.use(http.get("/api/v1/invitations/:id", failure.response));
    await user.click(
      screen.getByRole("button", { name: "Check current state" }),
    );
    await unavailableWithoutIdentity(address);
    await disclosure(404, failure.body);
    expect(screen.queryByText("Invitation revoked")).toBeNull();
    expect(state.deletes).toHaveLength(1);
  });

  it.each([409, 422])(
    "keeps exact collapsed create rejection (%i) beside field feedback until teardown",
    async (status) => {
      const state = backend();
      const failure = boundedFailure(
        status,
        status === 409 ? "invitation_email_registered" : "auth_invalid_request",
      );
      state.createResponse = failure.response;
      start("/admin/invitations/new");
      await heading("Invite a supervisor");
      const user = userEvent.setup();
      await user.type(
        screen.getByLabelText("Supervisor’s email address"),
        inviteeAddress(),
      );
      await user.click(screen.getByRole("button", { name: "Send invitation" }));
      await waitFor(() =>
        expect(
          screen.getByLabelText("Supervisor’s email address"),
        ).toHaveAttribute("aria-invalid", "true"),
      );
      await disclosure(status, failure.body);
      expect(state.creates).toHaveLength(1);
      act(() => window.dispatchEvent(new Event("focus")));
      await waitFor(() =>
        expect(
          screen.queryByRole("button", { name: "Technical details" }),
        ).toBeNull(),
      );
      expect(document.body.textContent?.includes(failure.body)).toBe(false);
    },
  );

  it.each([422, 412, 428])(
    "preserves original rejection (%i) while and after reconciling without replay",
    async (status) => {
      const state = backend();
      const operation = status === 422 ? "resend" : "revoke";
      add(state, { id: "inv_p", email: inviteeAddress() });
      const failure = boundedFailure(
        status,
        status === 422
          ? "invitation_invalid"
          : status === 412
            ? "invitation_precondition_failed"
            : "invitation_precondition_required",
      );
      state.resendResponse = failure.response;
      state.deleteResponse = failure.response;
      start(`/admin/invitations/inv_p/${operation}`);
      await heading(
        operation === "resend" ? "Resend invitation" : "Revoke invitation",
      );
      let release: () => void = () => {};
      const held = new Promise<void>((resolve) => {
        release = resolve;
      });
      let reads = 0;
      server.use(
        http.get("/api/v1/invitations/:id", async () => {
          reads++;
          if (operation === "resend" || reads === 2) await held;
          return HttpResponse.json(
            { data: resource(invitationEntry(state, "inv_p").value) },
            { headers: { "Content-Type": mediaType, ETag: etagB } },
          );
        }),
      );
      // Revoke must still match the original reviewed ETag before dispatch.
      if (operation === "revoke") {
        server.use(
          http.get("/api/v1/invitations/:id", async () => {
            reads++;
            if (reads === 2) await held;
            return HttpResponse.json(
              { data: resource(invitationEntry(state, "inv_p").value) },
              {
                headers: {
                  "Content-Type": mediaType,
                  ETag: reads === 1 ? etagA : etagB,
                },
              },
            );
          }),
        );
      }
      await userEvent.setup().click(
        screen.getByRole("button", {
          name:
            operation === "resend" ? "Resend invitation" : "Revoke invitation",
        }),
      );
      await screen.findByRole("button", { name: "Technical details" });
      await disclosure(status, failure.body);
      await act(async () => {
        release();
        await delay(10);
      });
      await screen.findByRole("heading", {
        name:
          operation === "resend"
            ? "Invitation not resent"
            : "This invitation changed",
      });
      await disclosure(status, failure.body);
      expect(state.resends + state.deletes.length).toBe(1);
    },
  );

  it("preserves a revoke eligibility rejection after its fresh state read", async () => {
    const state = backend();
    add(state, { id: "inv_p", email: inviteeAddress() });
    const failure = boundedFailure(422, "invitation_invalid");
    state.deleteResponse = failure.response;
    start("/admin/invitations/inv_p/revoke");
    await heading("Revoke invitation");
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Revoke invitation" }));
    await screen.findByRole("heading", { name: "This invitation changed" });
    await disclosure(422, failure.body);
    expect(state.deletes).toHaveLength(1);
  });

  it.each(["pending", "accepted", "revoked"] as const)(
    "never claims terminal ambiguous invitations are resendable (%s)",
    async (status) => {
      const state = backend();
      add(state, {
        id: "inv_p",
        email: inviteeAddress(),
        status,
        delivery_state: "ambiguous",
        delivery_code: "invitation_delivery_timeout",
      });
      start("/admin/invitations/inv_p");
      await heading("Invitation details");
      expect(screen.getByText("Delivery unconfirmed")).toBeVisible();
      expect(
        screen.queryByText(/The invitation is still usable/u) !== null,
      ).toBe(status === "pending");
      expect(
        screen.queryByRole("link", { name: "Resend invitation" }) !== null,
      ).toBe(status === "pending");
    },
  );

  it("shows retained ambiguous delivery after definitive revoke on detail without resend guidance", async () => {
    const state = backend();
    add(state, {
      id: "inv_p",
      email: inviteeAddress(),
      delivery_state: "ambiguous",
      delivery_code: "invitation_delivery_timeout",
    });
    const response = state.deleteResponse;
    state.deleteResponse = (id) => {
      invitationEntry(state, id).value.status = "revoked";
      return response(id);
    };
    start("/admin/invitations/inv_p/revoke");
    await heading("Revoke invitation");
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Revoke invitation" }));
    await screen.findByRole("heading", { name: "Invitation revoked" });
    await user.click(screen.getByRole("link", { name: "View invitation" }));
    await heading("Invitation details");
    expect(screen.getByText("Revoked", { exact: true })).toBeVisible();
    expect(screen.getByText("Delivery unconfirmed")).toBeVisible();
    expect(screen.queryByText(/The invitation is still usable/u)).toBeNull();
    expect(
      screen.queryByRole("link", { name: "Resend invitation" }),
    ).toBeNull();
    expect(state.deletes).toHaveLength(1);
  });

  it("creates one supervisor invitation and shows its persisted queued state without delivery or account claims", async () => {
    const state = backend();
    const address = inviteeAddress();
    state.lastCreateEmail = address;
    state.createResponse = () =>
      HttpResponse.json(
        { data: resource({ id: "inv_new", email: address }) },
        {
          status: 201,
          headers: { "Content-Type": mediaType, ETag: etagA },
        },
      );
    start("/admin/invitations/new");
    await heading("Invite a supervisor");
    expect(document.title).toBe("Create invitation | MIA");
    const user = userEvent.setup();
    await user.type(
      screen.getByLabelText("Supervisor’s email address"),
      address,
    );
    await user.click(screen.getByRole("button", { name: "Send invitation" }));
    const created = await screen.findByRole("heading", {
      level: 2,
      name: "Invitation created",
    });
    await waitFor(() => expect(created).toHaveFocus());
    expect(state.creates).toEqual([{ role: "supervisor", sameEmail: true }]);
    expect(
      screen.getByText(/has not confirmed that the email was sent/u),
    ).toBeVisible();
    expect(screen.getByText("Delivery queued")).toBeVisible();
    expect(screen.getByText("Pending")).toBeVisible();
    expect(
      screen.getByRole("link", { name: "View invitation" }),
    ).toHaveAttribute("href", "/admin/invitations/inv_new");
    expect(screen.queryByRole("combobox")).toBeNull();
    expect(screen.queryByRole("radiogroup")).toBeNull();
    expectNoAddressOutsideContent(address);
  });

  it.each([
    [
      409,
      "invitation_email_registered",
      /already has a MIA account or a pending invitation/u,
    ],
    [422, "auth_invalid_request", /did not accept this email address/u],
  ] as const)(
    "keeps the address for correction after a %i rejection",
    async (status, code, message) => {
      const state = backend();
      const address = inviteeAddress();
      state.createResponse = () => errorResponse(status, code);
      start("/admin/invitations/new");
      await heading("Invite a supervisor");
      const user = userEvent.setup();
      const field = screen.getByLabelText("Supervisor’s email address");
      await user.type(field, address);
      await user.click(screen.getByRole("button", { name: "Send invitation" }));
      await waitFor(() => expect(field).toHaveFocus());
      expect(field).toHaveAttribute("aria-invalid", "true");
      expect(field).toHaveAccessibleDescription(message);
      expect((field as HTMLInputElement).value === address).toBe(true);
      expect(state.creates).toHaveLength(1);
    },
  );

  it("reports an unknown create outcome without replay and offers only reconciliation or a new attempt", async () => {
    const state = backend();
    start("/admin/invitations/new");
    await heading("Invite a supervisor");
    const user = userEvent.setup();
    await user.type(
      screen.getByLabelText("Supervisor’s email address"),
      inviteeAddress(),
    );
    await user.click(screen.getByRole("button", { name: "Send invitation" }));
    const unknown = await screen.findByRole("heading", {
      level: 2,
      name: "Invitation not confirmed",
    });
    await waitFor(() => expect(unknown).toHaveFocus());
    expect(screen.queryByText("Invitation created")).toBeNull();
    expect(state.creates).toHaveLength(1);
    await user.click(screen.getByRole("link", { name: "Review invitations" }));
    await heading("Invitations");
    expect(state.creates).toHaveLength(1);
    expect(state.ledger.at(-1)).toBe("list:0");
  });

  it("Stop waiting ends the wait without another request and ignores the late response", async () => {
    const state = backend();
    let release: () => void = () => {};
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    const address = inviteeAddress();
    state.createResponse = async () => {
      await held;
      return HttpResponse.json(
        { data: resource({ id: "inv_late", email: address }) },
        { status: 201, headers: { "Content-Type": mediaType } },
      );
    };
    start("/admin/invitations/new");
    await heading("Invite a supervisor");
    const user = userEvent.setup();
    await user.type(
      screen.getByLabelText("Supervisor’s email address"),
      address,
    );
    await user.click(screen.getByRole("button", { name: "Send invitation" }));
    await user.click(
      await screen.findByRole("button", { name: "Stop waiting" }),
    );
    expect(
      await screen.findByRole("heading", { name: "Invitation not confirmed" }),
    ).toBeVisible();
    await act(async () => {
      release();
      await delay(20);
    });
    expect(screen.queryByText("Invitation created")).toBeNull();
    expect(state.creates).toHaveLength(1);
  });

  it("asks Stay or Discard before a dirty departure through the shell, a parent link, and history", async () => {
    const state = backend();
    start("/admin/invitations");
    await heading("Invitations");
    const user = userEvent.setup();
    await user.click(
      screen.getAllByRole("link", { name: "Invite a supervisor" })[0]!,
    );
    await heading("Invite a supervisor");
    const field = screen.getByLabelText("Supervisor’s email address");
    const address = inviteeAddress();
    await user.type(field, address);

    // Shell link: Stay keeps the value and returns focus to the field.
    const navigation = screen.getByRole("navigation", { name: "Application" });
    await user.click(within(navigation).getByRole("link", { name: "Home" }));
    let dialog = await screen.findByRole("dialog", {
      name: "Discard this invitation?",
    });
    expect(
      within(dialog).getByRole("button", { name: "Stay on this page" }),
    ).toHaveFocus();
    expect(dialog.textContent?.includes(address)).toBe(false);
    await user.click(
      within(dialog).getByRole("button", { name: "Stay on this page" }),
    );
    await waitFor(() => expect(field).toHaveFocus());
    expect(window.location.pathname).toBe("/admin/invitations/new");
    expect((field as HTMLInputElement).value === address).toBe(true);

    // Browser Back: held before the router sees it, then asked.
    const reads = state.ledger.length;
    await act(async () => {
      window.history.back();
      await delay(30);
    });
    dialog = await screen.findByRole("dialog", {
      name: "Discard this invitation?",
    });
    expect(window.location.pathname).toBe("/admin/invitations/new");
    expect(state.ledger.length).toBe(reads);
    await user.click(
      within(dialog).getByRole("button", { name: "Stay on this page" }),
    );
    expect(screen.getByLabelText("Supervisor’s email address")).toBeVisible();

    // Parent link: Discard leaves once and drops the value.
    await user.click(screen.getByRole("link", { name: "Back to invitations" }));
    dialog = await screen.findByRole("dialog", {
      name: "Discard this invitation?",
    });
    await user.click(
      within(dialog).getByRole("button", { name: "Discard and leave" }),
    );
    await heading("Invitations");
    expect(state.creates).toHaveLength(0);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("completes a held Back traversal after Discard", async () => {
    backend();
    start("/admin/invitations");
    await heading("Invitations");
    const user = userEvent.setup();
    await user.click(
      screen.getAllByRole("link", { name: "Invite a supervisor" })[0]!,
    );
    await heading("Invite a supervisor");
    await user.type(
      screen.getByLabelText("Supervisor’s email address"),
      inviteeAddress(),
    );
    await act(async () => {
      window.history.back();
      await delay(30);
    });
    const dialog = await screen.findByRole("dialog", {
      name: "Discard this invitation?",
    });
    await user.click(
      within(dialog).getByRole("button", { name: "Discard and leave" }),
    );
    await heading("Invitations");
    expect(window.location.pathname).toBe("/admin/invitations");
  });

  it("prompts on document unload only while the form holds unsent input", async () => {
    const state = backend();
    state.createResponse = () =>
      errorResponse(409, "invitation_email_registered");
    start("/admin/invitations/new");
    await heading("Invite a supervisor");
    const unload = () => {
      const event = new Event("beforeunload", { cancelable: true });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    };
    expect(unload()).toBe(false);
    const user = userEvent.setup();
    const field = screen.getByLabelText("Supervisor’s email address");
    await user.type(field, inviteeAddress());
    expect(unload()).toBe(true);
    await user.clear(field);
    expect(unload()).toBe(false);
  });

  it("lets Sign out discard dirty input without asking", async () => {
    const state = backend();
    start("/admin/invitations/new");
    await heading("Invite a supervisor");
    const user = userEvent.setup();
    await user.type(
      screen.getByLabelText("Supervisor’s email address"),
      inviteeAddress(),
    );
    const navigation = screen.getByRole("navigation", { name: "Application" });
    await user.click(
      within(navigation).getByRole("button", { name: "Sign out" }),
    );
    await waitFor(() => expect(state.logouts).toBe(1));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByLabelText("Supervisor’s email address")).toBeNull();
  });

  it("removes the open dialog and dirty input under a lifecycle shield", async () => {
    backend();
    start("/admin/invitations/new");
    await heading("Invite a supervisor");
    const user = userEvent.setup();
    await user.type(
      screen.getByLabelText("Supervisor’s email address"),
      inviteeAddress(),
    );
    await user.click(screen.getByRole("link", { name: "Back to invitations" }));
    await screen.findByRole("dialog", { name: "Discard this invitation?" });
    act(() => window.dispatchEvent(new Event("focus")));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.queryByLabelText("Supervisor’s email address")).toBeNull();
    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    await user.click(screen.getByRole("button", { name: "Refresh" }));
    await heading("Invite a supervisor");
    expect(
      (screen.getByLabelText("Supervisor’s email address") as HTMLInputElement)
        .value,
    ).toBe("");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("offers resend and revoke only for a pending invitation and refreshes explicitly", async () => {
    const state = backend();
    add(state, {
      id: "inv_f",
      email: inviteeAddress(),
      status: "faulty",
      delivery_state: "failed",
      delivery_code: "invitation_delivery_rejected",
      failure_code: "invitation_delivery_rejected",
      attempted: true,
    });
    add(state, { id: "inv_p", email: inviteeAddress() });
    const faulty = start("/admin/invitations/inv_f");
    await heading("Invitation details");
    expect(
      screen.queryByRole("link", { name: "Resend invitation" }),
    ).toBeNull();
    expect(
      screen.queryByRole("link", { name: "Revoke invitation" }),
    ).toBeNull();
    expect(screen.getByText(/create a new invitation/u)).toBeVisible();
    expect(screen.getByText("Failure code")).toBeVisible();
    faulty.unmount();

    start("/admin/invitations/inv_p");
    await heading("Invitation details");
    expect(
      screen.getByRole("link", { name: "Resend invitation" }),
    ).toHaveAttribute("href", "/admin/invitations/inv_p/resend");
    expect(
      screen.getByRole("link", { name: "Revoke invitation" }),
    ).toHaveAttribute("href", "/admin/invitations/inv_p/revoke");
    state.invitations.get("inv_p")!.value.delivery_state = "ambiguous";
    state.invitations.get("inv_p")!.value.delivery_code =
      "invitation_delivery_timeout";
    const gets = state.ledger.filter((entry) => entry === "get").length;
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Refresh" }));
    await waitFor(() =>
      expect(screen.getByText("Delivery unconfirmed")).toBeVisible(),
    );
    expect(state.ledger.filter((entry) => entry === "get")).toHaveLength(
      gets + 1,
    );
    expect(screen.getByText(/did not answer in time/u)).toBeVisible();
    await waitFor(() =>
      expect(liveText()).toContain("The invitation state has changed."),
    );
  });

  it.each(["resend", "revoke"] as const)(
    "Stop waiting fences a late %s success without replay or automatic reconciliation",
    async (operation) => {
      const state = backend();
      add(state, { id: "inv_p", email: inviteeAddress() });
      let release: () => void = () => {};
      const held = new Promise<void>((resolve) => {
        release = resolve;
      });
      const success = state.deleteResponse;
      state.resendResponse = async () => {
        await held;
        return new HttpResponse(null, { status: 204 });
      };
      state.deleteResponse = async (id) => {
        await held;
        return success(id);
      };
      start(`/admin/invitations/inv_p/${operation}`);
      await heading(
        operation === "resend" ? "Resend invitation" : "Revoke invitation",
      );
      const user = userEvent.setup();
      await user.click(
        screen.getByRole("button", {
          name:
            operation === "resend" ? "Resend invitation" : "Revoke invitation",
        }),
      );
      await waitFor(() => expect(state.resends + state.deletes.length).toBe(1));
      await user.click(screen.getByRole("button", { name: "Stop waiting" }));
      const outcome = await screen.findByRole("heading", {
        name:
          operation === "resend"
            ? "Resend not confirmed"
            : "Revocation not confirmed",
      });
      await waitFor(() => expect(outcome).toHaveFocus());
      const ledger = [...state.ledger];
      await act(async () => {
        release();
        await delay(100);
      });
      expect(outcome).toBeVisible();
      expect(
        screen.queryByRole("heading", {
          name:
            operation === "resend" ? "Invitation resent" : "Invitation revoked",
        }),
      ).toBeNull();
      expect(state.ledger).toEqual(ledger);
      expect(state.resends + state.deletes.length).toBe(1);
      expect(
        screen.getByRole("button", { name: "Check current state" }),
      ).toBeVisible();
    },
  );

  it.each(["create", "resend", "revoke"] as const)(
    "a departed %s attempt cannot settle into its fresh route mount",
    async (operation) => {
      const state = backend();
      const address = inviteeAddress();
      add(state, { id: "inv_p", email: address });
      state.page.items = ["inv_p"];
      let release: () => void = () => {};
      const held = new Promise<void>((resolve) => {
        release = resolve;
      });
      const success = state.deleteResponse;
      state.createResponse = async () => {
        await held;
        return HttpResponse.json(
          { data: resource({ id: "inv_new", email: address }) },
          { status: 201, headers: { "Content-Type": mediaType } },
        );
      };
      state.resendResponse = async () => {
        await held;
        return new HttpResponse(null, { status: 204 });
      };
      state.deleteResponse = async (id) => {
        await held;
        return success(id);
      };
      const path =
        operation === "create"
          ? "/admin/invitations/new"
          : `/admin/invitations/inv_p/${operation}`;
      start(path);
      const title =
        operation === "create"
          ? "Invite a supervisor"
          : operation === "resend"
            ? "Resend invitation"
            : "Revoke invitation";
      await heading(title);
      const user = userEvent.setup();
      if (operation === "create")
        await user.type(
          screen.getByLabelText("Supervisor’s email address"),
          address,
        );
      await user.click(
        screen.getByRole("button", {
          name: operation === "create" ? "Send invitation" : title,
        }),
      );
      await waitFor(() =>
        expect(
          state.creates.length + state.resends + state.deletes.length,
        ).toBe(1),
      );
      // Departure unmounts the old route without pretending to cancel server work.
      await user.click(
        within(
          screen.getByRole("navigation", { name: "Application" }),
        ).getByRole("link", { name: "Home" }),
      );
      await heading("Home");
      await user.click(
        within(
          screen.getByRole("navigation", { name: "Application" }),
        ).getByRole("link", { name: "Invitations" }),
      );
      await heading("Invitations");
      if (operation === "create") {
        await user.click(
          within(screen.getByRole("main")).getByRole("link", {
            name: "Invite a supervisor",
          }),
        );
      } else {
        await user.click(within(screen.getByRole("table")).getByRole("link"));
        await heading("Invitation details");
        await user.click(screen.getByRole("link", { name: title }));
      }
      await heading(title);
      const ledger = [...state.ledger];
      await act(async () => {
        release();
        await delay(100);
      });
      expect(
        screen.queryByRole("heading", {
          name:
            operation === "create"
              ? "Invitation created"
              : operation === "resend"
                ? "Invitation resent"
                : "Invitation revoked",
        }),
      ).toBeNull();
      expect(state.ledger).toEqual(ledger);
      expect(state.creates.length + state.resends + state.deletes.length).toBe(
        1,
      );
      expect(liveText()).not.toContain(
        operation === "create"
          ? "Invitation created"
          : operation === "resend"
            ? "Invitation resent"
            : "Invitation revoked",
      );
      if (operation === "create")
        expect(
          (
            screen.getByLabelText(
              "Supervisor’s email address",
            ) as HTMLInputElement
          ).value === "",
        ).toBe(true);
    },
  );

  it("resends once and reconciles the delivery state with a fresh read", async () => {
    const state = backend();
    add(state, { id: "inv_p", email: inviteeAddress() });
    start("/admin/invitations/inv_p/resend");
    await heading("Resend invitation");
    state.resendResponse = () => {
      state.invitations.get("inv_p")!.value.delivery_state = "delivered";
      state.invitations.get("inv_p")!.value.attempted = true;
      return new HttpResponse(null, { status: 204 });
    };
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Resend invitation" }));
    const resent = await screen.findByRole("heading", {
      level: 2,
      name: "Invitation resent",
    });
    await waitFor(() => expect(resent).toHaveFocus());
    expect(state.resends).toBe(1);
    expect(state.ledger.slice(-2)).toEqual(["resend", "get"]);
    expect(screen.getByText("Accepted by mail server")).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Resend invitation" }),
    ).toBeNull();
  });

  it("never replays an unknown resend and reconciles only on request", async () => {
    const state = backend();
    add(state, { id: "inv_p", email: inviteeAddress() });
    state.resendResponse = () => new HttpResponse(null, { status: 502 });
    start("/admin/invitations/inv_p/resend");
    await heading("Resend invitation");
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Resend invitation" }));
    expect(
      await screen.findByRole("heading", { name: "Resend not confirmed" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Resend invitation" }),
    ).toBeNull();
    const gets = state.ledger.filter((entry) => entry === "get").length;
    await user.click(
      screen.getByRole("button", { name: "Check current state" }),
    );
    await waitFor(() =>
      expect(
        screen.getByText(
          /does not confirm whether the earlier resend happened/u,
        ),
      ).toBeVisible(),
    );
    expect(state.ledger.filter((entry) => entry === "get")).toHaveLength(
      gets + 1,
    );
    expect(state.resends).toBe(1);
    // A new explicit resend is available again for the still-pending invitation.
    expect(
      screen.getByRole("button", { name: "Resend invitation" }),
    ).toBeVisible();
  });

  it("rereads before revoking and binds the reviewed ETag", async () => {
    const state = backend();
    add(state, { id: "inv_p", email: inviteeAddress() }, etagA);
    start("/admin/invitations/inv_p/revoke");
    await heading("Revoke invitation");
    expect(state.ledger.filter((entry) => entry === "get")).toHaveLength(1);
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Revoke invitation" }));
    const revoked = await screen.findByRole("heading", {
      level: 2,
      name: "Invitation revoked",
    });
    await waitFor(() => expect(revoked).toHaveFocus());
    expect(state.ledger.slice(-2)).toEqual(["get", "delete"]);
    expect(state.deletes).toEqual([{ ifMatch: etagA }]);
  });

  it("sends nothing when the invitation changed after review and requires a new review", async () => {
    const state = backend();
    add(state, { id: "inv_p", email: inviteeAddress() }, etagA);
    start("/admin/invitations/inv_p/revoke");
    await heading("Revoke invitation");
    const entry = state.invitations.get("inv_p")!;
    entry.value.status = "faulty";
    entry.value.delivery_state = "failed";
    entry.etag = etagB;
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Revoke invitation" }));
    expect(
      await screen.findByRole("heading", { name: "This invitation changed" }),
    ).toBeVisible();
    expect(state.deletes).toHaveLength(0);
    expect(
      screen.queryByRole("button", { name: "Revoke invitation" }),
    ).toBeNull();
    expect(
      screen.getByText(/Only a pending invitation can be revoked/u),
    ).toBeVisible();
  });

  it("treats a stale precondition as changed state and confirms again with the new ETag only", async () => {
    const state = backend();
    add(state, { id: "inv_p", email: inviteeAddress() }, etagA);
    state.deleteResponse = () => {
      state.invitations.get("inv_p")!.etag = etagB;
      return errorResponse(412, "invitation_precondition_failed");
    };
    start("/admin/invitations/inv_p/revoke");
    await heading("Revoke invitation");
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Revoke invitation" }));
    expect(
      await screen.findByRole("heading", { name: "This invitation changed" }),
    ).toBeVisible();
    expect(state.deletes).toEqual([{ ifMatch: etagA }]);
    state.deleteResponse = (id) =>
      HttpResponse.json(
        {
          data: {
            type: "invitation-deletions",
            id: "invd_2",
            attributes: { invitation_id: id, effect: "revoked" },
          },
        },
        { headers: { "Content-Type": mediaType } },
      );
    await user.click(screen.getByRole("button", { name: "Revoke invitation" }));
    expect(
      await screen.findByRole("heading", { name: "Invitation revoked" }),
    ).toBeVisible();
    expect(state.deletes).toEqual([{ ifMatch: etagA }, { ifMatch: etagB }]);
  });

  it("never reports a deleted effect or a lost response as revocation", async () => {
    const state = backend();
    add(state, { id: "inv_p", email: inviteeAddress() }, etagA);
    state.deleteResponse = (id) =>
      HttpResponse.json(
        {
          data: {
            type: "invitation-deletions",
            id: "invd_3",
            attributes: { invitation_id: id, effect: "deleted" },
          },
        },
        { headers: { "Content-Type": mediaType } },
      );
    start("/admin/invitations/inv_p/revoke");
    await heading("Revoke invitation");
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Revoke invitation" }));
    expect(
      await screen.findByRole("heading", { name: "Revocation not confirmed" }),
    ).toBeVisible();
    expect(screen.queryByText("Invitation revoked")).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Revoke invitation" }),
    ).toBeNull();
    state.invitations.delete("inv_p");
    await user.click(
      screen.getByRole("button", { name: "Check current state" }),
    );
    await heading("Not available");
    expect(state.deletes).toHaveLength(1);
    expect(screen.queryByText("Invitation revoked")).toBeNull();
  });
});
