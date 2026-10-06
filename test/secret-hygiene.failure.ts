// Controlled Vitest failures for the token-bearing unit tests. Run only by
// scripts/check-secret-hygiene.mjs, which scans the output for the markers.
import { beforeEach, describe, expect, it } from "vitest";
import {
  unitCases,
  controlledFailure,
  injectEarlyFailure,
} from "../scripts/secret-hygiene-evidence";
import { captureInvitationLink } from "../src/platform/session/invitationLink";
import { capturePasswordResetLink } from "../src/platform/session/passwordResetLink";
import { parseTotpProvisioningUri } from "../src/platform/api/totpProvisioning";
import {
  expectFragmentRemoved,
  expectSameSecret,
  expectSecretAbsent,
} from "./secretAssertions";

const resetToken = process.env.MIA_SECRET_HYGIENE_RESET_TOKEN;
const resetPassword = process.env.MIA_SECRET_HYGIENE_RESET_PASSWORD;
const invitationToken = process.env.MIA_SECRET_HYGIENE_INVITATION_TOKEN;
const invitationPassword = process.env.MIA_SECRET_HYGIENE_INVITATION_PASSWORD;
beforeEach((context) => injectEarlyFailure(context.task.name));

function markers(): { token: string; password: string } {
  if (resetToken === undefined || resetPassword === undefined)
    throw new Error("Controlled fixture markers are required.");
  return { token: resetToken, password: resetPassword };
}

describe("controlled reset-token unit failures", () => {
  it(unitCases[0], async () => {
    const { token, password } = markers();
    window.history.replaceState(null, "", `/password-reset#token=${token}`);
    const link = capturePasswordResetLink(window.location, window.history);
    link.observeSession({ kind: "Signed out" });
    const sent: string[] = [];
    await link.submit(password, password, (sentToken, sentPassword) => {
      sent.push(sentToken, sentPassword);
      return Promise.resolve({ kind: "completed", value: undefined });
    });
    // A regression stand-in: the request carried a different token.
    expectSameSecret(sent[0], token, "Captured reset token");
    controlledFailure(unitCases[0], () =>
      expectSameSecret(`${sent[0] ?? ""}-regressed`, token, "Reset token"),
    );
  });

  it(unitCases[1], () => {
    const { token, password } = markers();
    controlledFailure(unitCases[1], () =>
      expectSecretAbsent(`${password} ${token}`, token, "Rendered state"),
    );
  });

  it(unitCases[2], () => {
    const { token } = markers();
    window.history.replaceState(null, "", `/password-reset#token=${token}`);
    capturePasswordResetLink(window.location, window.history);
    // Simulate the exact observable state if bootstrap stripping regresses.
    window.history.replaceState(null, "", `/password-reset#token=${token}`);
    controlledFailure(unitCases[2], () =>
      expectFragmentRemoved(window.location.hash, "Reset link fragment"),
    );
  });

  it(unitCases[3], async () => {
    if (invitationToken === undefined)
      throw new Error("Controlled fixture markers are required.");
    window.history.replaceState(
      null,
      "",
      `/invitation#token=${invitationToken}`,
    );
    const link = captureInvitationLink(window.location, window.history);
    link.observeSession({ kind: "Signed out" });
    const sent: string[] = [];
    await link.preview((sentToken) => {
      sent.push(sentToken);
      return Promise.resolve({ kind: "completed", value: "mentor" });
    });
    // A regression stand-in: the request carried a different token.
    expectSameSecret(sent[0], invitationToken, "Captured invitation token");
    controlledFailure(unitCases[3], () =>
      expectSameSecret(
        `${sent[0] ?? ""}-regressed`,
        invitationToken,
        "Invitation token",
      ),
    );
  });

  it(unitCases[4], async () => {
    if (invitationToken === undefined || invitationPassword === undefined)
      throw new Error("Controlled fixture markers are required.");
    window.history.replaceState(
      null,
      "",
      `/invitation#token=${invitationToken}`,
    );
    const link = captureInvitationLink(window.location, window.history);
    link.observeSession({ kind: "Signed out" });
    await link.preview(() =>
      Promise.resolve({ kind: "completed", value: "mentor" }),
    );
    const sent: string[] = [];
    await link.accept(
      {
        username: "example.mentor",
        password: invitationPassword,
        passwordConfirmation: invitationPassword,
        language: "en-US",
        country: "DE",
        timeZone: "UTC",
      },
      (sentToken, fields) => {
        sent.push(sentToken, fields.password);
        return Promise.resolve({ kind: "completed", value: undefined });
      },
    );
    // A regression stand-in: the request carried a different password.
    expectSameSecret(
      sent[1],
      invitationPassword,
      "Submitted invitation password",
    );
    controlledFailure(unitCases[4], () =>
      expectSameSecret(
        `${sent[1] ?? ""}-regressed`,
        invitationPassword,
        "Invitation password",
      ),
    );
  });

  it(unitCases[5], () => {
    const uri = process.env.MIA_SECRET_HYGIENE_TOTP_URI;
    const secret = process.env.MIA_SECRET_HYGIENE_TOTP_SECRET;
    if (uri === undefined || secret === undefined)
      throw new Error("Controlled fixture markers are required.");
    const parsed = parseTotpProvisioningUri(uri);
    expectSameSecret(parsed?.secret, secret, "Parsed TOTP secret");
    // A regression stand-in: the parsed value differs from the issued secret.
    controlledFailure(unitCases[5], () =>
      expectSameSecret(
        `${parsed?.secret ?? ""}-regressed`,
        secret,
        "TOTP secret",
      ),
    );
  });

  it(unitCases[6], () => {
    markers();
    controlledFailure(unitCases[6], () => expect(false).toBe(true));
  });
});
