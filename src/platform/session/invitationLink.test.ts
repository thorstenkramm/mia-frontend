import { afterEach, describe, expect, it, vi } from "vitest";
import {
  expectFragmentRemoved,
  expectSameSecret,
  expectSecretAbsent,
} from "../../../test/secretAssertions";
import {
  ApiHttpError,
  ApiProtocolError,
  ApiTransportError,
} from "../api/client";
import type { AccountId, InvitationRole, MfaChallengeId } from "../api/entry";
import {
  captureInvitationLink,
  invitationPaths,
  invitationSurface,
  type InvitationLink,
} from "./invitationLink";
import { reloadOnLateFragment } from "./linkFragment";
import type {
  AuthenticationBootstrapState,
  PublicMutationResult,
} from "./sessionController";

// Fixture tokens are generated per test and never appear in a test name or a
// matcher argument; assertions compare them as labelled booleans only.

const signedOut: AuthenticationBootstrapState = { kind: "Signed out" };
const authenticated: AuthenticationBootstrapState = { kind: "Authenticated" };

function openLink(fragment: string, path = "/invitation") {
  window.history.replaceState(null, "", `${path}${fragment}`);
  return captureInvitationLink(window.location, window.history);
}

function captured(): { link: InvitationLink; token: string } {
  const token = crypto.randomUUID();
  return { link: openLink(`#token=${token}`), token };
}

function httpFailure(status: number, code: string, retryAfter?: string) {
  return new ApiHttpError(
    {
      status,
      body: JSON.stringify({ errors: [{ status: String(status), code }] }),
    },
    retryAfter ?? null,
  );
}

const fields = () => {
  const password = crypto.randomUUID();
  return {
    username: "example.mentor",
    password,
    passwordConfirmation: password,
    language: "en-US",
    country: "US",
    timeZone: "UTC",
  };
};

// Previews once and reports only whether, and with which token, a request left.
async function previewWith(
  link: InvitationLink,
  result: PublicMutationResult<InvitationRole>,
): Promise<readonly string[]> {
  const sent: string[] = [];
  await link.preview((token) => {
    sent.push(token);
    return Promise.resolve(result);
  });
  return sent;
}

async function acceptWith(
  link: InvitationLink,
  result: PublicMutationResult,
): Promise<readonly string[]> {
  const sent: string[] = [];
  await link.accept(fields(), (token) => {
    sent.push(token);
    return Promise.resolve(result);
  });
  return sent;
}

const ready: PublicMutationResult<InvitationRole> = {
  kind: "completed",
  value: "supervisor",
};

// A captured link that has completed its preview in an anonymous tab.
async function readyLink(): Promise<{ link: InvitationLink; token: string }> {
  const opened = captured();
  opened.link.observeSession(signedOut);
  await previewWith(opened.link, ready);
  return opened;
}

afterEach(() => {
  window.history.replaceState(null, "", "/");
});

const invalidFragments: Record<string, () => string> = {
  empty: () => "",
  "empty value": () => "#token=",
  uppercase: () => `#token=${crypto.randomUUID().toUpperCase()}`,
  duplicate: () => `#token=${crypto.randomUUID()}&token=${crypto.randomUUID()}`,
  "additional field": () => `#token=${crypto.randomUUID()}&extra=1`,
  "unknown field": () => `#other=${crypto.randomUUID()}`,
  "non-v4": () => "#token=00000000-0000-1000-8000-000000000000",
  "very long": () => `#token=${"a".repeat(4096)}`,
};

