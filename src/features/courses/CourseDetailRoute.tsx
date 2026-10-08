import { useIntl } from "react-intl";
import { useState } from "react";
import { useSessionActions } from "../../platform/data/EntryDataProvider";
import { messages } from "../../platform/i18n/messages";
import { RouteDepartureLink } from "../../platform/ui/RouteDepartureLink";
import type { CourseRouteProps } from "./CourseRouteProps";
import { CourseCheckedAt, courseActionClass } from "./CourseListRoute";

// Tailwind Plus: Application UI > Data Display > Description Lists >
// Left-aligned in card. Library 2026-09-13-083323, v4/react-light.jsx.
// MIA: persisted name/state/assignment identifiers only, escaped and wrapped;
// no attachment, deletion, readiness or future preparation controls.
export default function CourseDetailRoute({
  resource,
  links,
}: CourseRouteProps) {
  const intl = useIntl();
  const { checkRouteAdmission } = useSessionActions();
  const [checkedAt] = useState(Date.now);
  if (resource.kind !== "detail")
    throw new Error("Course detail requires its admitted resource.");
  const course = resource.course;
  return (
    <>
      <CourseCheckedAt time={checkedAt} />
      <div className="overflow-hidden bg-white shadow-sm sm:rounded-lg">
        <div className="px-4 py-6 sm:px-6">
          <h2 className="text-base/7 font-semibold text-gray-900">
            {intl.formatMessage(messages.coursesDetailHeading)}
          </h2>
        </div>
        <div className="border-t border-gray-100">
          <dl className="divide-y divide-gray-100">
            <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-900">
                {intl.formatMessage(messages.coursesName)}
              </dt>
              <dd className="mt-1 text-sm/6 text-gray-700 wrap-anywhere sm:col-span-2 sm:mt-0">
                <bdi>{course.name}</bdi>
              </dd>
            </div>
            <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-900">
                {intl.formatMessage(messages.coursesState)}
              </dt>
              <dd className="mt-1 text-sm/6 text-gray-700 sm:col-span-2 sm:mt-0">
                {intl.formatMessage(
                  course.state === "active"
                    ? messages.coursesActive
                    : messages.coursesInactive,
                )}
              </dd>
            </div>
            <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-900">
                {intl.formatMessage(messages.coursesSupervisors)}
              </dt>
              <dd className="mt-1 text-sm/6 text-gray-700 sm:col-span-2 sm:mt-0">
                <ul>
                  {course.supervisors.map((id) => (
                    <li key={id} className="wrap-anywhere">
                      <bdi>{id}</bdi>
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
          </dl>
        </div>
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <RouteDepartureLink to={links.list} className={courseActionClass}>
          {intl.formatMessage(messages.coursesBackToList)}
        </RouteDepartureLink>
        <button
          type="button"
          className={courseActionClass}
          onClick={() => void checkRouteAdmission()}
        >
          {intl.formatMessage(messages.invitationsRefresh)}
        </button>
      </div>
    </>
  );
}
