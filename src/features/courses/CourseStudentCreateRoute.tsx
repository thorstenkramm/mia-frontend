import { useIntl } from "react-intl";
import { messages } from "../../platform/i18n/messages";
import {
  NewPasswordFields,
  NewPasswordSummary,
  useNewPasswordCheck,
} from "../../platform/ui/NewPasswordFields";
import { AuthSubmitButton } from "../../platform/ui/AuthSubmitButton";
import { DiscardChangesDialog } from "../../platform/ui/DiscardChangesDialog";
import { RouteDepartureLink } from "../../platform/ui/RouteDepartureLink";
import { RouteRecoveryPanel } from "../../platform/ui/RouteRecoveryPanel";
import { TechnicalErrorDisclosure } from "../../platform/api/TechnicalErrorDisclosure";
import type { CourseStudentRouteProps } from "./CourseStudentRouteProps";
import { StudentProfileFields, StudentUsername } from "./CourseStudentFields";
import { courseActionClass, CoursePagination } from "./CourseListRoute";
import { StudentTable } from "./CourseStudentListRoute";
import { useStudentProvisioning } from "./useStudentProvisioning";

// Tailwind Plus: Application UI > Forms > Form Layouts > Stacked, plus existing
// password pair, recovery panel and discard dialog exact bindings.
// Library 2026-09-13-083323, v4/react-light.jsx. MIA: native credential controls,
// one Action, external handoff guidance before send; no credential result card.
export default function CourseStudentCreateRoute(
  props: CourseStudentRouteProps,
) {
  if (props.resource.kind !== "create")
    throw new Error("Provisioning requires active admitted course.");
  return <Create {...props} course={props.resource.course} />;
}
function Create({
  course,
  links,
  unavailable,
}: Omit<CourseStudentRouteProps, "resource"> & {
  readonly course: Extract<
    CourseStudentRouteProps["resource"],
    { kind: "create" }
  >["course"];
}) {
  const intl = useIntl();
  const check = useNewPasswordCheck();
  const flow = useStudentProvisioning(course, check, links, unavailable);
  const { state } = flow;
  const error = "error" in state ? state.error : null;
  const feedback = "feedback" in state ? state.feedback : null;
  const invalid = "invalid" in state ? state.invalid : null;
  const unknown =
    state.kind === "Save outcome unknown" ||
    state.kind === "Current roster reviewed";
  return (
    <>
      {flow.editable ||
      state.kind === "Pre-dispatch checking" ||
      state.kind === "Submitting" ? (
        <>
          <p className="text-sm/6 text-gray-700">
            {intl.formatMessage(messages.studentHandoff)}
          </p>
          <form
            key={flow.generation}
            ref={flow.form}
            action={flow.formAction}
            noValidate
            autoComplete="off"
            onSubmit={flow.submit}
            onReset={(event) => event.preventDefault()}
            onChange={flow.change}
            className="mt-6 space-y-6"
          >
            <NewPasswordSummary check={check} />
            <StudentUsername
              inputRef={flow.username}
              enabled={!flow.locked}
              invalid={
                invalid === "username" ||
                check.fieldProblems.some(
                  (problem) => problem.target === "student-username",
                )
              }
              problem={
                check.fieldProblems.find(
                  (problem) => problem.target === "student-username",
                )?.label ?? null
              }
            />
            <NewPasswordFields
              check={check}
              enabled={!flow.locked}
              rejectedBy={null}
              temporary
              summary={false}
            />
            <StudentProfileFields
              enabled={!flow.locked}
              problems={check.fieldProblems}
            />
            <p
              id="student-status"
              ref={flow.status}
              tabIndex={-1}
              className="text-sm/6 font-semibold text-gray-900"
            >
              {flow.locked
                ? intl.formatMessage(
                    state.kind === "Submitting"
                      ? messages.studentSubmitting
                      : messages.studentChecking,
                  )
                : feedback === null
                  ? null
                  : intl.formatMessage(feedback)}
            </p>
            {error === null ? null : <TechnicalErrorDisclosure error={error} />}
            <div className="mt-6 flex flex-wrap gap-3">
              <AuthSubmitButton
                enabled={!flow.locked}
                label={intl.formatMessage(messages.studentCreate)}
              />
              {flow.locked ? (
                <button
                  type="button"
                  className={courseActionClass}
                  onClick={flow.stop}
                >
                  {intl.formatMessage(
                    state.kind === "Submitting"
                      ? messages.invitationStopWaiting
                      : messages.materialCancel,
                  )}
                </button>
              ) : (
                <RouteDepartureLink
                  to={links.list}
                  className={courseActionClass}
                >
                  {intl.formatMessage(messages.materialCancel)}
                </RouteDepartureLink>
              )}
            </div>
          </form>
        </>
      ) : state.kind === "Save accepted" ? null : (
        <RouteRecoveryPanel
          headingRef={flow.recoveryStatus}
          heading={intl.formatMessage(
            unknown ? messages.studentUnknown : messages.studentCheckRequired,
          )}
          actions={
            <>
              <button
                type="button"
                className={courseActionClass}
                disabled={state.kind === "Reconciling form" || flow.pending}
                onClick={() => void flow.reconcile()}
              >
                {intl.formatMessage(messages.invitationsRefresh)}
              </button>
              {state.kind === "Current roster reviewed" &&
              flow.course.state === "active" ? (
                <button
                  type="button"
                  disabled={flow.pending}
                  className={courseActionClass}
                  onClick={flow.abandon}
                >
                  {intl.formatMessage(messages.studentAbandon)}
                </button>
              ) : null}
            </>
          }
        >
          <p>
            {intl.formatMessage(
              unknown
                ? messages.studentUnknownHelp
                : (feedback ?? messages.studentChecking),
            )}
          </p>
          {error === null ? null : <TechnicalErrorDisclosure error={error} />}
          {state.kind === "Current roster reviewed" ? (
            <>
              <p className="mt-3">
                {intl.formatMessage(messages.studentUnconfirmed)}
              </p>
              {state.page.memberships.length === 0 ? (
                <p>{intl.formatMessage(messages.studentEmpty)}</p>
              ) : (
                <StudentTable page={state.page} membership={links.membership} />
              )}
              <CoursePagination
                page={state.page}
                busy={flow.pending}
                load={(offset) => void flow.reconcile(offset)}
              />
            </>
          ) : null}
        </RouteRecoveryPanel>
      )}
      <DiscardChangesDialog
        departure={flow.departure}
        title={intl.formatMessage(messages.studentUnsaved)}
        description={intl.formatMessage(messages.studentDiscardHelp)}
      />
    </>
  );
}