describe("invitation-link bootstrap capture", () => {
  it("removes a valid fragment before returning and keeps the token only in the flow", async () => {
    const { link, token } = captured();

    expectFragmentRemoved(window.location.hash, "Invitation link fragment");
    expect(window.location.pathname).toBe("/invitation");
    expectSecretAbsent(
      JSON.stringify(window.history.state) ?? "",
      token,
      "History state",
    );
    expect(link.getSnapshot().kind).toBe("Awaiting stage");
    link.observeSession(signedOut);
    const sent = await previewWith(link, ready);
    expect(sent.length).toBe(1);
    expectSameSecret(sent[0], token, "Preview request token");
  });

  it.each(Object.keys(invalidFragments))(
    "removes a %s fragment and renders only the uniform invalid result",
    async (label) => {
      const fragment = invalidFragments[label];
      if (fragment === undefined) throw new Error("Unknown fragment fixture.");
      const link = openLink(fragment());

      expectFragmentRemoved(window.location.hash, "Invitation link fragment");
      expect(link.getSnapshot().kind).toBe("Link invalid");
      expect(
        invitationSurface(signedOut, link.getSnapshot(), "/invitation"),
      ).toEqual({ route: "invitation", view: { kind: "invalid" } });
      expect((await previewWith(link, ready)).length).toBe(0);
    },
  );

  it("strips but never captures a fragment on the acceptance path", () => {
    const link = openLink(
      `#token=${crypto.randomUUID()}`,
      "/invitation/accept",
    );

    expectFragmentRemoved(window.location.hash, "Acceptance path fragment");
    expect(link.getSnapshot().kind).toBe("Link invalid");
    expect(
      invitationSurface(signedOut, link.getSnapshot(), "/invitation/accept"),
    ).toEqual({ route: "invitation", view: { kind: "invalid" } });
  });

  it("never reads or strips a fragment outside the invitation paths", () => {
    const token = crypto.randomUUID();
    const link = openLink(`#token=${token}`, "/login");

    expectSameSecret(window.location.hash, `#token=${token}`, "Login hash");
    expect(link.getSnapshot().kind).toBe("Link invalid");
  });
});

const previewOutcomes: Record<
  string,
  {
    readonly result: () => PublicMutationResult<InvitationRole>;
    readonly kind: string;
    readonly keepsToken: boolean;
  }
> = {
  "valid preview": {
    result: () => ready,
    kind: "Acceptance ready",
    keepsToken: true,
  },
  "invalid invitation": {
    result: () => ({
      kind: "rejected",
      failure: httpFailure(422, "invitation_invalid"),
    }),
    kind: "Link invalid",
    keepsToken: false,
  },
  throttled: {
    result: () => ({
      kind: "rejected",
      failure: httpFailure(429, "rate_limited", "17"),
    }),
    kind: "Preview throttled",
    keepsToken: true,
  },
  "CSRF rejection": {
    result: () => ({
      kind: "csrf-rejected",
      failure: httpFailure(403, "csrf_invalid"),
    }),
    kind: "Preview CSRF rejected",
    keepsToken: true,
  },
  "pre-dispatch failure": {
    result: () => ({
      kind: "not-sent",
      failure: new ApiTransportError(new Error("controlled")),
    }),
    kind: "Preview not sent",
    keepsToken: true,
  },
  ...Object.fromEntries(
    [400, 406, 413, 415].map((status) => [
      `generic ${status} rejection`,
      {
        result: (): PublicMutationResult<InvitationRole> => ({
          kind: "rejected",
          failure: httpFailure(status, "controlled"),
        }),
        kind: "Preview lost",
        keepsToken: false,
      },
    ]),
  ),
  "server error": {
    result: () => ({ kind: "unknown", failure: httpFailure(502, "upstream") }),
    kind: "Preview lost",
    keepsToken: false,
  },
  "transport loss": {
    result: () => ({
      kind: "unknown",
      failure: new ApiTransportError(new Error("controlled")),
    }),
    kind: "Preview lost",
    keepsToken: false,
  },
  "malformed success": {
    result: () => ({ kind: "unknown", failure: new ApiProtocolError() }),
    kind: "Preview lost",
    keepsToken: false,
  },
};

