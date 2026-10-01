import { defineMessages } from "react-intl";

export const messages = defineMessages({
  loginUsername: {
    id: "login.username",
    defaultMessage: "Username (required)",
  },
  loginPassword: {
    id: "login.password",
    defaultMessage: "Password (required)",
  },
  loginPasswordHelp: {
    id: "login.passwordHelp",
    defaultMessage:
      "Spaces, Unicode, and password-manager values are allowed. Your password is not trimmed or normalized.",
  },
  loginReveal: { id: "login.reveal", defaultMessage: "Show password" },
  loginHide: { id: "login.hide", defaultMessage: "Hide password" },
  loginSubmit: { id: "login.submit", defaultMessage: "Sign in" },
  loginSubmitting: { id: "login.submitting", defaultMessage: "Signing in…" },
  loginRejected: {
    id: "login.rejected",
    defaultMessage: "Sign-in was rejected. Check your username and password.",
  },
  loginBlocked: {
    id: "login.blocked",
    defaultMessage:
      "Sign-in could not continue. Check your input or contact your local operator.",
  },
  loginThrottled: {
    id: "login.throttled",
    defaultMessage: "Sign-in is temporarily limited. Wait before trying again.",
  },
  loginWait: {
    id: "login.wait",
    defaultMessage:
      "Wait at least {seconds, number} seconds before trying again.",
  },
  loginFailed: {
    id: "login.failed",
    defaultMessage: "MIA could not complete sign-in. Try again later.",
  },
  loginUnconfirmed: {
    id: "login.unconfirmed",
    defaultMessage:
      "The sign-in outcome was not confirmed. The latest check found this browser signed out. You can sign in again.",
  },
  loginReconciling: {
    id: "login.reconciling",
    defaultMessage:
      "The sign-in outcome is uncertain. Checking current sign-in status…",
  },
  loginRecheckNeeded: {
    id: "login.recheckNeeded",
    defaultMessage:
      "The sign-in outcome is uncertain and status could not be checked. Check status before signing in again.",
  },
  loginRecheck: { id: "login.recheck", defaultMessage: "Check sign-in status" },
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
  mfaCodeLabel: {
    id: "entry.mfa.code.label",
    defaultMessage: "Six-digit code (required)",
  },
  mfaCodeHelp: {
    id: "entry.mfa.code.help",
    defaultMessage:
      "Enter the current six-digit code from your authenticator app or text message.",
  },
  mfaSubmit: { id: "entry.mfa.submit", defaultMessage: "Verify code" },
  mfaUseRecovery: {
    id: "entry.mfa.useRecovery",
    defaultMessage: "Use a recovery code instead",
  },
  mfaUseVerification: {
    id: "entry.mfa.useVerification",
    defaultMessage: "Use a six-digit code instead",
  },
  mfaRecoveryPageTitle: {
    id: "entry.mfa.recovery.pageTitle",
    defaultMessage: "Use a recovery code | MIA",
  },
  mfaRecoveryHeading: {
    id: "entry.mfa.recovery.heading",
    defaultMessage: "Use a recovery code",
  },
  mfaRecoveryIntroduction: {
    id: "entry.mfa.recovery.introduction",
    defaultMessage: "Enter one unused recovery code to continue sign-in.",
  },
  mfaRecoveryCodeLabel: {
    id: "entry.mfa.recovery.code.label",
    defaultMessage: "Recovery code (required)",
  },
  mfaRecoveryCodeHelp: {
    id: "entry.mfa.recovery.code.help",
    defaultMessage:
      "You may enter the code with or without spaces or hyphens. Letter case does not matter.",
  },
  mfaRecoverySubmit: {
    id: "entry.mfa.recovery.submit",
    defaultMessage: "Use recovery code",
  },
  mfaSubmitting: {
    id: "entry.mfa.submitting",
    defaultMessage: "Verifying sign-in…",
  },
  mfaReconciling: {
    id: "entry.mfa.reconciling",
    defaultMessage:
      "The verification outcome is uncertain. Checking current sign-in status…",
  },
  mfaRecheckNeeded: {
    id: "entry.mfa.recheckNeeded",
    defaultMessage:
      "The verification outcome is uncertain and status could not be checked.",
  },
  mfaRecheck: {
    id: "entry.mfa.recheck",
    defaultMessage: "Check sign-in status",
  },
  mfaLocalInvalid: {
    id: "entry.mfa.localInvalid",
    defaultMessage: "Enter exactly six digits.",
  },
  mfaRecoveryLocalInvalid: {
    id: "entry.mfa.recovery.localInvalid",
    defaultMessage: "Enter a valid 16-character recovery code.",
  },
  mfaStepUsed: {
    id: "entry.mfa.stepUsed",
    defaultMessage:
      "That authenticator code was already used. Enter a new code.",
  },
  mfaInvalidCode: {
    id: "entry.mfa.invalidCode",
    defaultMessage:
      "That six-digit code was not accepted. Check it and try again.",
  },
  mfaInvalidRecoveryCode: {
    id: "entry.mfa.invalidRecoveryCode",
    defaultMessage:
      "That recovery code was not accepted. Check it and try again.",
  },
  mfaExpired: {
    id: "entry.mfa.expired",
    defaultMessage:
      "This verification challenge is no longer valid. Sign out, then start sign-in again.",
  },
  mfaRestartPageTitle: {
    id: "entry.mfa.restart.pageTitle",
    defaultMessage: "Start sign-in again | MIA",
  },
  mfaRestartHeading: {
    id: "entry.mfa.restart.heading",
    defaultMessage: "Start sign-in again",
  },
  mfaRestartIntroduction: {
    id: "entry.mfa.restart.introduction",
    defaultMessage: "Sign out below, then start a fresh sign-in.",
  },
  mfaThrottled: {
    id: "entry.mfa.throttled",
    defaultMessage:
      "Verification is temporarily limited. Wait before trying again.",
  },
  mfaWait: {
    id: "entry.mfa.wait",
    defaultMessage:
      "Wait at least {seconds, number} seconds before trying again.",
  },
  mfaFailed: {
    id: "entry.mfa.failed",
    defaultMessage: "MIA could not verify sign-in. Try again later.",
  },
  mfaUnconfirmed: {
    id: "entry.mfa.unconfirmed",
    defaultMessage:
      "The verification result was not confirmed. This browser still requires verification.",
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
  passwordChangeNewLabel: {
    id: "entry.passwordChange.password.label",
    defaultMessage: "New password (required)",
  },
  passwordChangeRules: {
    id: "entry.passwordChange.password.help",
    defaultMessage:
      "Use 12 to 128 characters and at most 512 bytes. Spaces, Unicode, and password-manager values are allowed. Your password is not trimmed or normalized. Very common passwords are not accepted.",
  },
  passwordChangeConfirmationLabel: {
    id: "entry.passwordChange.confirmation.label",
    defaultMessage: "Confirm new password (required)",
  },
  passwordChangeConfirmationHelp: {
    id: "entry.passwordChange.confirmation.help",
    defaultMessage: "Enter exactly the same password again.",
  },
  passwordChangeReveal: {
    id: "entry.passwordChange.password.reveal",
    defaultMessage: "Show new password",
  },
  passwordChangeHide: {
    id: "entry.passwordChange.password.hide",
    defaultMessage: "Hide new password",
  },
  passwordChangeConfirmationReveal: {
    id: "entry.passwordChange.confirmation.reveal",
    defaultMessage: "Show password confirmation",
  },
  passwordChangeConfirmationHide: {
    id: "entry.passwordChange.confirmation.hide",
    defaultMessage: "Hide password confirmation",
  },
  passwordChangeSubmit: {
    id: "entry.passwordChange.submit",
    defaultMessage: "Save new password",
  },
  passwordChangeSubmitting: {
    id: "entry.passwordChange.submitting",
    defaultMessage: "Saving new password…",
  },
  passwordChangeErrorSummary: {
    id: "entry.passwordChange.errorSummary",
    defaultMessage: "Correct these problems before saving your new password:",
  },
  passwordChangeTooShort: {
    id: "entry.passwordChange.tooShort",
    defaultMessage:
      "The new password is too short. Use at least 12 characters.",
  },
  passwordChangeTooLong: {
    id: "entry.passwordChange.tooLong",
    defaultMessage:
      "The new password is too long. Use at most 128 characters and 512 bytes.",
  },
  passwordChangeMismatch: {
    id: "entry.passwordChange.mismatch",
    defaultMessage:
      "The confirmation does not match the new password. Enter exactly the same password in both fields.",
  },
  passwordChangeRejected: {
    id: "entry.passwordChange.rejected",
    defaultMessage:
      "That password was not accepted. Choose a different password that meets the rules above.",
  },
  passwordChangeThrottled: {
    id: "entry.passwordChange.throttled",
    defaultMessage:
      "Password replacement is temporarily limited. Wait before trying again.",
  },
  passwordChangeWait: {
    id: "entry.passwordChange.wait",
    defaultMessage:
      "Wait at least {seconds, number} seconds before trying again.",
  },
  passwordChangeFailed: {
    id: "entry.passwordChange.failed",
    defaultMessage: "MIA could not save the new password. Try again later.",
  },
  passwordChangeUnconfirmed: {
    id: "entry.passwordChange.unconfirmed",
    defaultMessage:
      "The outcome was not confirmed. This browser still requires a new password.",
  },
  passwordChangeReconciling: {
    id: "entry.passwordChange.reconciling",
    defaultMessage: "The outcome is unknown. Checking current sign-in status…",
  },
  passwordChangeRecheckNeeded: {
    id: "entry.passwordChange.recheckNeeded",
    defaultMessage: "The outcome is unknown and status could not be checked.",
  },
  passwordChangeRecheck: {
    id: "entry.passwordChange.recheck",
    defaultMessage: "Check sign-in status",
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
