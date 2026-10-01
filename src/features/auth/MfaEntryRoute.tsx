import { useEffect } from "react";
import { useIntl } from "react-intl";
import { useLocation } from "react-router";
import { messages } from "../../platform/i18n/messages";
import { RestrictedLogoutControl } from "./RestrictedLogoutControl";
import { MfaVerificationForm } from "./MfaVerificationForm";
import {
  useAuthenticationBootstrapState,
  useSessionActions,
} from "../../platform/data/EntryDataProvider";

export default function MfaEntryRoute() {
  const intl = useIntl();
  const location = useLocation();
  const state = useAuthenticationBootstrapState();
  const { selectMfaRoute } = useSessionActions();
  const route =
    location.pathname === "/auth/mfa/recovery" ? "recovery" : "challenge";
  const securityContext =
    state.kind === "MFA required" ||
    (state.kind === "Rotating" && state.origin === "mfa")
      ? `${state.accountId}:${state.challengeId}`
      : "unavailable";
  const expired =
    state.kind === "MFA required" && state.outcome?.kind === "expired";
  useEffect(() => {
    if (state.kind === "MFA required" && state.route !== route)
      selectMfaRoute(route);
  }, [route, selectMfaRoute, state]);
  return (
    <>
      <p className="mt-3 text-center text-sm/6 text-gray-600">
        {intl.formatMessage(
          expired
            ? messages.mfaRestartIntroduction
            : route === "challenge"
              ? messages.mfaIntroduction
              : messages.mfaRecoveryIntroduction,
        )}
      </p>
      <MfaVerificationForm key={`${securityContext}:${route}`} route={route} />
      <RestrictedLogoutControl />
    </>
  );
}
