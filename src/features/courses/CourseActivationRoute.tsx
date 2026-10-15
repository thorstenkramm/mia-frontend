import { useLayoutEffect } from "react";
import { useIntl } from "react-intl";
import {
  canFirstActivate,
  type CoursePreparation,
} from "../../platform/api/courses";
import { TechnicalErrorDisclosure } from "../../platform/api/TechnicalErrorDisclosure";
import { messages } from "../../platform/i18n/messages";
import { DiscardChangesDialog } from "../../platform/ui/DiscardChangesDialog";
import { RouteDepartureLink } from "../../platform/ui/RouteDepartureLink";
import { RouteRecoveryPanel } from "../../platform/ui/RouteRecoveryPanel";
import { courseActionClass } from "./CourseListRoute";
import type { CourseRouteProps } from "./CourseRouteProps";
import { useCourseActivation } from "./useCourseActivation";

// Tailwind Plus: Application UI > Forms > Action Panels > Simple; Data Display >
// Description Lists > Left-aligned with inline actions; Elements > Badges > Small
// pill with border. Library 2026-09-13-083323, v4/react-light.jsx. MIA: factual
// review, no inline actions, native disabled pending confirmation and wrapped footer.
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
  readonly initial: CoursePreparation;
}) {
  const intl = useIntl();
  const operation = useCourseActivation(
    initial,
    links.preparation(initial.course.id),
    unavailable,
  );
  const { status, outcome } = operation;
  useLayoutEffect(() => {
    if (outcome !== null) status.current?.focus();
  }, [outcome, status]);
  const checking = operation.state.kind === "Checking";
  const submitting = operation.state.kind === "Submitting";
  const reconciling = operation.state.kind === "Reconciling";
  const eligible = canFirstActivate(operation.applied);
  const unavailableState =
    !eligible &&
    !operation.unknown &&
    !checking &&
    !submitting &&
    !reconciling &&
    outcome !== "rejected" &&
    outcome !== "checkFailed";
  const readiness = links.readiness(initial.course.id);
  const readinessLink = (label: string) => (
    <RouteDepartureLink to={readiness} className={courseActionClass}>
      {label}
    </RouteDepartureLink>
  );
  const changed = outcome === "changed" && eligible;
  const abandoned = outcome === "abandoned" && eligible;
  return (
    <>
      {changed || abandoned ? (
        <RouteRecoveryPanel
          tone={abandoned ? "gray" : "yellow"}
          heading={intl.formatMessage(
            abandoned
              ? messages.courseActivationAbandoned
              : messages.activationChangedHeading,
          )}
          headingRef={status}
          actions={null}
        >
          {changed ? (
            <p>{intl.formatMessage(messages.activationChangedBody)}</p>
          ) : null}
        </RouteRecoveryPanel>
      ) : null}
      {unavailableState ? (
        <RouteRecoveryPanel
          tone="gray"
          heading={intl.formatMessage(messages.activationUnavailableHeading)}
          {...(outcome !== null ? { headingRef: status } : {})}
          actions={readinessLink(
            intl.formatMessage(messages.activationUnavailableAction),
          )}
        >
          <p>
            {operation.applied.activatedAt !== null ||
            operation.applied.deactivatedAt !== null ||
            operation.applied.course.state === "active"
              ? intl.formatMessage(messages.preparationPanelPreviousBody)
              : intl.formatMessage(messages.activationUnavailableBody, {
                  courseName: (
                    <bdi dir="auto">{operation.applied.course.name}</bdi>
                  ),
                })}
          </p>
        </RouteRecoveryPanel>
      ) : null}
      {(outcome === "rejected" || outcome === "checkFailed") &&
      !unavailableState ? (
        <RouteRecoveryPanel
          tone="red"
          heading={intl.formatMessage(
            outcome === "rejected"
              ? messages.activationRejectedHeading
              : messages.preparationCheckFailed,
          )}
          headingRef={status}
          actions={readinessLink(
            intl.formatMessage(messages.activationRejectedAction),
          )}
        >
          {outcome === "rejected" ? (
            <p>{intl.formatMessage(messages.activationRejectedBody)}</p>
          ) : null}
          {operation.error ? (
            <TechnicalErrorDisclosure error={operation.error} />
          ) : null}
        </RouteRecoveryPanel>
      ) : null}
      {operation.unknown ? (
        <RouteRecoveryPanel
          heading={intl.formatMessage(messages.activationUnknownHeading)}
          headingRef={status}
          actions={
            <>
              <button
                type="button"
                className={courseActionClass}
                onClick={() => void operation.reconcile()}
              >
                {intl.formatMessage(messages.activationUnknownRefresh)}
              </button>
              {operation.canAbandon ? (
                <button
                  type="button"
                  className={courseActionClass}
                  onClick={operation.abandon}
                >
                  {intl.formatMessage(messages.courseActivationAbandon)}
                </button>
              ) : null}
            </>
          }
        >
          <p>{intl.formatMessage(messages.activationUnknownBody)}</p>
          <p className="mt-2">
            {intl.formatMessage(messages.activationUnknownNote)}
          </p>
          {operation.error ? (
            <TechnicalErrorDisclosure error={operation.error} />
          ) : null}
          {reconciling ? (
            <button
              type="button"
              className={courseActionClass}
              onClick={operation.stop}
            >
              {intl.formatMessage(messages.lifecycleStopWaiting)}
            </button>
          ) : null}
        </RouteRecoveryPanel>
      ) : null}
      {(eligible &&
        !operation.unknown &&
        outcome !== "rejected" &&
        outcome !== "checkFailed") ||
      checking ||
      submitting ? (
        <div className="bg-white shadow-sm sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h2
              className="text-base font-semibold text-gray-900"
              {...(outcome === null && !operation.unknown
                ? { ref: status, tabIndex: -1 }
                : {})}
            >
              {intl.formatMessage(messages.activationFormHeading, {
                courseName: (
                  <bdi dir="auto">{operation.applied.course.name}</bdi>
                ),
              })}
            </h2>
            <p className="mt-2 text-sm/6 text-gray-700">
              {intl.formatMessage(messages.activationFormIntro)}
            </p>
            <div className="mt-6 border-t border-gray-100">
              <dl className="divide-y divide-gray-100">
                {[
                  {
                    key: "course",
                    label: messages.activationFormCourse,
                    value: (
                      <bdi dir="auto">{operation.applied.course.name}</bdi>
                    ),
                  },
                  {
                    key: "state",
                    label: messages.activationFormState,
                    value: intl.formatMessage(messages.preparationActivatable),
                  },
                  {
                    key: "prerequisites",
                    label: messages.activationFormPrerequisites,
                    value: intl.formatMessage(
                      messages.activationFormNoneReported,
                    ),
                  },
                ].map((row) => (
                  <div
                    key={row.key}
                    className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0"
                  >
                    <dt className="text-sm/6 font-medium text-gray-900">
                      {intl.formatMessage(row.label)}
                    </dt>
                    <dd className="mt-1 flex min-w-0 flex-wrap items-center gap-2 text-sm/6 text-gray-700 sm:col-span-2 sm:mt-0">
                      <span className="wrap-anywhere">{row.value}</span>
                      {operation.changedRows.includes(
                        row.key as "course" | "state" | "prerequisites",
                      ) && changed ? (
                        <span className="inline-flex rounded-full bg-yellow-50 px-1.5 py-0.5 text-xs font-medium text-yellow-800 inset-ring inset-ring-yellow-600/20">
                          {intl.formatMessage(messages.activationBadgeChanged)}
                        </span>
                      ) : null}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
            <h3 className="mt-6 text-sm font-semibold text-gray-900">
              {intl.formatMessage(messages.activationFormChangesHeading)}
            </h3>
            <ul className="mt-2 list-disc space-y-2 pl-6 text-sm/6 text-gray-700">
              {[
                messages.activationFormChange1,
                messages.activationFormChange2,
                messages.activationFormChange3,
              ].map((item) => (
                <li key={item.id}>{intl.formatMessage(item)}</li>
              ))}
            </ul>
            <p className="mt-5 text-sm/6 text-gray-700">
              {intl.formatMessage(messages.activationFormPrecheck)}
            </p>
            <form
              action={operation.action}
              onSubmit={operation.guardSubmit}
              className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-4"
            >
              <p className="text-sm/6 text-gray-700">
                {checking
                  ? intl.formatMessage(messages.courseActivationChecking)
                  : submitting
                    ? intl.formatMessage(messages.courseActivationSending)
                    : null}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                {submitting ? (
                  <button
                    type="button"
                    className={courseActionClass}
                    onClick={operation.stop}
                  >
                    {intl.formatMessage(messages.lifecycleStopWaiting)}
                  </button>
                ) : (
                  readinessLink(intl.formatMessage(messages.activationCancel))
                )}
                <button
                  type="submit"
                  disabled={checking || submitting || !operation.enabled}
                  className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {intl.formatMessage(
                    submitting
                      ? messages.activationConfirmPending
                      : messages.courseActivationConfirm,
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
      <DiscardChangesDialog
        departure={operation.departure}
        title={intl.formatMessage(messages.activationUnknownHeading)}
        description={intl.formatMessage(messages.courseActivationLeave)}
      />
    </>
  );
}
