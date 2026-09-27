import { defineMessages } from "react-intl";

export const messages = defineMessages({
  pageTitle: {
    id: "entry.pageTitle",
    defaultMessage: "Sign in | MIA",
  },
  skipLink: {
    id: "entry.skipLink",
    defaultMessage: "Skip to main content",
  },
  heading: {
    id: "entry.heading",
    defaultMessage: "Sign in to MIA",
  },
  introduction: {
    id: "entry.introduction",
    defaultMessage: "Choose your language and text size before signing in.",
  },
  languageLabel: {
    id: "entry.language.label",
    defaultMessage: "Language",
  },
  localeChanged: {
    id: "entry.language.changed",
    defaultMessage: "Interface language changed.",
  },
  textSizeLegend: {
    id: "entry.textSize.legend",
    defaultMessage: "Text size",
  },
  textSizeHelp: {
    id: "entry.textSize.help",
    defaultMessage: "Choose the size that is easiest for you to read.",
  },
  textSizeStandard: {
    id: "entry.textSize.standard",
    defaultMessage: "Standard",
  },
  textSizeLarge: {
    id: "entry.textSize.large",
    defaultMessage: "Large",
  },
  textSizeExtraLarge: {
    id: "entry.textSize.extraLarge",
    defaultMessage: "Extra large",
  },
  buildIdentifier: {
    id: "entry.buildIdentifier",
    defaultMessage: "Build {buildId}",
  },
  checkingPageTitle: {
    id: "entry.checking.pageTitle",
    defaultMessage: "MIA",
  },
  checkingHeading: {
    id: "entry.checking.heading",
    defaultMessage: "Checking access",
  },
  checkingIntroduction: {
    id: "entry.checking.introduction",
    defaultMessage: "MIA is checking your sign-in status.",
  },
  mfaPageTitle: {
    id: "entry.mfa.pageTitle",
    defaultMessage: "Verify sign-in | MIA",
  },
  mfaHeading: {
    id: "entry.mfa.heading",
    defaultMessage: "Verify sign-in",
  },
  mfaIntroduction: {
    id: "entry.mfa.introduction",
    defaultMessage:
      "Additional verification is required before MIA can continue.",
  },
  passwordChangePageTitle: {
    id: "entry.passwordChange.pageTitle",
    defaultMessage: "Choose a new password | MIA",
  },
  passwordChangeHeading: {
    id: "entry.passwordChange.heading",
    defaultMessage: "Choose a new password",
  },
  passwordChangeIntroduction: {
    id: "entry.passwordChange.introduction",
    defaultMessage: "Password replacement is required before MIA can continue.",
  },
  logoutButton: {
    id: "entry.logout.button",
    defaultMessage: "Sign out",
  },
  logoutPageTitle: {
    id: "entry.logout.pageTitle",
    defaultMessage: "Sign out | MIA",
  },
  logoutHeading: {
    id: "entry.logout.heading",
    defaultMessage: "Signing out",
  },
  logoutIntroduction: {
    id: "entry.logout.introduction",
    defaultMessage:
      "Protected content is hidden while MIA checks whether this browser is signed out.",
  },
  logoutUnconfirmedHeading: {
    id: "entry.logout.unconfirmed.heading",
    defaultMessage: "Sign-out not confirmed",
  },
  logoutUnconfirmedIntroduction: {
    id: "entry.logout.unconfirmed.introduction",
    defaultMessage:
      "Protected content has been hidden locally, but this browser may still hold a valid sign-in cookie.",
  },
  logoutCloseBrowserGuidance: {
    id: "entry.logout.closeBrowserGuidance",
    defaultMessage:
      "On a shared device, close the entire browser if MIA cannot confirm sign-out.",
  },
  logoutRetryButton: {
    id: "entry.logout.retryButton",
    defaultMessage: "Retry logout",
  },
  logoutRefreshButton: {
    id: "entry.logout.refreshButton",
    defaultMessage: "Refresh sign-out status",
  },
  logoutConfirmedIntroduction: {
    id: "entry.logout.confirmedIntroduction",
    defaultMessage:
      "Signed out at the last check. A sign-in already in progress in another tab may sign this browser in again.",
  },
  homePageTitle: {
    id: "entry.home.pageTitle",
    defaultMessage: "Home | MIA",
  },
  homeHeading: {
    id: "entry.home.heading",
    defaultMessage: "Home",
  },
  homeIntroduction: {
    id: "entry.home.introduction",
    defaultMessage: "Access checks are complete.",
  },
  errorPageTitle: {
    id: "entry.error.pageTitle",
    defaultMessage: "Unable to check access | MIA",
  },
  errorHeading: {
    id: "entry.error.heading",
    defaultMessage: "Unable to check access",
  },
  errorSummary: {
    id: "entry.error.summary",
    defaultMessage: "MIA could not complete the access check.",
  },
  sessionErrorIntroduction: {
    id: "entry.error.session",
    defaultMessage:
      "Your sign-in status could not be checked. No protected content has been shown.",
  },
  capabilityErrorIntroduction: {
    id: "entry.error.capabilities",
    defaultMessage:
      "Your access could not be checked. No protected content has been shown.",
  },
  technicalDetails: {
    id: "entry.error.technicalDetails",
    defaultMessage: "Technical details",
  },
  httpStatus: {
    id: "entry.error.httpStatus",
    defaultMessage: "HTTP status: {status}",
  },
  copyWarning: {
    id: "entry.error.copy.warning",
    defaultMessage:
      "Review the technical details for sensitive information before sharing them.",
  },
  copyTechnicalDetails: {
    id: "entry.error.copy.button",
    defaultMessage: "Copy technical details",
  },
  copySuccess: {
    id: "entry.error.copy.success",
    defaultMessage: "Technical details copied.",
  },
  copyFailure: {
    id: "entry.error.copy.failure",
    defaultMessage: "Technical details could not be copied.",
  },
  copyManualFallback: {
    id: "entry.error.copy.manualFallback",
    defaultMessage:
      "Copying is unavailable. Select and copy the response text manually.",
  },
});

export type MessageId = (typeof messages)[keyof typeof messages]["id"];