describe("invitation preview", () => {
  it.each(Object.keys(previewOutcomes))(
    "maps a %s and keeps the token only where a later request is allowed",
    async (label) => {
      const outcome = previewOutcomes[label];
      if (outcome === undefined) throw new Error("Unknown outcome fixture.");
      const { link, token } = captured();
      link.observeSession(signedOut);

      const sent = await previewWith(link, outcome.result());
      expect(sent.length).toBe(1);
      expectSameSecret(sent[0], token, "Preview request token");
      expect(link.getSnapshot().kind).toBe(outcome.kind);
      const later =
        outcome.kind === "Acceptance ready"
          ? await acceptWith(link, { kind: "completed", value: undefined })
          : await previewWith(link, ready);
      expect(later.length).toBe(outcome.keepsToken ? 1 : 0);
      if (outcome.keepsToken)
        expectSameSecret(later[0], token, "Later request token");
    },
  );

  it("sends the preview only for the link's activation or a deliberate retry", async () => {
    const { link } = captured();
    expect((await previewWith(link, ready)).length).toBe(0);
    link.observeSession(signedOut);
    expect(link.getSnapshot().kind).toBe("Preview due");
    const pending = link.preview(() => new Promise(() => undefined));
    expect(link.getSnapshot().kind).toBe("Checking");
    // A second activation while checking sends nothing.
    expect((await previewWith(link, ready)).length).toBe(0);
    void pending;
  });

  it("renders preview-phase states on /invitation and redirects the acceptance path there", () => {
    const { link } = captured();
    link.observeSession(signedOut);
    for (const path of invitationPaths)
      expect(invitationSurface(signedOut, link.getSnapshot(), path)).toEqual({
        route: "invitation",
        view: { kind: "checking" },
      });
  });

  it("shows the role on /invitation and the form on /invitation/accept", async () => {
    const { link } = await readyLink();
    expect(
      invitationSurface(signedOut, link.getSnapshot(), "/invitation"),
    ).toEqual({
      route: "invitation",
      view: { kind: "preview", role: "supervisor" },
    });
    expect(
      invitationSurface(signedOut, link.getSnapshot(), "/invitation/accept"),
    ).toEqual({
      route: "invitationAccept",
      view: {
        kind: "form",
        state: { kind: "Acceptance ready", role: "supervisor" },
      },
    });
  });
});

const acceptanceOutcomes: Record<
  string,
  {
    readonly result: () => PublicMutationResult;
    readonly kind: string;
    readonly keepsToken: boolean;
  }
> = {
  success: {
    result: () => ({ kind: "completed", value: undefined }),
    kind: "Acceptance succeeded",
    keepsToken: false,
  },
  ...Object.fromEntries(
    (
      [
        [409, "username_taken"],
        [422, "auth_invalid_password"],
        [422, "auth_invalid_request"],
        [429, "rate_limited"],
      ] as const
    ).map(([status, code]) => [
      `correctable ${status} ${code}`,
      {
        result: (): PublicMutationResult => ({
          kind: "rejected",
          failure: httpFailure(status, code),
        }),
        kind: "Acceptance ready",
        keepsToken: true,
      },
    ]),
  ),
  "CSRF rejection": {
    result: () => ({
      kind: "csrf-rejected",
      failure: httpFailure(403, "csrf_invalid"),
    }),
    kind: "Acceptance ready",
    keepsToken: true,
  },
  "pre-dispatch failure": {
    result: () => ({
      kind: "not-sent",
      failure: new ApiTransportError(new Error("controlled")),
    }),
    kind: "Acceptance pre-dispatch failure",
    keepsToken: true,
  },
  "email already registered": {
    result: () => ({
      kind: "rejected",
      failure: httpFailure(409, "invitation_email_registered"),
    }),
    kind: "Acceptance rejected",
    keepsToken: false,
  },
  "invalid invitation": {
    result: () => ({
      kind: "rejected",
      failure: httpFailure(422, "invitation_invalid"),
    }),
    kind: "Link invalid",
    keepsToken: false,
  },
  ...Object.fromEntries(
    [400, 406, 413, 415].map((status) => [
      `generic ${status} rejection`,
      {
        result: (): PublicMutationResult => ({
          kind: "rejected",
          failure: httpFailure(status, "controlled"),
        }),
        kind: "Acceptance rejected",
        keepsToken: false,
      },
    ]),
  ),
  "server error": {
    result: () => ({ kind: "unknown", failure: httpFailure(500, "internal") }),
    kind: "Acceptance outcome unknown",
    keepsToken: false,
  },
  "transport loss": {
    result: () => ({
      kind: "unknown",
      failure: new ApiTransportError(new Error("controlled")),
    }),
    kind: "Acceptance outcome unknown",
    keepsToken: false,
  },
  "malformed success": {
    result: () => ({ kind: "unknown", failure: new ApiProtocolError() }),
    kind: "Acceptance outcome unknown",
    keepsToken: false,
  },
};

