import { afterEach, describe, expect, it, vi } from "vitest";
import {
  expectFragmentRemoved,
  expectSameSecret,
  expectSecretAbsent,
} from "../../../test/secretAssertions";
import { ApiHttpError, ApiTransportError } from "../api/client";
import { reloadOnLateFragment } from "./linkFragment";
import {
  capturePasswordResetLink,
  passwordResetPath,
  passwordResetSurface,
  type PasswordResetLink,
} from "./passwordResetLink";
import type {
  AuthenticationBootstrapState,
  PublicMutationResult,
} from "./sessionController";

// Fixture tokens are generated per test and never appear in a test name or a
// matcher argument; assertions compare them as labelled booleans only.

const signedOut: AuthenticationBootstrapState = { kind: "Signed out" };
const authenticated: AuthenticationBootstrapState = { kind: "Authenticated" };

function openLink(fragment: string, path = "/password-reset") {
  window.history.replaceState(null, "", `${path}${fragment}`);
  return capturePasswordResetLink(window.location, window.history);
}

function captured(): { link: PasswordResetLink; token: string } {
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

// Submits once and reports only whether, and with which token, a request left.
async function submitWith(
  link: PasswordResetLink,
  result: PublicMutationResult,
): Promise<readonly string[]> {
  const sentTokens: string[] = [];
  await link.submit("password-one", "password-one", (token) => {
    sentTokens.push(token);
    return Promise.resolve(result);
  });
  return sentTokens;
}

async function expectSentOnce(
  link: PasswordResetLink,
  token: string,
  result: PublicMutationResult,
): Promise<void> {
  const sent = await submitWith(link, result);
  expect(sent.length).toBe(1);
  expectSameSecret(sent[0], token, "Reset request token");
}

async function expectNothingSent(link: PasswordResetLink): Promise<void> {
  expect(
    (await submitWith(link, { kind: "completed", value: undefined })).length,
  ).toBe(0);
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
  "encoded separator": () => `#token%3D${crypto.randomUUID()}`,
  "very long": () => `#token=${"a".repeat(4096)}`,
};

describe("reset-link bootstrap capture", () => {
  it("removes a valid fragment before returning and keeps the token only in the flow", async () => {
    const { link, token } = captured();

    expectFragmentRemoved(window.location.hash, "Reset link fragment");
    expect(window.location.pathname).toBe("/password-reset");
    expectSecretAbsent(
      JSON.stringify(window.history.state) ?? "",
      token,
      "History state",
    );
    expect(link.getSnapshot().kind).toBe("Awaiting stage");
    link.observeSession(signedOut);
    await expectSentOnce(link, token, { kind: "completed", value: undefined });
  });

  it.each(Object.keys(invalidFragments))(
    "removes a %s fragment and renders only the uniform unusable result",
    async (label) => {
      const fragment = invalidFragments[label];
      if (fragment === undefined) throw new Error("Unknown fragment fixture.");
      const link = openLink(fragment());

      expectFragmentRemoved(window.location.hash, "Reset link fragment");
      expect(link.getSnapshot().kind).toBe("Link unusable");
      expect(
        passwordResetSurface(signedOut, link.getSnapshot(), "/password-reset"),
      ).toEqual({ kind: "link unusable" });
      await expectNothingSent(link);
    },
  );

  it("never reads or strips a fragment outside the reset path", () => {
    const token = crypto.randomUUID();
    const link = openLink(`#token=${token}`, "/login");

    expectSameSecret(window.location.hash, `#token=${token}`, "Login hash");
    expect(link.getSnapshot().kind).toBe("Link unusable");
  });
});

const outcomes: Record<
  string,
  {
    readonly result: () => PublicMutationResult;
    readonly kind: string;
    readonly keepsToken: boolean;
  }
> = {
  success: {
    result: () => ({ kind: "completed", value: undefined }),
    kind: "Password changed",
    keepsToken: false,
  },
  "unusable token": {
    result: () => ({
      kind: "rejected",
      failure: httpFailure(422, "auth_invalid_reset_token"),
    }),
    kind: "Link unusable",
    keepsToken: false,
  },
  "rejected password": {
    result: () => ({
      kind: "rejected",
      failure: httpFailure(422, "auth_invalid_password"),
    }),
    kind: "Password rejected",
    keepsToken: true,
  },
  throttled: {
    result: () => ({
      kind: "rejected",
      failure: httpFailure(429, "rate_limited", "17"),
    }),
    kind: "Throttled",
    keepsToken: true,
  },
  "CSRF rejection": {
    result: () => ({
      kind: "csrf-rejected",
      failure: httpFailure(403, "csrf_invalid"),
    }),
    kind: "CSRF rejected",
    keepsToken: true,
  },
  ...Object.fromEntries(
    [400, 406, 413, 415].map((status) => [
      `generic ${status} rejection`,
      {
        result: (): PublicMutationResult => ({
          kind: "rejected",
          failure: httpFailure(status, "controlled"),
        }),
        kind: "Request rejected",
        keepsToken: false,
      },
    ]),
  ),
  "pre-dispatch failure": {
    result: () => ({
      kind: "not-sent",
      failure: new ApiTransportError(new Error("controlled")),
    }),
    kind: "Failed",
    keepsToken: true,
  },
  "transport loss": {
    result: () => ({
      kind: "unknown",
      failure: new ApiTransportError(new Error("controlled")),
    }),
    kind: "Outcome unknown",
    keepsToken: false,
  },
  "server error": {
    result: () => ({ kind: "unknown", failure: httpFailure(502, "upstream") }),
    kind: "Outcome unknown",
    keepsToken: false,
  },
};

describe("reset-link flow", () => {
  it.each(Object.keys(outcomes))(
    "maps a %s and keeps the token only for a deliberate resubmit when allowed",
    async (label) => {
      const outcome = outcomes[label];
      if (outcome === undefined) throw new Error("Unknown outcome fixture.");
      const { link, token } = captured();
      link.observeSession(signedOut);

      await expectSentOnce(link, token, outcome.result());
      expect(link.getSnapshot().kind).toBe(outcome.kind);
      if (outcome.keepsToken)
        await expectSentOnce(link, token, {
          kind: "completed",
          value: undefined,
        });
      else await expectNothingSent(link);
    },
  );

  it("never distinguishes an unusable token from a missing one", async () => {
    const { link } = captured();
    link.observeSession(signedOut);
    await submitWith(link, {
      kind: "rejected",
      failure: httpFailure(422, "auth_invalid_reset_token"),
    });
    const missing = openLink("");

    expect(
      passwordResetSurface(signedOut, link.getSnapshot(), "/password-reset"),
    ).toEqual(
      passwordResetSurface(signedOut, missing.getSnapshot(), "/password-reset"),
    );
  });

  it("drops the token on departure and on a stage change after the form appeared", async () => {
    const departed = captured().link;
    departed.observeSession(signedOut);
    departed.depart();
    await expectNothingSent(departed);

    const changed = captured().link;
    changed.observeSession(signedOut);
    changed.observeSession(authenticated);
    expect(changed.getSnapshot().kind).toBe("Link unusable");
    expect(
      passwordResetSurface(authenticated, changed.getSnapshot(), "/"),
    ).toBeNull();
    await expectNothingSent(changed);
  });

  it("ends the attempt's lifetime on departure and ignores its late result", async () => {
    const { link } = captured();
    link.observeSession(signedOut);
    let settle: (result: PublicMutationResult) => void = () => undefined;
    let isCurrent: () => boolean = () => true;
    let attemptSignal: AbortSignal | null = null;
    const pending = link.submit(
      "password-one",
      "password-one",
      (_token, _password, _confirmation, current, signal) => {
        isCurrent = current;
        attemptSignal = signal;
        return new Promise((resolve) => {
          settle = resolve;
        });
      },
    );
    expect(isCurrent()).toBe(true);
    link.depart();
    expect(isCurrent()).toBe(false);
    expect(attemptSignal?.aborted).toBe(true);
    settle({ kind: "completed", value: undefined });
    await pending;

    expect(link.getSnapshot().kind).toBe("Link unusable");
  });

  it("holds a signed-in link behind the interstitial until confirmed logout", async () => {
    const { link, token } = captured();

    // The deferred-access stage is covered end to end in App.test.tsx.
    expect(
      passwordResetSurface(
        authenticated,
        link.getSnapshot(),
        "/password-reset",
      ),
    ).toEqual({ kind: "interstitial", signingOut: false });
    link.observeSession(authenticated);
    link.beginSignOut();
    for (const kind of [
      "Logout start",
      "Logout quiescing",
      "Logout dispatch",
      "Logout confirming",
    ] as const) {
      link.observeSession({ kind });
      expect(
        passwordResetSurface({ kind }, link.getSnapshot(), "/password-reset"),
      ).toEqual({ kind: "interstitial", signingOut: true });
    }
    link.observeSession({ kind: "Logout confirmed" });
    expect(link.getSnapshot().kind).toBe("Form ready");
    await expectSentOnce(link, token, { kind: "completed", value: undefined });
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
        passwordResetSurface({ kind }, link.getSnapshot(), "/password-reset"),
      ).toBeNull();
      link.observeSession({ kind: "Logout confirmed" });
      await expectNothingSent(link);
    },
  );

  it("drops the token on Go back so ordinary stage dispatch applies", () => {
    const { link } = captured();
    link.observeSession(authenticated);
    link.goBack();

    expect(
      passwordResetSurface(
        authenticated,
        link.getSnapshot(),
        "/password-reset",
      ),
    ).toBeNull();
  });
});

