// Controlled Vitest failures for the token-bearing unit tests. Run only by
// scripts/check-secret-hygiene.mjs, which scans the output for the markers.
import { describe, expect, it } from "vitest";
import { captureInvitationLink } from "../src/platform/session/invitationLink";
import { capturePasswordResetLink } from "../src/platform/session/passwordResetLink";
import {
  expectFragmentRemoved,
  expectSameSecret,
  expectSecretAbsent,
} from "./secretAssertions";

const resetToken = process.env.MIA_SECRET_HYGIENE_RESET_TOKEN;
const resetPassword = process.env.MIA_SECRET_HYGIENE_RESET_PASSWORD;
const invitationToken = process.env.MIA_SECRET_HYGIENE_INVITATION_TOKEN;
const invitationPassword = process.env.MIA_SECRET_HYGIENE_INVITATION_PASSWORD;

function markers(): { token: string; password: string } {
  if (resetToken === undefined || resetPassword === undefined)
    throw new Error("Controlled fixture markers are required.");
  return { token: resetToken, password: resetPassword };
}

describe("controlled reset-token unit failures", () => {
  it.each(["valid fragment"])(
    "fails a %s comparison through the shared helper",
    async () => {
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
      expectSameSecret(`${sent[0] ?? ""}-regressed`, token, "Reset token");
    },
  );

  it("fails an absence check through the shared helper", () => {
    const { token, password } = markers();
    expectSecretAbsent(`${password} ${token}`, token, "Rendered state");
  });

  it("fails the reset-fragment removal assertion through the shared helper", () => {
    const { token } = markers();
    window.history.replaceState(null, "", `/password-reset#token=${token}`);
    capturePasswordResetLink(window.location, window.history);
    // Simulate the exact observable state if bootstrap stripping regresses.
    window.history.replaceState(null, "", `/password-reset#token=${token}`);
    expectFragmentRemoved(window.location.hash, "Reset link fragment");
  });

  it("fails an invitation-token comparison through the shared helper", async () => {
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
    expectSameSecret(
      `${sent[0] ?? ""}-regressed`,
      invitationToken,
      "Invitation token",
    );
  });

  it("fails an invitation-acceptance password comparison through the shared helper", async () => {
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
      `${sent[1] ?? ""}-regressed`,
      invitationPassword,
      "Invitation password",
    );
  });

  it("fails a structural assertion without fixture values", () => {
    markers();
    expect(false).toBe(true);
  });
});