describe("invitation acceptance", () => {
  it.each(Object.keys(acceptanceOutcomes))(
    "maps a %s and allows a deliberate resubmit only when the token is kept",
    async (label) => {
      const outcome = acceptanceOutcomes[label];
      if (outcome === undefined) throw new Error("Unknown outcome fixture.");
      const { link, token } = await readyLink();

      const sent = await acceptWith(link, outcome.result());
      expect(sent.length).toBe(1);
      expectSameSecret(sent[0], token, "Acceptance request token");
      expect(link.getSnapshot().kind).toBe(outcome.kind);
      const again = await acceptWith(link, {
        kind: "completed",
        value: undefined,
      });
      expect(again.length).toBe(outcome.keepsToken ? 1 : 0);
    },
  );

  it("records the specific correctable cause for the form status", async () => {
    const { link } = await readyLink();
    await acceptWith(link, {
      kind: "rejected",
      failure: httpFailure(409, "username_taken"),
    });
    const state = link.getSnapshot();
    expect(
      state.kind === "Acceptance ready" ? state.rejection?.kind : null,
    ).toBe("username taken");
  });

  it("enters outcome unknown on Stop waiting, drops the token, and ignores a late response", async () => {
    const { link } = await readyLink();
    let settle: (result: PublicMutationResult) => void = () => undefined;
    let isCurrent: () => boolean = () => true;
    const attempt: { signal: AbortSignal | null } = { signal: null };
    const pending = link.accept(
      fields(),
      (_token, _fields, current, signal) => {
        isCurrent = current;
        attempt.signal = signal;
        return new Promise((resolve) => {
          settle = resolve;
        });
      },
    );
    expect(link.getSnapshot().kind).toBe("Acceptance submitting");

    link.stopWaiting();
    expect(isCurrent()).toBe(false);
    expect(attempt.signal?.aborted).toBe(true);
    settle({ kind: "completed", value: undefined });
    await pending;

    expect(link.getSnapshot()).toEqual({
      kind: "Acceptance outcome unknown",
      error: null,
    });
    expect(
      (await acceptWith(link, { kind: "completed", value: undefined })).length,
    ).toBe(0);
  });

  it("drops the token on departure and on a stage change after the preview", async () => {
    const departed = (await readyLink()).link;
    departed.depart();
    expect(
      (await acceptWith(departed, { kind: "completed", value: undefined }))
        .length,
    ).toBe(0);

    const changed = (await readyLink()).link;
    changed.observeSession(authenticated);
    expect(changed.getSnapshot().kind).toBe("Link invalid");
    expect(
      invitationSurface(authenticated, changed.getSnapshot(), "/invitation"),
    ).toBeNull();
  });

  it("presents every invalid cause exactly like a missing token on either path", async () => {
    const rejectedPreview = captured().link;
    rejectedPreview.observeSession(signedOut);
    await previewWith(rejectedPreview, {
      kind: "rejected",
      failure: httpFailure(422, "invitation_invalid"),
    });
    const rejectedAcceptance = (await readyLink()).link;
    await acceptWith(rejectedAcceptance, {
      kind: "rejected",
      failure: httpFailure(422, "invitation_invalid"),
    });
    const missing = openLink("");
    const bare = openLink("", "/invitation/accept");

    // One fixed route, so the acceptance path redirects to `/invitation`.
    const view = (link: InvitationLink, path: string) =>
      invitationSurface(signedOut, link.getSnapshot(), path);
    for (const [link, path] of [
      [rejectedPreview, "/invitation"],
      [rejectedAcceptance, "/invitation/accept"],
      [missing, "/invitation"],
      [bare, "/invitation/accept"],
    ] as const)
      expect(view(link, path)).toEqual({
        route: "invitation",
        view: { kind: "invalid" },
      });
  });
});

