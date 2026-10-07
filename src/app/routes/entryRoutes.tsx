import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import { messages } from "../../platform/i18n/messages";
import type { TextSize } from "../../platform/prefs/preferences";
import type { InvitationLink } from "../../platform/session/invitationLink";
import type { PasswordResetLink } from "../../platform/session/passwordResetLink";
import { mfaPaths } from "../../platform/session/mfaEnrollment";
import type { MfaRouteProps } from "../../features/profile/MfaRouteProps";

export type EntryRouteProps = {
  initialTextSize: TextSize;
  logoutConfirmed?: boolean;
  passwordResetLink: PasswordResetLink;
  invitationLink: InvitationLink;
};
type EntryRouteBase = {
  readonly parent: {
    readonly path: string;
    readonly label: (typeof messages)[keyof typeof messages];
  } | null;
  readonly titleMessage: (typeof messages)[keyof typeof messages];
  readonly headingMessage: (typeof messages)[keyof typeof messages];
};
type EntryRoute =
  | (EntryRouteBase & {
      readonly path:
        | "/"
        | "/login"
        | "/login/recovery"
        | "/password-reset"
        | "/invitation"
        | "/invitation/accept"
        | "/auth/mfa"
        | "/auth/mfa/recovery"
        | "/auth/password-change"
        | "/auth/logout";
      readonly gate:
        | "Public"
        | "Public + Token(reset)"
        | "Public + Token(invitation)"
        | "Restricted(mfa)"
        | "Restricted(password-change)"
        | "Restricted(logout)"
        | "Authenticated";
      readonly component: LazyExoticComponent<ComponentType<EntryRouteProps>>;
    })
  // Owner decision 2026-10-05: authenticated stage, then own-scope
  // `profile.view`, then the MFA state read as the route resource.
  | (EntryRouteBase & {
      readonly path: (typeof mfaPaths)[keyof typeof mfaPaths];
      readonly gate: "Profile(own MFA)";
      readonly component: LazyExoticComponent<ComponentType<MfaRouteProps>>;
    });

