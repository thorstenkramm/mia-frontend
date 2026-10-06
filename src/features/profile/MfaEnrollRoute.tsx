import { useIntl } from "react-intl";
import { Navigate } from "react-router";
import { useMfaEnrollment } from "../../platform/data/EntryDataProvider";
import { messages } from "../../platform/i18n/messages";
import { mfaPaths } from "../../platform/session/mfaEnrollment";
import { MfaActivityFeedback } from "./MfaActivityFeedback";
import type { MfaRouteProps } from "./MfaRouteProps";
import {
  MfaStatusPanel,
  PendingSetupPanel,
  PrimaryButton,
  TextLink,
} from "./MfaStatusPanel";
import { isBusy, useMfaSnapshot } from "./mfaOutcome";

export default function MfaEnrollRoute({ state }: MfaRouteProps) {
  const intl = useIntl();
  const mfa = useMfaEnrollment();
  const { activity, setup } = useMfaSnapshot();
  const busy = isBusy(activity);
  // A started enrollment continues on the verify route, which owns its setup.
  if (setup.kind === "Visible" || setup.kind === "Masked")
    return <Navigate replace to={mfaPaths.verify} />;

  let content;
  if (state.activeFactor !== null)
    content = (
      <p className="mt-8 text-sm/6 text-gray-900">
        {intl.formatMessage(messages.mfaAlreadyOn)}
      </p>
    );
  else if (state.pendingEnrollment !== null)
    content = (
      <PendingSetupPanel
        state={state}
        busy={busy}
        canContinue={setup.kind !== "Rejected"}
      />
    );
  else if (!state.actions.enroll)
    content = (
      <p className="mt-8 text-sm/6 text-gray-900">
        {intl.formatMessage(messages.mfaStatusUnavailable)}
      </p>
    );
  else
    content = (
      <MfaStatusPanel
        heading={messages.mfaSetUp}
        actions={
          <PrimaryButton disabled={busy} onClick={() => void mfa.start()}>
            {intl.formatMessage(messages.mfaStartSetup)}
          </PrimaryButton>
        }
      >
        <p>{intl.formatMessage(messages.mfaEnrollIntroduction)}</p>
        <ol className="list-decimal space-y-1 pl-5">
          <li>{intl.formatMessage(messages.mfaEnrollStepStart)}</li>
          <li>{intl.formatMessage(messages.mfaEnrollStepScan)}</li>
          <li>{intl.formatMessage(messages.mfaEnrollStepCode)}</li>
        </ol>
      </MfaStatusPanel>
    );

  return (
    <>
      {content}
      <MfaActivityFeedback activity={activity} state={state} />
      <TextLink to={mfaPaths.overview}>
        {intl.formatMessage(messages.mfaBackToOverview)}
      </TextLink>
    </>
  );
}