// Branded fixture identities; the flow never reads them.
const mfaRequired: AuthenticationBootstrapState = {
  kind: "MFA required",
  accountId: "account-id" as AccountId,
  challengeId: "challenge-id" as MfaChallengeId,
  route: "challenge",
};
const passwordChange: AuthenticationBootstrapState = {
  kind: "Password change",
  accountId: "account-id" as AccountId,
};

describe("signed-in invitation link", () => {
  it.each([
    ["mfa", mfaRequired],
    ["password-change", passwordChange],
  ] as const)(
    "holds a %s-stage link behind the interstitial with no preview on either path",
    async (_stage, session) => {
      const { link, token } = captured();
      link.observeSession(session);

      expect(link.getSnapshot().kind).toBe("Signed-in interstitial");
      for (const path of invitationPaths)
        expect(
          invitationSurface(session, link.getSnapshot(), path)?.view,
        ).toEqual({ kind: "interstitial", signingOut: false });
      expect((await previewWith(link, ready)).length).toBe(0);

      link.beginSignOut();
      link.observeSession({ kind: "Logout start" });
      link.observeSession({ kind: "Logout confirmed" });
      const sent = await previewWith(link, ready);
      expect(sent.length).toBe(1);
      expectSameSecret(sent[0], token, "Preview request token");
    },
  );

  it("holds the link behind the interstitial until confirmed logout, then previews", async () => {
    const { link, token } = captured();
    expect(
      invitationSurface(authenticated, link.getSnapshot(), "/invitation"),
    ).toEqual({
      route: "invitation",
      view: { kind: "interstitial", signingOut: false },
    });
    link.observeSession(authenticated);
    expect((await previewWith(link, ready)).length).toBe(0);
    link.beginSignOut();
    for (const kind of [
      "Logout start",
      "Logout quiescing",
      "Logout dispatch",
      "Logout confirming",
    ] as const) {
      link.observeSession({ kind });
      expect(
        invitationSurface({ kind }, link.getSnapshot(), "/invitation"),
      ).toEqual({
        route: "invitation",
        view: { kind: "interstitial", signingOut: true },
      });
    }
    link.observeSession({ kind: "Logout confirmed" });
    expect(link.getSnapshot().kind).toBe("Preview due");
    const sent = await previewWith(link, ready);
    expect(sent.length).toBe(1);
    expectSameSecret(sent[0], token, "Preview request token");
  });

  it.each(["Logout unconfirmed", "Logout reconciliation needed"] as const)(
    "drops the token when the interstitial logout ends %s",
    async (kind) => {
      const { link } = captured();
      link.observeSession(authenticated);
      link.beginSignOut();
      link.observeSession({ kind: "Logout start" });
      link.observeSession({ kind });

      expect(
        invitationSurface({ kind }, link.getSnapshot(), "/invitation"),
      ).toBeNull();
      link.observeSession({ kind: "Logout confirmed" });
      expect((await previewWith(link, ready)).length).toBe(0);
    },
  );

  it("drops the token on Go back so ordinary stage dispatch applies", () => {
    const { link } = captured();
    link.observeSession(authenticated);
    link.goBack();

    expect(link.getSnapshot().kind).toBe("Link invalid");
    expect(
      invitationSurface(authenticated, link.getSnapshot(), "/invitation"),
    ).toBeNull();
  });
});

describe("late invitation fragments", () => {
  it("reloads for a fragment added on either invitation path", () => {
    const target = new EventTarget();
    const location = { pathname: "/invitation", hash: "", reload: vi.fn() };
    const document = { getElementById: () => null };
    const window = Object.assign(target, {
      location,
      document,
    }) as unknown as Window;
    reloadOnLateFragment(window, invitationPaths);

    location.hash = `#token=${crypto.randomUUID()}`;
    target.dispatchEvent(new Event("hashchange"));
    location.pathname = "/invitation/accept";
    target.dispatchEvent(new Event("hashchange"));
    location.pathname = "/login";
    target.dispatchEvent(new Event("hashchange"));

    expect(location.reload).toHaveBeenCalledTimes(2);
  });
});
