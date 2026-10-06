import { useIntl } from "react-intl";
import { messages } from "../../platform/i18n/messages";
import { mfaPaths } from "../../platform/session/mfaEnrollment";
import { MfaActivityFeedback } from "./MfaActivityFeedback";
import type { MfaRouteProps } from "./MfaRouteProps";
import {
  MfaStatusPanel,
  PendingSetupPanel,
  PrimaryLink,
  TextLink,
} from "./MfaStatusPanel";
import { isBusy, useMfaSnapshot } from "./mfaOutcome";

export default function MfaOverviewRoute({ state }: MfaRouteProps) {
  const intl = useIntl();
  const { activity } = useMfaSnapshot();
  const active = state.activeFactor;
  return (
    <>
      <p className="mt-3 text-center text-sm/6 text-gray-600">
        {intl.formatMessage(messages.mfaOverviewIntroduction)}
      </p>
      {active !== null ? (
        <MfaStatusPanel heading={messages.mfaStatusOn}>
          <p>
            {intl.formatMessage(
              active.method === "totp"
                ? messages.mfaStatusOnTotp
                : messages.mfaStatusOnSms,
            )}
          </p>
          <p>{intl.formatMessage(messages.mfaStatusOnCodesNote)}</p>
        </MfaStatusPanel>
      ) : state.pendingEnrollment === null ? (
        <MfaStatusPanel
          heading={messages.mfaStatusOff}
          {...(state.actions.enroll
            ? {
                actions: (
                  <PrimaryLink to={mfaPaths.enroll}>
                    {intl.formatMessage(messages.mfaSetUp)}
                  </PrimaryLink>
                ),
              }
            : {})}
        >
          <p>
            {intl.formatMessage(
              state.actions.enroll
                ? messages.mfaStatusOffHelp
                : messages.mfaStatusUnavailable,
            )}
          </p>
        </MfaStatusPanel>
      ) : null}
      <PendingSetupPanel
        state={state}
        busy={isBusy(activity)}
        canContinue={true}
      />
      <MfaActivityFeedback activity={activity} state={state} />
      <TextLink to="/">{intl.formatMessage(messages.mfaBackToHome)}</TextLink>
    </>
  );
}
