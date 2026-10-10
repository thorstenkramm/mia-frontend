import { useIntl } from "react-intl";
import { useSessionActions } from "../../platform/data/EntryDataProvider";
import { messages } from "../../platform/i18n/messages";
import type { CourseStudentRouteProps } from "./CourseStudentRouteProps";
import { courseActionClass } from "./CourseListRoute";

// Tailwind Plus: Application UI > Data Display > Description Lists > Left-aligned.
// Library 2026-09-13-083323, v4/react-light.jsx. MIA: username/joined/course
// only; h2 under route h1, wrapping/bdi, no attachments or future action samples.
export default function CourseStudentMembershipRoute({
  resource,
}: CourseStudentRouteProps) {
  const intl = useIntl();
  const { checkRouteAdmission } = useSessionActions();
  if (resource.kind !== "membership")
    throw new Error("Membership requires admitted pair.");
  return (
    <div>
      <h2 className="text-base/7 font-semibold text-gray-900">
        {intl.formatMessage(messages.studentMembership)}
      </h2>
      <dl className="mt-6 divide-y divide-gray-100 border-t border-gray-100">
        {[
          {
            label: messages.loginUsername,
            value: <bdi>{resource.membership.username}</bdi>,
          },
          {
            label: messages.studentJoined,
            value: intl.formatDate(resource.membership.joinedAt, {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
              timeZoneName: "short",
            }),
          },
          {
            label: messages.coursesName,
            value: <bdi>{resource.course.name}</bdi>,
          },
        ].map(({ label, value }) => (
          <div
            key={label.id}
            className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0"
          >
            <dt className="text-sm/6 font-medium text-gray-900">
              {intl.formatMessage(label)}
            </dt>
            <dd className="mt-1 text-sm/6 text-gray-700 wrap-anywhere sm:col-span-2 sm:mt-0">
              {value}
            </dd>
          </div>
        ))}
      </dl>
      <button
        type="button"
        className={courseActionClass}
        onClick={() => void checkRouteAdmission()}
      >
        {intl.formatMessage(messages.invitationsRefresh)}
      </button>
    </div>
  );
}
