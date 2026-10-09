import { useIntl } from "react-intl";
import type { CoursePreparation } from "../../platform/api/courses";
import { canFirstActivate } from "../../platform/api/courses";
import { messages } from "../../platform/i18n/messages";
import { RouteDepartureLink } from "../../platform/ui/RouteDepartureLink";
import type { CourseRouteProps } from "./CourseRouteProps";
import { courseActionClass } from "./CourseListRoute";
import { courseTeachingFields } from "./courseTeachingFields";
import { useSessionActions } from "../../platform/data/EntryDataProvider";

const blockerMessages = {
  learning_goals: messages.preparationGoals,
  ai_tutor_instructions: messages.preparationInstructions,
  language: messages.preparationLanguage,
  supervisor_presence: messages.preparationSupervisor,
  qualifying_material: messages.preparationMaterial,
} as const;

// Hub/review explicit Refresh always uses ordered route admission. Activation
// deliberately does not use this control: its local unknown record must survive.
export function CourseReadinessRefresh() {
  const intl = useIntl();
  const { checkRouteAdmission } = useSessionActions();
  return (
    <button
      type="button"
      className={courseActionClass}
      onClick={() => void checkRouteAdmission()}
    >
      {intl.formatMessage(messages.invitationsRefresh)}
    </button>
  );
}

// Tailwind Plus: Application UI > Data Display > Description Lists >
// Left-aligned with inline actions; 2026-09-13-083323, v4/react-light.jsx.
// MIA: server blocker rows, wrapped text, trusted implemented destinations only.
export function CourseReadinessChecklist({
  preparation,
  links,
}: {
  readonly preparation: CoursePreparation;
  readonly links: CourseRouteProps["links"];
}) {
  const intl = useIntl();
  // Action-specific prerequisite blockers remain visible even when the server's
  // separate preparation display list is empty. No resolver is guessed for them.
  const blockers = [
    ...preparation.readiness.blockers,
    ...preparation.readiness.activation.blockers.flatMap((id) =>
      id === "assigned_supervisor_required" ||
      id === "course_already_active" ||
      preparation.readiness.blockers.some((item) => item.id === id)
        ? []
        : [{ id, field: null, materials: false }],
    ),
  ];
  return (
    <>
      <h2 className="mt-6 text-base/7 font-semibold text-gray-900">
        {intl.formatMessage(messages.preparationReadiness)}
      </h2>
      <p className="mt-2 text-sm/6 text-gray-700">
        {intl.formatMessage(messages.courseActivationMaterial)}
      </p>
      <dl className="mt-6 divide-y divide-gray-200 border-t border-gray-200">
        {blockers.map((blocker) => (
          <div
            key={blocker.id}
            className="py-6 sm:grid sm:grid-cols-3 sm:gap-4"
          >
            <dt className="text-sm/6 font-medium text-gray-900">
              {intl.formatMessage(blockerMessages[blocker.id])}
            </dt>
            <dd className="mt-1 flex min-w-0 flex-wrap gap-3 text-sm/6 text-gray-700 sm:col-span-2 sm:mt-0">
              <span>{intl.formatMessage(messages.preparationUnmet)}</span>
              {blocker.field !== null ? (
                <RouteDepartureLink
                  className={courseActionClass}
                  to={links.preparation(preparation.course.id, blocker.field)}
                >
                  {intl.formatMessage(
                    courseTeachingFields[blocker.field].heading,
                  )}
                </RouteDepartureLink>
              ) : blocker.materials ? (
                <RouteDepartureLink
                  className={courseActionClass}
                  to={links.materials(preparation.course.id)}
                >
                  {intl.formatMessage(messages.materialsHeading)}
                </RouteDepartureLink>
              ) : null}
              {blocker.id === "supervisor_presence" ? (
                <span>
                  {intl.formatMessage(messages.courseActivationSupervisor)}
                </span>
              ) : null}
            </dd>
          </div>
        ))}
      </dl>
      {blockers.length === 0 ? (
        <p className="mt-3 text-sm text-gray-700">
          {intl.formatMessage(messages.preparationNoBlockers)}
        </p>
      ) : null}
      {preparation.readiness.activation.blockers.includes(
        "assigned_supervisor_required",
      ) ? (
        <p className="mt-3 text-sm/6 text-gray-700">
          {intl.formatMessage(messages.courseActivationAssigned)}
        </p>
      ) : null}
    </>
  );
}

export function CourseActivationAvailability({
  preparation,
}: {
  readonly preparation: CoursePreparation;
}) {
  const intl = useIntl();
  if (preparation.course.state === "active" || canFirstActivate(preparation))
    return null;
  return (
    <p className="mt-3 text-sm/6 text-gray-700">
      {intl.formatMessage(
        preparation.activatedAt !== null || preparation.deactivatedAt !== null
          ? messages.courseActivationPrevious
          : messages.courseActivationUnavailable,
      )}
    </p>
  );
}