export const entryRoutes = {
  signedOut: {
    parent: null,
    path: "/login",
    gate: "Public",
    titleMessage: messages.pageTitle,
    headingMessage: messages.heading,
    component: lazy(() => import("../../features/auth/SignedOutEntryRoute")),
  },
  passwordRecovery: {
    parent: { path: "/login", label: messages.backToSignIn },
    path: "/login/recovery",
    gate: "Public",
    titleMessage: messages.recoveryPageTitle,
    headingMessage: messages.recoveryHeading,
    component: lazy(
      () => import("../../features/auth/PasswordRecoveryEntryRoute"),
    ),
  },
  passwordReset: {
    parent: { path: "/login", label: messages.backToSignIn },
    path: "/password-reset",
    gate: "Public + Token(reset)",
    titleMessage: messages.resetPageTitle,
    headingMessage: messages.resetHeading,
    component: lazy(
      () => import("../../features/auth/PasswordResetEntryRoute"),
    ),
  },
  invitation: {
    parent: { path: "/login", label: messages.backToSignIn },
    path: "/invitation",
    gate: "Public + Token(invitation)",
    titleMessage: messages.invitationPageTitle,
    headingMessage: messages.invitationHeading,
    component: lazy(() => import("../../features/auth/InvitationEntryRoute")),
  },
  invitationAccept: {
    parent: { path: "/invitation", label: messages.routeBackToInvitation },
    path: "/invitation/accept",
    gate: "Public + Token(invitation)",
    titleMessage: messages.invitationAcceptPageTitle,
    headingMessage: messages.invitationAcceptHeading,
    component: lazy(() => import("../../features/auth/InvitationEntryRoute")),
  },
  mfa: {
    parent: null,
    path: "/auth/mfa",
    gate: "Restricted(mfa)",
    titleMessage: messages.mfaPageTitle,
    headingMessage: messages.mfaHeading,
    component: lazy(() => import("../../features/auth/MfaEntryRoute")),
  },
  mfaRecovery: {
    parent: { path: "/auth/mfa", label: messages.mfaUseVerification },
    path: "/auth/mfa/recovery",
    gate: "Restricted(mfa)",
    titleMessage: messages.mfaRecoveryPageTitle,
    headingMessage: messages.mfaRecoveryHeading,
    component: lazy(() => import("../../features/auth/MfaEntryRoute")),
  },
  passwordChange: {
    parent: null,
    path: "/auth/password-change",
    gate: "Restricted(password-change)",
    titleMessage: messages.passwordChangePageTitle,
    headingMessage: messages.passwordChangeHeading,
    component: lazy(
      () => import("../../features/auth/PasswordChangeEntryRoute"),
    ),
  },
  restrictedLogout: {
    parent: null,
    path: "/auth/logout",
    gate: "Restricted(logout)",
    titleMessage: messages.logoutPageTitle,
    headingMessage: messages.logoutHeading,
    component: lazy(() => import("../../features/auth/LogoutEntryRoute")),
  },
  home: {
    parent: null,
    path: "/",
    gate: "Authenticated",
    titleMessage: messages.homePageTitle,
    headingMessage: messages.homeHeading,
    component: lazy(() => import("../../features/home/HomeEntryRoute")),
  },
  mfaOverview: {
    // BCG-009 owner decision 2026-10-07: Home until /profile exists.
    parent: { path: "/", label: messages.mfaBackToHome },
    path: mfaPaths.overview,
    gate: "Profile(own MFA)",
    titleMessage: messages.mfaOverviewPageTitle,
    headingMessage: messages.mfaOverviewHeading,
    component: lazy(() => import("../../features/profile/MfaOverviewRoute")),
  },
  mfaEnroll: {
    parent: { path: mfaPaths.overview, label: messages.mfaBackToOverview },
    path: mfaPaths.enroll,
    gate: "Profile(own MFA)",
    titleMessage: messages.mfaEnrollPageTitle,
    headingMessage: messages.mfaEnrollHeading,
    component: lazy(() => import("../../features/profile/MfaEnrollRoute")),
  },
  mfaVerify: {
    // The safe fallback remains overview when setup is left/lost.
    parent: { path: mfaPaths.overview, label: messages.mfaBackToOverview },
    path: mfaPaths.verify,
    gate: "Profile(own MFA)",
    titleMessage: messages.mfaVerifyPageTitle,
    headingMessage: messages.mfaVerifyHeading,
    component: lazy(() => import("../../features/profile/MfaVerifyRoute")),
  },
  mfaRecoveryCodes: {
    parent: { path: mfaPaths.overview, label: messages.mfaBackToOverview },
    path: mfaPaths.recoveryCodes,
    gate: "Profile(own MFA)",
    titleMessage: messages.mfaCodesPageTitle,
    headingMessage: messages.mfaCodesHeading,
    component: lazy(
      () => import("../../features/profile/MfaRecoveryCodesRoute"),
    ),
  },
} as const satisfies Record<string, EntryRoute>;

export type EntryRouteKey = keyof typeof entryRoutes;
export type ProfileMfaEntryRoute = Extract<
  (typeof entryRoutes)[EntryRouteKey],
  { readonly gate: "Profile(own MFA)" }
>;

const profileMfaRouteKeys = [
  "mfaOverview",
  "mfaEnroll",
  "mfaVerify",
  "mfaRecoveryCodes",
] as const satisfies readonly EntryRouteKey[];

// Path-aware dispatch for the authenticated stage. A profile MFA path needs
// own-scope `profile.view`; without it the Home route is the safe fallback.
export function authenticatedRouteKey(
  pathname: string,
  ownProfileView: boolean,
): EntryRouteKey {
  if (!ownProfileView) return "home";
  return (
    profileMfaRouteKeys.find((key) => entryRoutes[key].path === pathname) ??
    "home"
  );
}
