import { defineMessages } from "react-intl";

export const messages = defineMessages({
  routeLoading: { id: "route.loading", defaultMessage: "Loading this page…" },
  routeUnavailable: {
    id: "route.unavailable",
    defaultMessage: "This page could not be loaded",
  },
  routeLoadFailed: {
    id: "route.loadFailed",
    defaultMessage:
      "Reload to try loading this page again, or use an available exit. Reload does not repeat your submitted action.",
  },
  routeCodesLoadFailed: {
    id: "route.codesLoadFailed",
    defaultMessage:
      "Your recovery-code page could not be loaded. Navigation remains blocked until you save the codes. Browser Reload loses these codes and they cannot be retrieved. You can sign out.",
  },
  routeReload: { id: "route.reload", defaultMessage: "Reload page" },
  routeBackToInvitation: {
    id: "route.backToInvitation",
    defaultMessage: "Back to invitation",
  },
  lifecycleAbsoluteWarning: {
    id: "session.absoluteWarning",
    defaultMessage: "Your sign-in cannot be extended and will end soon.",
  },
  lifecycleAbsoluteHelp: {
    id: "session.absoluteHelp",
    defaultMessage:
      "Sign out. Sign-in expiry does not end your tutoring session.",
  },
  lifecycleRetryContinue: {
    id: "session.retryContinue",
    defaultMessage: "Retry Continue working",
  },
  lifecycleStopWaiting: {
    id: "session.stopWaiting",
    defaultMessage: "Stop waiting",
  },
  lifecycleNotSent: {
    id: "session.notSent",
    defaultMessage:
      "Continue working was not sent. You can try again before sign-in expires.",
  },
  lifecycleUnknown: {
    id: "session.unknown",
    defaultMessage:
      "We cannot confirm whether Continue working succeeded. Content is hidden. Refresh to check your sign-in.",
  },
  lifecycleDenied: {
    id: "session.denied",
    defaultMessage:
      "Continue working was not accepted. Content is hidden. Refresh to check your sign-in.",
  },
  lifecycleRecoveryFailed: {
    id: "session.recoveryFailed",
    defaultMessage:
      "We could not check your sign-in and access. Content remains hidden. Try Refresh again.",
  },
  lifecycleStopped: {
    id: "session.stopped",
    defaultMessage:
      "You stopped waiting. Content remains hidden. Refresh to check again.",
  },
  lifecycleSucceeded: {
    id: "session.succeeded",
    defaultMessage: "Continue working succeeded.",
  },
  lifecycleDeadlineReached: {
    id: "session.deadlineReached",
    defaultMessage:
      "Your observed sign-in deadline has been reached. Content is hidden. Refresh to check your sign-in.",
  },
  lifecycleRefresh: { id: "session.refresh", defaultMessage: "Refresh" },
  lifecycleWarning: {
    id: "session.warning",
    defaultMessage: "Your sign-in is nearing expiry.",
  },
  lifecycleWarningHelp: {
    id: "session.warningHelp",
    defaultMessage:
      "Continue working or sign out. Sign-in expiry does not end your tutoring session.",
  },
  lifecycleContinue: {
    id: "session.continue",
    defaultMessage: "Continue working",
  },
  lifecycleShieldTitle: { id: "session.shieldTitle", defaultMessage: "MIA" },
  lifecycleShieldHeading: {
    id: "session.shieldHeading",
    defaultMessage: "Content hidden",
  },
  lifecycleShieldHelp: {
    id: "session.shieldHelp",
    defaultMessage:
      "Refresh to check your sign-in and access before showing content again.",
  },
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
    defaultMessage: "Choose an area from the navigation to continue.",
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
  loginForgotPassword: {
    id: "login.forgotPassword",
    defaultMessage: "Forgot your password?",
  },
  recoveryPageTitle: {
    id: "entry.recovery.pageTitle",
    defaultMessage: "Recover access | MIA",
  },
  recoveryHeading: {
    id: "entry.recovery.heading",
    defaultMessage: "Recover access",
  },
  recoveryIntroduction: {
    id: "entry.recovery.introduction",
    defaultMessage:
      "Staff accounts: enter your username, and MIA emails a password-reset link to the verified address of an eligible account. Students: ask your supervisor to set a temporary password.",
  },
  recoverySubmit: {
    id: "entry.recovery.submit",
    defaultMessage: "Send reset link",
  },
  recoverySendAgain: {
    id: "entry.recovery.sendAgain",
    defaultMessage: "Send again",
  },
  recoverySubmitting: {
    id: "entry.recovery.submitting",
    defaultMessage: "Sending your request…",
  },
  recoveryAcceptedHeading: {
    id: "entry.recovery.accepted.heading",
    defaultMessage: "Check your email",
  },
  recoveryAccepted: {
    id: "entry.recovery.accepted",
    defaultMessage:
      "If an eligible account exists, we've sent an email with a password-reset link. Any link expires 30 minutes after it is sent.",
  },
  recoveryCsrfRejected: {
    id: "entry.recovery.csrfRejected",
    defaultMessage:
      "The security check for this page expired. Send the request again.",
  },
  recoveryUnknown: {
    id: "entry.recovery.unknown",
    defaultMessage:
      "We couldn't confirm your request. An email may still arrive, so check your email before sending again.",
  },
  authRequestFailed: {
    id: "entry.authRequest.failed",
    defaultMessage: "Your request couldn't be processed. Try again later.",
  },
  backToSignIn: {
    id: "entry.backToSignIn",
    defaultMessage: "Back to sign-in",
  },
  resetPageTitle: {
    id: "entry.reset.pageTitle",
    defaultMessage: "Reset password | MIA",
  },
  resetHeading: {
    id: "entry.reset.heading",
    defaultMessage: "Reset password",
  },
  resetIntroduction: {
    id: "entry.reset.introduction",
    defaultMessage: "Choose a new password for your account.",
  },
  resetSubmit: {
    id: "entry.reset.submit",
    defaultMessage: "Change password",
  },
  resetSubmitting: {
    id: "entry.reset.submitting",
    defaultMessage: "Changing your password…",
  },
  resetThrottled: {
    id: "entry.reset.throttled",
    defaultMessage: "Too many attempts. Try again later.",
  },
  resetCsrfRejected: {
    id: "entry.reset.csrfRejected",
    defaultMessage:
      "The security check for this page expired. Enter your new password again and submit it.",
  },
  resetLinkUnusableHeading: {
    id: "entry.reset.linkUnusable.heading",
    defaultMessage: "This link is invalid or no longer usable",
  },
  resetLinkUnusable: {
    id: "entry.reset.linkUnusable",
    defaultMessage: "Request a new password-reset link, or go back to sign-in.",
  },
  resetRequestNewLink: {
    id: "entry.reset.requestNewLink",
    defaultMessage: "Request a new link",
  },
  resetUnknownHeading: {
    id: "entry.reset.unknown.heading",
    defaultMessage: "Password change not confirmed",
  },
  resetUnknown: {
    id: "entry.reset.unknown",
    defaultMessage:
      "We couldn't confirm whether your password was changed. Try signing in with your new password. If that doesn't work, request a new link.",
  },
  resetTrySignIn: {
    id: "entry.reset.trySignIn",
    defaultMessage: "Try signing in with your new password",
  },
  resetChangedHeading: {
    id: "entry.reset.changed.heading",
    defaultMessage: "Your password has been changed.",
  },
  resetChangedMfa: {
    id: "entry.reset.changed.mfa",
    defaultMessage:
      "If you use multi-factor authentication, it remains enabled.",
  },
  resetChangedOtherBrowsers: {
    id: "entry.reset.changed.otherBrowsers",
    defaultMessage:
      "Other browsers where you are signed in are not signed out automatically. Those sign-ins expire on their own.",
  },
  resetSignedInIntroduction: {
    id: "entry.reset.signedIn.introduction",
    defaultMessage:
      "You're currently signed in. To reset a password with this link, sign out first.",
  },
  resetSignOutAndContinue: {
    id: "entry.reset.signOutAndContinue",
    defaultMessage: "Sign out and continue",
  },
  resetGoBack: {
    id: "entry.reset.goBack",
    defaultMessage: "Go back",
  },
  resetSignedOut: {
    id: "entry.reset.signedOut",
    defaultMessage: "Signed out. You can now choose a new password.",
  },
  resetRejectedHeading: {
    id: "entry.reset.rejected.heading",
    defaultMessage: "Password not changed",
  },
  invitationPageTitle: {
    id: "entry.invitation.pageTitle",
    defaultMessage: "Invitation | MIA",
  },
  invitationHeading: {
    id: "entry.invitation.heading",
    defaultMessage: "Your MIA invitation",
  },
  invitationAcceptPageTitle: {
    id: "entry.invitation.accept.pageTitle",
    defaultMessage: "Create account | MIA",
  },
  invitationAcceptHeading: {
    id: "entry.invitation.accept.heading",
    defaultMessage: "Create your MIA account",
  },
  invitationChecking: {
    id: "entry.invitation.checking",
    defaultMessage: "Checking your invitation…",
  },
  invitationSignedInIntroduction: {
    id: "entry.invitation.signedIn.introduction",
    defaultMessage:
      "You're currently signed in. To use this invitation, sign out first.",
  },
  invitationSignedOut: {
    id: "entry.invitation.signedOut",
    defaultMessage: "Signed out. Checking your invitation…",
  },
  invitationPreviewIntroduction: {
    id: "entry.invitation.preview.introduction",
    defaultMessage:
      "You've been invited to create a MIA account. Accepting creates the account; you then sign in as usual.",
  },
  invitationRole: {
    id: "entry.invitation.preview.role",
    defaultMessage: "Invited role: {role}",
  },
  roleAdministrator: {
    id: "entry.role.administrator",
    defaultMessage: "Administrator",
  },
  roleSupervisor: {
    id: "entry.role.supervisor",
    defaultMessage: "Supervisor",
  },
  roleMentor: {
    id: "entry.role.mentor",
    defaultMessage: "Mentor",
  },
  invitationAccept: {
    id: "entry.invitation.preview.accept",
    defaultMessage: "Accept invitation",
  },
  invitationPreviewThrottled: {
    id: "entry.invitation.preview.throttled",
    defaultMessage:
      "Too many attempts to check this invitation. Try again once the wait has passed.",
  },
  invitationPreviewCsrfRejected: {
    id: "entry.invitation.preview.csrfRejected",
    defaultMessage: "The security check for this page expired. Try again.",
  },
  invitationPreviewNotSent: {
    id: "entry.invitation.preview.notSent",
    defaultMessage:
      "Your invitation could not be checked because the request was not sent. Try again.",
  },
  invitationTryAgain: {
    id: "entry.invitation.preview.tryAgain",
    defaultMessage: "Try again",
  },
  invitationLostHeading: {
    id: "entry.invitation.lost.heading",
    defaultMessage: "Invitation could not be checked",
  },
  invitationLost: {
    id: "entry.invitation.lost",
    defaultMessage:
      "MIA could not check this invitation. To try again, open the link in your invitation email again.",
  },
  invitationInvalidHeading: {
    id: "entry.invitation.invalid.heading",
    defaultMessage: "This invitation link is invalid or no longer usable",
  },
  invitationInvalid: {
    id: "entry.invitation.invalid",
    defaultMessage:
      "If you already have an account, sign in. Otherwise, ask the person who invited you for a new invitation.",
  },
  invitationAcceptIntroduction: {
    id: "entry.invitation.accept.introduction",
    defaultMessage:
      "Choose your username and password, and confirm your language, country, and time zone.",
  },
  invitationUsernameHelp: {
    id: "entry.invitation.username.help",
    defaultMessage:
      "3 to 32 characters: letters A–Z, digits, periods, underscores, or hyphens. Start and end with a letter or digit.",
  },
  invitationLanguageLabel: {
    id: "entry.invitation.language.label",
    defaultMessage: "Language (required)",
  },
  invitationCountryLabel: {
    id: "entry.invitation.country.label",
    defaultMessage: "Country (required)",
  },
  invitationCountryEmpty: {
    id: "entry.invitation.country.empty",
    defaultMessage: "Choose a country",
  },
  invitationCountryMissing: {
    id: "entry.invitation.country.missing",
    defaultMessage: "Choose your country.",
  },
  invitationTimeZoneLabel: {
    id: "entry.invitation.timeZone.label",
    defaultMessage: "Time zone (required)",
  },
  invitationSubmit: {
    id: "entry.invitation.submit",
    defaultMessage: "Create account",
  },
  invitationSubmitting: {
    id: "entry.invitation.submitting",
    defaultMessage: "Creating your account…",
  },
  invitationStopWaiting: {
    id: "entry.invitation.stopWaiting",
    defaultMessage: "Stop waiting",
  },
  invitationUsernameTaken: {
    id: "entry.invitation.usernameTaken",
    defaultMessage:
      "That username is already taken. Choose another username, enter your password again, and submit.",
  },
  invitationPasswordRejected: {
    id: "entry.invitation.passwordRejected",
    defaultMessage:
      "That password was not accepted. Choose a different password that meets the rules above and submit.",
  },
  invitationRequestInvalid: {
    id: "entry.invitation.requestInvalid",
    defaultMessage:
      "Some details were not accepted. Check your username and the other fields, enter your password again, and submit.",
  },
  invitationThrottled: {
    id: "entry.invitation.throttled",
    defaultMessage:
      "Too many attempts. Enter your password again and submit once the wait has passed.",
  },
  invitationCsrfRejected: {
    id: "entry.invitation.csrfRejected",
    defaultMessage:
      "The security check for this page expired. Enter your password again and submit.",
  },
  invitationNotSent: {
    id: "entry.invitation.notSent",
    defaultMessage:
      "Your account was not created because the request was not sent. Submit again.",
  },
  invitationCreatedHeading: {
    id: "entry.invitation.created.heading",
    defaultMessage: "Your account has been created.",
  },
  invitationCreated: {
    id: "entry.invitation.created",
    defaultMessage:
      "You are not signed in yet. Sign in with the username and password you chose.",
  },
  invitationNotCreatedHeading: {
    id: "entry.invitation.notCreated.heading",
    defaultMessage: "Account not created",
  },
  invitationEmailRegistered: {
    id: "entry.invitation.emailRegistered",
    defaultMessage:
      "An account already uses the email address this invitation was sent to. Sign in with that account, or ask the person who invited you for help.",
  },
  invitationUnknownHeading: {
    id: "entry.invitation.unknown.heading",
    defaultMessage: "Account creation not confirmed",
  },
  invitationUnknown: {
    id: "entry.invitation.unknown",
    defaultMessage:
      "We couldn't confirm whether your account was created. Try signing in with the username and password you chose, or open the link in your invitation email again. Neither step proves whether the account was created.",
  },
  lifecycleAccessLost: {
    id: "session.accessLost",
    defaultMessage:
      "MIA could not confirm your sign-in or access. Content is hidden. Refresh to check your sign-in.",
  },
  shellNavigationLabel: {
    id: "shell.navigation.label",
    defaultMessage: "Application",
  },
  shellOpenNavigation: {
    id: "shell.navigation.open",
    defaultMessage: "Open navigation",
  },
  shellCloseNavigation: {
    id: "shell.navigation.close",
    defaultMessage: "Close navigation",
  },
  shellHomeLink: {
    id: "shell.navigation.home",
    defaultMessage: "Home",
  },
  shellProfileSecurityGroup: {
    id: "shell.navigation.profileSecurity",
    defaultMessage: "Profile and security",
  },
  shellMfaLink: {
    id: "shell.navigation.mfa",
    defaultMessage: "Multi-factor authentication",
  },
  shellProductName: {
    id: "shell.productName",
    defaultMessage: "MIA",
  },
  mfaOverviewPageTitle: {
    id: "mfa.overview.pageTitle",
    defaultMessage: "Multi-factor authentication | MIA",
  },
  mfaOverviewHeading: {
    id: "mfa.overview.heading",
    defaultMessage: "Multi-factor authentication",
  },
  mfaEnrollPageTitle: {
    id: "mfa.enroll.pageTitle",
    defaultMessage: "Set up multi-factor authentication | MIA",
  },
  mfaEnrollHeading: {
    id: "mfa.enroll.heading",
    defaultMessage: "Set up multi-factor authentication",
  },
  mfaVerifyPageTitle: {
    id: "mfa.verify.pageTitle",
    defaultMessage: "Verify multi-factor authentication | MIA",
  },
  mfaVerifyHeading: {
    id: "mfa.verify.heading",
    defaultMessage: "Verify multi-factor authentication",
  },
  mfaCodesPageTitle: {
    id: "mfa.codes.pageTitle",
    defaultMessage: "MFA recovery codes | MIA",
  },
  mfaCodesHeading: {
    id: "mfa.codes.heading",
    defaultMessage: "MFA recovery codes",
  },
  mfaBackToHome: {
    id: "mfa.backToHome",
    defaultMessage: "Back to Home",
  },
  mfaBackToOverview: {
    id: "mfa.backToOverview",
    defaultMessage: "Back to multi-factor authentication",
  },
  mfaOverviewIntroduction: {
    id: "mfa.overview.introduction",
    defaultMessage:
      "Multi-factor authentication asks for a code from another device each time you sign in.",
  },
  mfaStatusOn: {
    id: "mfa.status.on",
    defaultMessage: "Multi-factor authentication is on",
  },
  mfaStatusOnTotp: {
    id: "mfa.status.onTotp",
    defaultMessage:
      "You confirm each sign-in with a code from your authenticator app.",
  },
  mfaStatusOnSms: {
    id: "mfa.status.onSms",
    defaultMessage:
      "You confirm each sign-in with a code sent by text message.",
  },
  mfaStatusOnCodesNote: {
    id: "mfa.status.onCodesNote",
    defaultMessage:
      "Recovery codes are shown only once, when multi-factor authentication is set up.",
  },
  mfaStatusOff: {
    id: "mfa.status.off",
    defaultMessage: "Multi-factor authentication is off",
  },
  mfaStatusOffHelp: {
    id: "mfa.status.offHelp",
    defaultMessage:
      "Set up an authenticator app to add a second step when you sign in.",
  },
  mfaStatusUnavailable: {
    id: "mfa.status.unavailable",
    defaultMessage: "Setup is not available for your account right now.",
  },
  mfaStatusPending: {
    id: "mfa.status.pending",
    defaultMessage: "Setup is pending",
  },
  mfaPendingExpires: {
    id: "mfa.status.pendingExpires",
    defaultMessage: "This setup expires on {expiresAt}.",
  },
  mfaPendingSms: {
    id: "mfa.status.pendingSms",
    defaultMessage:
      "This pending text-message setup can only be cancelled here.",
  },
  mfaSetUp: {
    id: "mfa.action.setUp",
    defaultMessage: "Set up authenticator app",
  },
  mfaContinueSetup: {
    id: "mfa.action.continueSetup",
    defaultMessage: "Continue setup",
  },
  mfaCancelSetup: {
    id: "mfa.action.cancelSetup",
    defaultMessage: "Cancel setup",
  },
  mfaEnrollIntroduction: {
    id: "mfa.enroll.introduction",
    defaultMessage:
      "You need an authenticator app on another device, such as your phone.",
  },
  mfaEnrollStepStart: {
    id: "mfa.enroll.stepStart",
    defaultMessage: "Start setup to get a QR code and a setup key.",
  },
  mfaEnrollStepScan: {
    id: "mfa.enroll.stepScan",
    defaultMessage:
      "Scan the QR code with your authenticator app, or enter the setup key.",
  },
  mfaEnrollStepCode: {
    id: "mfa.enroll.stepCode",
    defaultMessage:
      "Enter the six-digit code that your authenticator app shows.",
  },
  mfaStartSetup: {
    id: "mfa.action.startSetup",
    defaultMessage: "Start setup",
  },
  mfaStarting: {
    id: "mfa.progress.starting",
    defaultMessage: "Starting setup…",
  },
  mfaAlreadyOn: {
    id: "mfa.enroll.alreadyOn",
    defaultMessage: "Multi-factor authentication is already on.",
  },
  mfaVerifyIntroduction: {
    id: "mfa.verify.introduction",
    defaultMessage:
      "Add MIA to your authenticator app, then enter the code it shows.",
  },
  mfaQrLabel: {
    id: "mfa.setup.qrLabel",
    defaultMessage: "QR code for adding MIA to your authenticator app",
  },
  mfaManualHeading: {
    id: "mfa.setup.manualHeading",
    defaultMessage: "Manual setup",
  },
  mfaManualHelp: {
    id: "mfa.setup.manualHelp",
    defaultMessage:
      "If you cannot scan the QR code, enter these values in your authenticator app.",
  },
  mfaIssuer: {
    id: "mfa.setup.issuer",
    defaultMessage: "Issuer",
  },
  mfaAccount: {
    id: "mfa.setup.account",
    defaultMessage: "Account",
  },
  mfaSecret: {
    id: "mfa.setup.secret",
    defaultMessage: "Setup key",
  },
  mfaAlgorithm: {
    id: "mfa.setup.algorithm",
    defaultMessage: "Algorithm",
  },
  mfaDigits: {
    id: "mfa.setup.digits",
    defaultMessage: "Digits",
  },
  mfaPeriod: {
    id: "mfa.setup.period",
    defaultMessage: "Time step",
  },
  mfaPeriodValue: {
    id: "mfa.setup.periodValue",
    defaultMessage: "{seconds, plural, one {# second} other {# seconds}}",
  },
  mfaSetupHidden: {
    id: "mfa.setup.hidden",
    defaultMessage: "Setup details are hidden",
  },
  mfaSetupHiddenHelp: {
    id: "mfa.setup.hiddenHelp",
    defaultMessage:
      "The QR code and setup key were hidden while you were away. Show them again when no one else can see your screen.",
  },
  mfaRevealSetup: {
    id: "mfa.setup.reveal",
    defaultMessage: "Show setup details",
  },
  mfaSetupNotShown: {
    id: "mfa.setup.notShown",
    defaultMessage:
      "The QR code and setup key for this setup cannot be shown again. If you already added MIA to your authenticator app, enter its current code. Otherwise, cancel this setup and start again.",
  },
  mfaUriRejected: {
    id: "mfa.setup.uriRejected",
    defaultMessage:
      "MIA received setup data it cannot use, so no QR code or setup key is shown. Cancel this setup and start again.",
  },
  mfaEnrollCodeLabel: {
    id: "mfa.verify.codeLabel",
    defaultMessage: "Six-digit code from your authenticator app (required)",
  },
  mfaEnrollCodeHelp: {
    id: "mfa.verify.codeHelp",
    defaultMessage:
      "Enter the code that is currently shown. Leading zeros count.",
  },
  mfaEnrollCodeLocalInvalid: {
    id: "mfa.verify.localInvalid",
    defaultMessage: "Enter exactly six digits.",
  },
  mfaVerifySubmit: {
    id: "mfa.action.verify",
    defaultMessage: "Verify code",
  },
  mfaVerifying: {
    id: "mfa.progress.verifying",
    defaultMessage: "Checking your code…",
  },
  mfaCancelling: {
    id: "mfa.progress.cancelling",
    defaultMessage: "Cancelling setup…",
  },
  mfaStatusReconciling: {
    id: "mfa.progress.reconciling",
    defaultMessage: "Checking your multi-factor authentication status…",
  },
  mfaNoPending: {
    id: "mfa.verify.noPending",
    defaultMessage: "There is no pending setup to verify.",
  },
  mfaCodeInvalid: {
    id: "mfa.outcome.codeInvalid",
    defaultMessage:
      "That code was not accepted. Enter the current code from your authenticator app.",
  },
  mfaSetupGone: {
    id: "mfa.outcome.setupGone",
    defaultMessage:
      "This setup has ended. It may have expired or received too many incorrect codes. Start a new setup.",
  },
  mfaCodesLost: {
    id: "mfa.outcome.codesLost",
    defaultMessage:
      "Multi-factor authentication is now on, but the recovery codes from this setup could not be shown. They cannot be retrieved. Only a future replacement of this factor issues new codes.",
  },
  mfaVerifyUnknownPending: {
    id: "mfa.outcome.verifyUnknownPending",
    defaultMessage:
      "We could not confirm whether your code was accepted. The setup is still pending, so you can enter a new code.",
  },
  mfaVerifyRejected: {
    id: "mfa.outcome.verifyRejected",
    defaultMessage: "Your code could not be checked.",
  },
  mfaNotSent: {
    id: "mfa.outcome.notSent",
    defaultMessage:
      "The request was not sent. Check your connection and try again.",
  },
  mfaSettingsThrottled: {
    id: "mfa.outcome.throttled",
    defaultMessage:
      "There have been too many attempts. Wait a while before trying again.",
  },
  mfaStartRejected: {
    id: "mfa.outcome.startRejected",
    defaultMessage: "Setup could not be started.",
  },
  mfaStartUnknownPending: {
    id: "mfa.outcome.startUnknownPending",
    defaultMessage:
      "We could not confirm the setup response. A setup is pending, but its QR code and setup key cannot be shown.",
  },
  mfaStartUnknownNone: {
    id: "mfa.outcome.startUnknownNone",
    defaultMessage: "Setup did not start. You can start again.",
  },
  mfaPendingExists: {
    id: "mfa.outcome.pendingExists",
    defaultMessage:
      "A setup is already pending. Continue it or cancel it before starting again.",
  },
  mfaCancelled: {
    id: "mfa.outcome.cancelled",
    defaultMessage: "Setup cancelled.",
  },
  mfaCancelGone: {
    id: "mfa.outcome.cancelGone",
    defaultMessage: "This setup no longer exists.",
  },
  mfaCancelRejected: {
    id: "mfa.outcome.cancelRejected",
    defaultMessage: "The setup could not be cancelled.",
  },
  mfaCancelUnknownPending: {
    id: "mfa.outcome.cancelUnknownPending",
    defaultMessage:
      "We could not confirm whether the setup was cancelled. It is still pending, so you can cancel it again.",
  },
  mfaCancelUnknownGone: {
    id: "mfa.outcome.cancelUnknownGone",
    defaultMessage: "The setup is no longer pending.",
  },
  mfaCheckFailed: {
    id: "mfa.outcome.checkFailed",
    defaultMessage:
      "We could not check your multi-factor authentication status.",
  },
  mfaCheckAgain: {
    id: "mfa.action.checkAgain",
    defaultMessage: "Check again",
  },
  mfaCodesWarningHeading: {
    id: "mfa.codes.warningHeading",
    defaultMessage: "Save these recovery codes now",
  },
  mfaCodesWarning: {
    id: "mfa.codes.warning",
    defaultMessage:
      "Each code works once if you cannot use your authenticator app. MIA shows these codes only now and cannot show them again. MIA cannot remove copies from your clipboard, screenshots, print queue, or paper.",
  },
  mfaCodesListLabel: {
    id: "mfa.codes.listLabel",
    defaultMessage: "Recovery codes",
  },
  mfaCopyCodes: {
    id: "mfa.codes.copy",
    defaultMessage: "Copy all recovery codes",
  },
  mfaCopyCodesSuccess: {
    id: "mfa.codes.copySuccess",
    defaultMessage: "Recovery codes copied.",
  },
  mfaCopyCodesFailure: {
    id: "mfa.codes.copyFailure",
    defaultMessage:
      "Recovery codes could not be copied. Select and copy them manually.",
  },
  mfaPrintCodes: {
    id: "mfa.codes.print",
    defaultMessage: "Print recovery codes",
  },
  mfaPrintFailure: {
    id: "mfa.codes.printFailure",
    defaultMessage:
      "Printing could not start. Copy the codes or write them down.",
  },
  mfaPrintInitiated: {
    id: "mfa.codes.printInitiated",
    defaultMessage: "Print dialog requested. Printing is not confirmed.",
  },
  mfaCodesStorageLegend: {
    id: "mfa.codes.storageLegend",
    defaultMessage: "Safe storage confirmation",
  },
  mfaCodesAcknowledge: {
    id: "mfa.codes.acknowledge",
    defaultMessage: "I have saved my recovery codes",
  },
  mfaCodesAcknowledgeHelp: {
    id: "mfa.codes.acknowledgeHelp",
    defaultMessage:
      "Store them somewhere safe and private. You will not see them again.",
  },
  mfaCodesDone: {
    id: "mfa.codes.done",
    defaultMessage: "Done",
  },
  mfaCodesAcknowledgeFirst: {
    id: "mfa.codes.acknowledgeFirst",
    defaultMessage: "Confirm that you saved your recovery codes first.",
  },
  mfaCodesHidden: {
    id: "mfa.codes.hidden",
    defaultMessage: "Recovery codes are hidden",
  },
  mfaCodesHiddenHelp: {
    id: "mfa.codes.hiddenHelp",
    defaultMessage:
      "Your recovery codes were hidden while you were away. Show them again when no one else can see your screen.",
  },
  mfaRevealCodes: {
    id: "mfa.codes.reveal",
    defaultMessage: "Show recovery codes",
  },
  mfaCodesUnavailable: {
    id: "mfa.codes.unavailable",
    defaultMessage:
      "Recovery codes are no longer available. They are shown only once and cannot be retrieved. Only a future replacement of this factor issues new codes.",
  },
});

export type MessageId = (typeof messages)[keyof typeof messages]["id"];
