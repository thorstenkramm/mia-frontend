import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import { messages } from "../../platform/i18n/messages";
import type { TextSize } from "../../platform/prefs/preferences";

export type EntryRouteProps = {
  initialTextSize: TextSize;
  logoutConfirmed?: boolean;
};
type EntryRoute = {
  readonly path:
    | "/"
    | "/login"
    | "/auth/mfa"
    | "/auth/mfa/recovery"
    | "/auth/password-change"
    | "/auth/logout";
  readonly gate:
    | "Public"
    | "Restricted(mfa)"
    | "Restricted(password-change)"
    | "Restricted(logout)"
    | "Authenticated";
  readonly titleMessage: (typeof messages)[keyof typeof messages];
  readonly headingMessage: (typeof messages)[keyof typeof messages];
  readonly component: LazyExoticComponent<ComponentType<EntryRouteProps>>;
};

export const entryRoutes = {
  signedOut: {
    path: "/login",
    gate: "Public",
    titleMessage: messages.pageTitle,
    headingMessage: messages.heading,
    component: lazy(() => import("../../features/auth/SignedOutEntryRoute")),
  },
  mfa: {
    path: "/auth/mfa",
    gate: "Restricted(mfa)",
    titleMessage: messages.mfaPageTitle,
    headingMessage: messages.mfaHeading,
    component: lazy(() => import("../../features/auth/MfaEntryRoute")),
  },
  mfaRecovery: {
    path: "/auth/mfa/recovery",
    gate: "Restricted(mfa)",
    titleMessage: messages.mfaRecoveryPageTitle,
    headingMessage: messages.mfaRecoveryHeading,
    component: lazy(() => import("../../features/auth/MfaEntryRoute")),
  },
  passwordChange: {
    path: "/auth/password-change",
    gate: "Restricted(password-change)",
    titleMessage: messages.passwordChangePageTitle,
    headingMessage: messages.passwordChangeHeading,
    component: lazy(
      () => import("../../features/auth/PasswordChangeEntryRoute"),
    ),
  },
  restrictedLogout: {
    path: "/auth/logout",
    gate: "Restricted(logout)",
    titleMessage: messages.logoutPageTitle,
    headingMessage: messages.logoutHeading,
    component: lazy(() => import("../../features/auth/LogoutEntryRoute")),
  },
  home: {
    path: "/",
    gate: "Authenticated",
    titleMessage: messages.homePageTitle,
    headingMessage: messages.homeHeading,
    component: lazy(() => import("../../features/home/HomeEntryRoute")),
  },
} as const satisfies Record<string, EntryRoute>;

export type EntryRouteKey = keyof typeof entryRoutes;