describe("late reset fragments", () => {
  function stubWindow() {
    const target = new EventTarget();
    const location = { pathname: "/password-reset", hash: "", reload: vi.fn() };
    const document = {
      getElementById: (id: string) => (id === "main-content" ? {} : null),
    };
    const window = Object.assign(target, {
      location,
      document,
    }) as unknown as Window;
    return { target, location, window };
  }

  it("reloads only for a fragment added on the reset path", () => {
    const { target, location, window } = stubWindow();
    const stop = reloadOnLateFragment(window, [passwordResetPath]);

    target.dispatchEvent(new Event("hashchange"));
    location.hash = `#token=${crypto.randomUUID()}`;
    location.pathname = "/login";
    target.dispatchEvent(new Event("hashchange"));
    expect(location.reload).not.toHaveBeenCalled();

    location.pathname = "/password-reset";
    target.dispatchEvent(new Event("hashchange"));
    expect(location.reload).toHaveBeenCalledTimes(1);
    stop();
    target.dispatchEvent(new Event("hashchange"));
    expect(location.reload).toHaveBeenCalledTimes(1);
  });

  it("treats in-page navigation such as the bypass link as navigation, not ingestion", () => {
    const { target, location, window } = stubWindow();
    reloadOnLateFragment(window, [passwordResetPath]);

    location.hash = "#main-content";
    target.dispatchEvent(new Event("hashchange"));
    location.hash = "#%E0%A4%A";
    target.dispatchEvent(new Event("hashchange"));

    expect(location.reload).toHaveBeenCalledTimes(1);
  });
});
