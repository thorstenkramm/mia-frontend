import { useIntl } from "react-intl";
import { useLayoutEffect, useRef } from "react";
import { XCircleIcon } from "@heroicons/react/20/solid";
import type { CourseRouteProps } from "./CourseRouteProps";
import { useCourseTeachingField } from "./useCourseTeachingField";
import { GuidedCourseTextField } from "./GuidedCourseTextField";
import { CoursePreparationStatus } from "./CoursePreparationRoute";
import { CourseCheckedAt, courseActionClass } from "./CourseListRoute";
import { messages } from "../../platform/i18n/messages";
import { AuthSubmitButton } from "../../platform/ui/AuthSubmitButton";
import { DiscardChangesDialog } from "../../platform/ui/DiscardChangesDialog";
import { RouteDepartureLink } from "../../platform/ui/RouteDepartureLink";
import { TechnicalErrorDisclosure } from "../../platform/api/TechnicalErrorDisclosure";
import { courseTeachingFields } from "./courseTeachingFields";

// Tailwind Plus: Application UI > Forms > Form Layouts > Stacked;
// Library 2026-09-13-083323, v4/react-light.jsx. MIA removes unrelated
// profile/image/notification anatomy; one guided field, persisted confirmation,
// frozen unknown reconciliation, guarded departure and no optimistic readiness.
// Validation summary: Feedback > Alerts > With list, same library/variant.
// MIA has one corrective field link and no extra live region or protected text.
export default function CourseTeachingFieldRoute(props: CourseRouteProps) {
  if (props.resource.kind !== "preparation" || props.resource.field === null)
    throw new Error("Teaching form requires its admitted field resource.");
  return (
    <TeachingField
      {...props}
      resource={{ ...props.resource, field: props.resource.field }}
    />
  );
}
function TeachingField({
  resource,
  links,
  unavailable,
}: Omit<CourseRouteProps, "resource"> & {
  readonly resource: Extract<
    CourseRouteProps["resource"],
    { kind: "preparation" }
  > & {
    readonly field: NonNullable<
      Extract<CourseRouteProps["resource"], { kind: "preparation" }>["field"]
    >;
  };
}) {
  const intl = useIntl();
  const form = useCourseTeachingField(
    resource.preparation,
    resource.field,
    unavailable,
  );
  const feedback = useRef<HTMLParagraphElement>(null);
  const unknown =
    form.state.kind === "Save outcome unknown" ||
    form.state.kind === "Read differs";
  useLayoutEffect(() => {
    if (unknown) feedback.current?.focus();
  }, [unknown]);
  return (
    <>
      <CoursePreparationStatus preparation={form.applied} />
      <CourseCheckedAt time={form.checkedAt} />
      <form action={form.action} className="mt-6 space-y-6">
        {form.invalid && form.feedback !== null ? (
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="shrink-0">
                <XCircleIcon
                  aria-hidden="true"
                  className="size-5 text-red-600"
                />
              </div>
              <div className="ml-3 min-w-0">
                <h3 className="text-sm font-medium text-red-800">
                  {intl.formatMessage(messages.coursesValidationSummary)}
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <ul role="list" className="list-disc space-y-1 pl-5">
                    <li>
                      <a
                        href="#teaching-field"
                        onClick={(event) => {
                          event.preventDefault();
                          form.control.current?.focus();
                        }}
                        className="underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                      >
                        {intl.formatMessage(
                          courseTeachingFields[resource.field].label,
                        )}
                      </a>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        ) : null}
        <div className="border-b border-gray-200 pb-6">
          <GuidedCourseTextField
            field={resource.field}
            value={form.draft}
            change={form.change}
            control={form.control}
            locked={form.locked}
            invalid={form.invalid}
            error={
              form.feedback === null ? null : intl.formatMessage(form.feedback)
            }
            language={form.applied.fields.language}
          />
        </div>
        {form.dirty && !form.locked ? (
          <p className="text-sm text-gray-700">
            {intl.formatMessage(messages.preparationUnsaved)}
          </p>
        ) : null}
        {form.feedback !== null ? (
          <p
            ref={feedback}
            tabIndex={-1}
            className="text-sm/6 font-medium text-gray-900"
          >
            {intl.formatMessage(form.feedback)}
          </p>
        ) : null}
        {form.error !== null ? (
          <>
            {!form.invalid ? (
              <p className="text-sm/6 text-gray-700">
                {intl.formatMessage(messages.preparationCheckFailed)}
              </p>
            ) : null}
            <TechnicalErrorDisclosure error={form.error} />
          </>
        ) : null}
        {form.state.kind === "Read differs" ||
        form.state.kind === "Post-save newer" ? (
          <section>
            <h3 className="text-sm/6 font-semibold text-gray-900">
              {intl.formatMessage(messages.preparationCurrent)}
            </h3>
            <pre
              className="mt-2 font-sans whitespace-pre-wrap wrap-anywhere"
              dir="auto"
              lang={form.applied.fields.language ?? undefined}
            >
              {form.applied.fields[resource.field] ?? ""}
            </pre>
            {form.state.kind === "Read differs" ? (
              <button
                type="button"
                className={courseActionClass}
                onClick={form.useCurrent}
              >
                {intl.formatMessage(messages.preparationUseCurrent)}
              </button>
            ) : null}
          </section>
        ) : null}
        <div className="flex flex-wrap items-center gap-3">
          {!unknown ? (
            <div className="max-w-full">
              <AuthSubmitButton
                enabled={!form.locked && form.dirty}
                label={intl.formatMessage(
                  form.pending
                    ? messages.coursesSaving
                    : messages.preparationSave,
                )}
              />
            </div>
          ) : null}
          {form.submitting ||
          form.state.kind === "Save submitting" ||
          form.state.kind === "Reconciling form" ? (
            <button
              type="button"
              className={courseActionClass}
              onClick={form.stop}
            >
              {intl.formatMessage(messages.lifecycleStopWaiting)}
            </button>
          ) : (
            <button
              type="button"
              className={courseActionClass}
              onClick={() => void form.reconcile()}
            >
              {intl.formatMessage(messages.preparationReconcile)}
            </button>
          )}
          <RouteDepartureLink
            to={links.preparation(form.applied.course.id)}
            className={courseActionClass}
          >
            {intl.formatMessage(messages.preparationHub)}
          </RouteDepartureLink>
        </div>
      </form>
      <DiscardChangesDialog
        departure={form.departure}
        title={intl.formatMessage(messages.preparationUnsaved)}
        description={intl.formatMessage(messages.preparationDiscardHelp)}
      />
    </>
  );
}
