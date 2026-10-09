import { useLayoutEffect } from "react";
import { useIntl } from "react-intl";
import type { CourseRouteProps } from "./CourseRouteProps";
import { useCourseActivation } from "./useCourseActivation";
import { CoursePreparationStatus } from "./CoursePreparationRoute";
import {
  CourseReadinessChecklist,
  CourseActivationAvailability,
} from "./CourseReadinessChecklist";
import { CourseCheckedAt, courseActionClass } from "./CourseListRoute";
import { messages } from "../../platform/i18n/messages";
import { AuthSubmitButton } from "../../platform/ui/AuthSubmitButton";
import { RouteDepartureLink } from "../../platform/ui/RouteDepartureLink";
import { DiscardChangesDialog } from "../../platform/ui/DiscardChangesDialog";
import { TechnicalErrorDisclosure } from "../../platform/api/TechnicalErrorDisclosure";

// Tailwind Plus: Application UI > Forms > Action Panels > Simple;
// 2026-09-13-083323, v4/react-light.jsx. MIA: route h2, fixed activation effect,
// native form Action, wrapped submit/parent/reconciliation controls, no modal.
// Submit reuses the established AuthSubmitButton (Simple card button binding)
// so focusable unavailable/pending semantics have one owner, not a copied handler.
export default function CourseActivationRoute(props: CourseRouteProps) {
  if (props.resource.kind !== "activation")
    throw new Error("Activation requires its admitted resource.");
  return <Activation {...props} initial={props.resource.preparation} />;
}
function Activation({
  initial,
  links,
  unavailable,
}: Omit<CourseRouteProps, "resource"> & {
  readonly initial: Extract<
    CourseRouteProps["resource"],
    { kind: "readiness" | "activation" }
  >["preparation"];
}) {
  const intl = useIntl();
  const operation = useCourseActivation(
    initial,
    links.preparation(initial.course.id),
    unavailable,
  );
  const { status, feedback } = operation;
  useLayoutEffect(() => {
    if (feedback !== null) status.current?.focus();
  }, [feedback, status]);
  const waiting =
    operation.state.kind === "Checking" ||
    operation.state.kind === "Submitting" ||
    operation.state.kind === "Reconciling";
  // React Action pending is immediate even while its state updates are deferred.
  const actionPending =
    operation.state.kind === "Checking" ||
    operation.state.kind === "Submitting";
  return (
    <>
      <CoursePreparationStatus preparation={operation.applied} />
      <CourseCheckedAt time={operation.checkedAt} />
      <CourseReadinessChecklist preparation={operation.applied} links={links} />
      <CourseActivationAvailability preparation={operation.applied} />
      <div className="mt-6 bg-white shadow-sm sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h2
            ref={status}
            tabIndex={-1}
            className="text-base font-semibold text-gray-900"
          >
            {intl.formatMessage(feedback ?? messages.courseActivationHeading)}
          </h2>
          <div className="mt-2 max-w-xl text-sm/6 text-gray-700">
            <p>{intl.formatMessage(messages.courseActivationEffect)}</p>
          </div>
          {actionPending ? (
            <p className="mt-3 text-sm/6 text-gray-700">
              {intl.formatMessage(
                operation.state.kind === "Checking"
                  ? messages.courseActivationChecking
                  : messages.courseActivationSending,
              )}
            </p>
          ) : null}
          {operation.error ? (
            <TechnicalErrorDisclosure error={operation.error} />
          ) : null}
          <form
            onSubmit={operation.guardSubmit}
            action={operation.action}
            className="mt-5 flex flex-wrap items-center gap-3"
          >
            {!operation.unknown ? (
              <AuthSubmitButton
                enabled={operation.enabled}
                label={intl.formatMessage(messages.courseActivationConfirm)}
              />
            ) : null}
            {waiting || actionPending ? (
              <button
                type="button"
                className={courseActionClass}
                onClick={operation.stop}
              >
                {intl.formatMessage(messages.lifecycleStopWaiting)}
              </button>
            ) : (
              <button
                type="button"
                className={courseActionClass}
                onClick={() => void operation.reconcile()}
              >
                {intl.formatMessage(messages.invitationsRefresh)}
              </button>
            )}
            {operation.canAbandon ? (
              <button
                type="button"
                className={courseActionClass}
                onClick={operation.abandon}
              >
                {intl.formatMessage(messages.courseActivationAbandon)}
              </button>
            ) : null}
            {!operation.pending && !operation.unknown ? (
              <RouteDepartureLink
                to={links.readiness(initial.course.id)}
                className={courseActionClass}
              >
                {intl.formatMessage(messages.materialCancel)}
              </RouteDepartureLink>
            ) : null}
            <RouteDepartureLink
              to={links.preparation(initial.course.id)}
              className={courseActionClass}
            >
              {intl.formatMessage(messages.preparationHub)}
            </RouteDepartureLink>
          </form>
        </div>
      </div>
      <DiscardChangesDialog
        departure={operation.departure}
        title={intl.formatMessage(messages.courseActivationUnknown)}
        description={intl.formatMessage(messages.courseActivationLeave)}
      />
    </>
  );
}
