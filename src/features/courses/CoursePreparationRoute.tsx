import { useState } from "react";
import { useIntl } from "react-intl";
import type { CoursePreparation } from "../../platform/api/courses";
import { messages } from "../../platform/i18n/messages";
import { useSessionActions } from "../../platform/data/EntryDataProvider";
import { RouteDepartureLink } from "../../platform/ui/RouteDepartureLink";
import type { CourseRouteProps } from "./CourseRouteProps";
import { courseTeachingFields } from "./courseTeachingFields";
import { CourseCheckedAt, courseActionClass } from "./CourseListRoute";

export const readinessMessages = {
  inactive_incomplete: messages.preparationIncomplete,
  inactive_activatable: messages.preparationActivatable,
  active_accepting: messages.preparationAccepting,
  active_not_accepting: messages.preparationBlocked,
} as const;
const blockerMessages = {
  learning_goals: messages.preparationGoals,
  ai_tutor_instructions: messages.preparationInstructions,
  language: messages.preparationLanguage,
  supervisor_presence: messages.preparationSupervisor,
  qualifying_material: messages.preparationMaterial,
} as const;

// Tailwind Plus: Application UI > Data Display > Description Lists >
// Left-aligned with inline actions. Library 2026-09-13-083323, v4/react-light.jsx.
// MIA: server-authored text only; wrap/stack rows, accurate field link labels,
// no percentage or material-state inference, no future action destinations.
export default function CoursePreparationRoute({
  resource,
  links,
}: CourseRouteProps) {
  const intl = useIntl();
  const { checkRouteAdmission } = useSessionActions();
  const [checkedAt] = useState(Date.now);
  if (resource.kind !== "preparation" || resource.field !== null)
    throw new Error("Hub requires its admitted preparation resource.");
  const { preparation } = resource;
  return (
    <>
      <CoursePreparationStatus preparation={preparation} />
      <CourseCheckedAt time={checkedAt} />
      <h2 className="mt-6 text-base/7 font-semibold text-gray-900">
        {intl.formatMessage(messages.preparationReadiness)}
      </h2>
      <dl className="mt-6 divide-y divide-gray-200 border-t border-gray-200">
        {preparation.readiness.blockers.map((blocker) => (
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
                  to={links.preparation(preparation.course.id, blocker.field)}
                  className={courseActionClass}
                >
                  {intl.formatMessage(
                    courseTeachingFields[blocker.field].heading,
                  )}
                </RouteDepartureLink>
              ) : null}
            </dd>
          </div>
        ))}
      </dl>
      {preparation.readiness.blockers.length === 0 ? (
        <p className="mt-3 text-sm text-gray-700">
          {intl.formatMessage(messages.preparationNoBlockers)}
        </p>
      ) : null}
      <nav
        aria-label={intl.formatMessage(messages.preparationHub)}
        className="mt-6 flex flex-wrap gap-3"
      >
        <RouteDepartureLink
          to={links.materials(preparation.course.id)}
          className={courseActionClass}
        >
          {intl.formatMessage(messages.materialsHeading)}
        </RouteDepartureLink>
        {(
          [
            "description",
            "curriculum",
            "learningGoals",
            "instructions",
            "language",
          ] as const
        ).map((field) => (
          <RouteDepartureLink
            key={field}
            to={links.preparation(preparation.course.id, field)}
            className={courseActionClass}
          >
            {intl.formatMessage(courseTeachingFields[field].heading)}
          </RouteDepartureLink>
        ))}
      </nav>
      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          className={courseActionClass}
          onClick={() => void checkRouteAdmission()}
        >
          {intl.formatMessage(messages.invitationsRefresh)}
        </button>
        <RouteDepartureLink to="/prepare/courses" className={courseActionClass}>
          {intl.formatMessage(messages.coursesPrepareHeading)}
        </RouteDepartureLink>
      </div>
    </>
  );
}
export function CoursePreparationStatus({
  preparation,
}: {
  readonly preparation: CoursePreparation;
}) {
  const intl = useIntl();
  return (
    <>
      <h2 className="text-base/7 font-semibold text-gray-900 wrap-anywhere">
        <bdi>{preparation.course.name}</bdi>
      </h2>
      <p className="mt-2 text-sm/6 text-gray-700">
        {intl.formatMessage(readinessMessages[preparation.readiness.state])}
      </p>
    </>
  );
}
