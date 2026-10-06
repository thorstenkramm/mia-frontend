import { randomBytes } from "node:crypto";
import {
  configure,
  getConfig,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  authenticatedSessionResponse,
  enrollmentResponse,
  mfaStateResponse,
  ownProfileCapabilities,
  provisioningUriFixture,
  recoveryCodesFixture,
  recoveryCodesResponse,
  type MfaStateFixture,
} from "../../test/mfaFixtures";
import { server } from "../../test/server";
import { App } from "./App";
import { AnnouncementProvider } from "../platform/announcer/AnnouncementRegion";
import { applyDocumentLocale } from "../platform/i18n/locales";
import { MiaIntlProvider } from "../platform/i18n/MiaIntlProvider";
import { applyTextSize } from "../platform/prefs/preferences";
import { InvitationLink } from "../platform/session/invitationLink";
import { PasswordResetLink } from "../platform/session/passwordResetLink";

// Holds the lazily loaded recovery-code route module until a test releases it.
const codesChunk = vi.hoisted(() => {
  let release: () => void = () => {};
  const arrived = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { arrived, release: () => release() };
});

vi.mock("../features/profile/MfaRecoveryCodesRoute", async (importOriginal) => {
  await codesChunk.arrived;
  return importOriginal();
});

const pendingId = "mfe_pending";
const defaultElementError = getConfig().getElementError;

describe("recovery-code departure while the route module loads", () => {
  // Codes may be in the DOM: failures report only the query, never the DOM.
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

  it("refuses shell departure before the codes route registers its guard", async () => {
    let mfaState: MfaStateFixture = {};
    window.history.replaceState(null, "", "/profile/security/mfa/enroll");
    document.cookie = `mia_csrf=${crypto.randomUUID()}; Path=/`;
    server.use(
      http.get("/api/v1/auth/session", () => authenticatedSessionResponse()),
      http.get("/api/v1/users/me/capabilities", () => ownProfileCapabilities()),
      http.get("/api/v1/users/me/mfa", () => mfaStateResponse(mfaState)),
      http.post("/api/v1/users/me/mfa-enrollments", () => {
        mfaState = { pending: { id: pendingId } };
        return enrollmentResponse(pendingId, provisioningUriFixture());
      }),
      http.post(
        `/api/v1/users/me/mfa-enrollments/${pendingId}/verifications`,
        () => {
          mfaState = { active: "totp" };
          return recoveryCodesResponse(pendingId, recoveryCodesFixture());
        },
      ),
    );
    applyDocumentLocale("en-US");
    applyTextSize("standard");
    render(
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
    const user = userEvent.setup();
    await user.click(
      await screen.findByRole("button", { name: "Start setup" }),
    );
    await user.type(
      await screen.findByLabelText(
        "Six-digit code from your authenticator app (required)",
      ),
      String(randomBytes(4).readUInt32BE() % 1_000_000).padStart(6, "0"),
    );
    await user.click(screen.getByRole("button", { name: "Verify code" }));

    const codesPath = "/profile/security/mfa/recovery-codes";
    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "MFA recovery codes",
      }),
    ).toBeVisible();
    // The shell is mounted while the codes route module is still held.
    expect(
      screen.queryByRole("button", { name: "Show recovery codes" }),
    ).toBeNull();
    const entries = window.history.length;
    const navigation = screen.getByRole("navigation", { name: "Application" });
    for (const name of ["Home", "Multi-factor authentication"]) {
      await user.click(within(navigation).getByRole("link", { name }));
      expect(window.location.pathname).toBe(codesPath);
      expect(window.history.length).toBe(entries);
    }
    await user.click(screen.getByRole("button", { name: "Open navigation" }));
    const drawer = await screen.findByRole("dialog", { name: "Application" });
    await user.click(within(drawer).getByRole("link", { name: "Home" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(window.location.pathname).toBe(codesPath);
    expect(window.history.length).toBe(entries);
    await waitFor(() =>
      expect(
        Array.from(document.querySelectorAll("[aria-live]")).find(
          (region) => region.getAttribute("aria-live") === "assertive",
        ),
      ).toHaveTextContent("Confirm that you saved your recovery codes first."),
    );
    // Sign out stays available throughout.
    expect(
      within(navigation).getByRole("button", { name: "Sign out" }),
    ).toBeVisible();

    codesChunk.release();
    // The codes are still held: the route offers the explicit reveal.
    expect(
      await screen.findByRole("button", { name: "Show recovery codes" }),
    ).toBeVisible();
    expect(window.location.pathname).toBe(codesPath);
  });
});
