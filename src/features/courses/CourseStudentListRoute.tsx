import { useRef, useState } from "react";
import { useIntl } from "react-intl";
import { getCourse, isHiddenCourseFailure } from "../../platform/api/courses";
import {
  isHiddenStudentFailure,
  listCourseStudents,
  type StudentPage,
} from "../../platform/api/courseStudents";
import { TechnicalErrorDisclosure } from "../../platform/api/TechnicalErrorDisclosure";
import type { EntryApiFailure } from "../../platform/api/entry";
import { useSessionActions } from "../../platform/data/EntryDataProvider";
import { useAnnouncer } from "../../platform/announcer/AnnouncementRegion";
import { messages } from "../../platform/i18n/messages";
import { RouteDepartureLink } from "../../platform/ui/RouteDepartureLink";
import { useRouteActivity } from "../../platform/ui/useRouteActivity";
import type { CourseStudentRouteProps } from "./CourseStudentRouteProps";
import {
  CourseCheckedAt,
  CourseEmpty,
  CoursePagination,
  CourseRefreshButton,
  courseActionClass,
} from "./CourseListRoute";

// Tailwind Plus: Application UI > Lists > Tables > Simple, v4/react-light.jsx.
// Library 2026-09-13-083323. MIA: two wrapping columns, h2 below host h1,
// opaque membership links, no avatar/contact/Edit samples, labelled scroll region.
export function StudentTable({
  page,
  membership,
}: {
  readonly page: StudentPage;
  readonly membership: CourseStudentRouteProps["links"]["membership"];
}) {
  const intl = useIntl();
  return (
    <div className="mt-8 flow-root">
      <div
        role="region"
        aria-label={intl.formatMessage(messages.studentList)}
        tabIndex={0}
        className="overflow-x-auto"
      >
        <table className="relative min-w-full divide-y divide-gray-300">
          <thead>
            <tr>
              {[messages.loginUsername, messages.studentJoined].map((label) => (
                <th
                  key={label.id}
                  scope="col"
                  className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                >
                  {intl.formatMessage(label)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {page.memberships.map((item) => (
              <tr key={item.id}>
                <td className="px-3 py-4 text-sm font-medium text-gray-900 wrap-anywhere">
                  <RouteDepartureLink
                    to={membership(item.studentId)}
                    className="inline-block min-h-6 text-indigo-600 underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                  >
                    <bdi>{item.username}</bdi>
                  </RouteDepartureLink>
                </td>
                <td className="px-3 py-4 text-sm text-gray-700 wrap-anywhere">
                  {intl.formatDate(item.joinedAt, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                    timeZoneName: "short",
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
type Activity =
  | { readonly kind: "Current" | "Loading" }
  | { readonly kind: "Check failed"; readonly error: EntryApiFailure };
export default function CourseStudentListRoute({
  resource,
  links,
  unavailable,
}: CourseStudentRouteProps) {
  if (resource.kind !== "list")
    throw new Error("Roster requires admitted memberships.");
  return <Roster initial={resource} links={links} unavailable={unavailable} />;
}
function Roster({
  initial,
  links,
  unavailable,
}: Omit<CourseStudentRouteProps, "resource"> & {
  readonly initial: Extract<
    CourseStudentRouteProps["resource"],
    { kind: "list" }
  >;
}) {
  const intl = useIntl();
  const { announce } = useAnnouncer();
  const { readAuthenticated, checkRouteAdmission } = useSessionActions();
  const [page, setPage] = useState(initial.page);
  const [course, setCourse] = useState(initial.course);
  const [checkedAt, setCheckedAt] = useState(Date.now);
  const { state, stateRef, mounted, update } = useRouteActivity<Activity>({
    kind: "Current",
  });
  const heading = useRef<HTMLHeadingElement>(null);
  const load = async (offset: number) => {
    if (stateRef.current.kind === "Loading") return;
    update({ kind: "Loading" });
    const result = await readAuthenticated(async (signal) => {
      const course = await getCourse(initial.course.id, signal);
      return {
        course,
        page: await listCourseStudents(initial.course.id, offset, signal),
      };
    });
    if (!mounted.current) return;
    if (result.kind === "failed") {
      if (
        isHiddenStudentFailure(result.failure) ||
        isHiddenCourseFailure(result.failure)
      )
        unavailable(result.failure);
      else {
        update({ kind: "Check failed", error: result.failure });
        announce(intl.formatMessage(messages.coursesCheckFailed), "urgent");
      }
    } else if (result.kind === "completed") {
      setPage(result.value.page);
      setCourse(result.value.course);
      setCheckedAt(Date.now());
      update({ kind: "Current" });
      heading.current?.focus();
      if (page.offset !== result.value.page.offset)
        announce(
          intl.formatMessage(messages.coursesPage, {
            page: Math.floor(result.value.page.offset / 25) + 1,
          }),
        );
    }
  };
  return (
    <>
      <h2
        ref={heading}
        tabIndex={-1}
        className="text-base/7 font-semibold text-gray-900 wrap-anywhere"
      >
        <bdi>{course.name}</bdi>
      </h2>
      <div className="mt-6 flex flex-wrap gap-3">
        {course.state === "active" ? (
          <RouteDepartureLink to={links.create} className={courseActionClass}>
            {intl.formatMessage(messages.studentCreate)}
          </RouteDepartureLink>
        ) : null}
        <CourseRefreshButton refresh={() => void checkRouteAdmission()} />
      </div>
      <CourseCheckedAt time={checkedAt} />
      {state.kind === "Loading" ? (
        <p>{intl.formatMessage(messages.routeLoading)}</p>
      ) : state.kind === "Check failed" ? (
        <>
          <p>{intl.formatMessage(messages.coursesCheckFailed)}</p>
          <TechnicalErrorDisclosure error={state.error} />
        </>
      ) : page.memberships.length === 0 ? (
        <CourseEmpty text={intl.formatMessage(messages.studentEmpty)} />
      ) : (
        <StudentTable page={page} membership={links.membership} />
      )}
      <CoursePagination
        page={page}
        busy={state.kind === "Loading"}
        load={(offset) => void load(offset)}
      />
    </>
  );
}
