import { useIntl } from "react-intl";
import { Navigate } from "react-router";
import { messages } from "../../platform/i18n/messages";
import { RouteDepartureLink } from "../../platform/ui/RouteDepartureLink";
import {
  TutoringEmpty,
  tutoringActionClass,
} from "./SessionStartCourseChoiceRoute";
import type { TutoringRouteProps } from "./TutoringRouteProps";

// ROUTE-INVENTORY.md §Session Recovery: the host already ran the one BCG-002
// discovery read. A found active session is replaced by its workspace path;
// the explicit-null result is the fixed none state with Start and Home exits.
// No retained session identity is ever required or fabricated.
export default function SessionRecoveryRoute(props: TutoringRouteProps) {
  if (props.resource.kind !== "recovery")
    throw new Error("Session recovery requires its admitted discovery.");
  if (props.resource.active !== null)
    return (
      <Navigate replace to={props.links.workspace(props.resource.active.id)} />
    );
  return <NoActiveSession {...props} />;
}

function NoActiveSession({ links }: TutoringRouteProps) {
  const intl = useIntl();
  return (
    <TutoringEmpty
      text={intl.formatMessage(messages.tutoringRecoveryNone)}
      action={
        <div className="flex flex-wrap justify-center gap-3">
          <RouteDepartureLink to={links.start} className={tutoringActionClass}>
            {intl.formatMessage(messages.tutoringStartHeading)}
          </RouteDepartureLink>
          <RouteDepartureLink to={links.home} className={tutoringActionClass}>
            {intl.formatMessage(messages.invitationsBackToHome)}
          </RouteDepartureLink>
        </div>
      }
    />
  );
}
