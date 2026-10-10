import { useRef, useState, type ReactNode } from "react";
import { useIntl } from "react-intl";
import { Link } from "react-router";
import {
  isHiddenCourseFailure,
  listCourses,
  type Course,
  type CoursePage,
} from "../../platform/api/courses";
import type { EntryApiFailure } from "../../platform/api/entry";
import { TechnicalErrorDisclosure } from "../../platform/api/TechnicalErrorDisclosure";
import { useSessionActions } from "../../platform/data/EntryDataProvider";
import { useAnnouncer } from "../../platform/announcer/AnnouncementRegion";
import { messages } from "../../platform/i18n/messages";
import { RouteDepartureLink } from "../../platform/ui/RouteDepartureLink";
import type { CourseRouteProps } from "./CourseRouteProps";
import { useRouteActivity } from "../../platform/ui/useRouteActivity";

export const courseActionClass =
  "inline-flex min-h-6 items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600";

export function CourseCheckedAt({ time }: { readonly time: number }) {
  const intl = useIntl();
  return (
    <p className="mt-2 text-sm text-gray-700">
      {intl.formatMessage(messages.invitationsLastChecked, {
        time: intl.formatTime(time, {
          hour: "numeric",
          minute: "2-digit",
          second: "2-digit",
          timeZoneName: "short",
        }),
      })}
    </p>
  );
}

// Tailwind Plus: Application UI > Lists > Tables > Simple; Navigation >
// Pagination > Simple card footer; Feedback > Empty States > Simple.
// Library 2026-09-13-083323, v4/react-light.jsx. MIA: route owns h1; only
// name/state and admitted admin-detail or preparation-hub links; wrapping cells,
// no totals/hidden columns. Each caller owns the already-authorized destination.
export function CourseTable({
  courses,
  detail,
}: {
  readonly courses: readonly Course[];
  readonly detail?: CourseRouteProps["links"]["detail"];
}) {
  const intl = useIntl();
  return (
    <div className="mt-8 flow-root">
      <div
        className="overflow-x-auto"
        role="region"
        aria-label={intl.formatMessage(messages.coursesListHeading)}
        tabIndex={0}
      >
        <div className="inline-block min-w-full py-2 align-middle">
          <table className="relative min-w-full divide-y divide-gray-300">
            <thead>
              <tr>
                <th
                  scope="col"
                  className="py-3.5 pr-3 text-left text-sm font-semibold text-gray-900"
                >
                  {intl.formatMessage(messages.coursesName)}
                </th>
                <th
                  scope="col"
                  className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                >
                  {intl.formatMessage(messages.coursesState)}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {courses.map((course) => (
                <tr key={course.id}>
                  <td className="py-4 pr-3 text-sm font-medium text-gray-900 wrap-anywhere">
                    <bdi>
                      {detail ? (
                        <Link
                          to={detail(course.id)}
                          className="text-indigo-600 hover:text-indigo-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                        >
                          {course.name}
                        </Link>
                      ) : (
                        course.name
                      )}
                    </bdi>
                  </td>
                  <td className="px-3 py-4 text-sm text-gray-700">
                    {intl.formatMessage(
                      course.state === "active"
                        ? messages.coursesActive
                        : messages.coursesInactive,
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
export function CourseEmpty({
  text,
  action,
}: {
  readonly text: string;
  readonly action?: ReactNode;
}) {
  return (
    <div className="my-6 text-center">
      <svg
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="mx-auto size-12 text-gray-400"
      >
        <path
          d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <p className="mt-2 text-sm font-semibold text-gray-900">{text}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
// Accessibility delta: localized generic Collection pages labels the shared
// course/candidate pagination; invitation pagination retains its own owner/copy.
export function CoursePagination({
  page,
  busy,
  load,
}: {
  readonly page: {
    readonly offset: number;
    readonly previousOffset: number | null;
    readonly nextOffset: number | null;
  };
  readonly busy: boolean;
  readonly load: (offset: number) => void;
}) {
  const intl = useIntl();
  return (
    <nav
      aria-label={intl.formatMessage(messages.coursesPagination)}
      className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 bg-white px-4 py-3 sm:px-6"
    >
      <p className="text-sm text-gray-700">
        {intl.formatMessage(messages.coursesPage, {
          page: Math.floor(page.offset / 25) + 1,
        })}
      </p>
      <div className="flex flex-wrap gap-3">
        {(
          [
            {
              offset: page.previousOffset,
              label: messages.invitationsPreviousPage,
            },
            { offset: page.nextOffset, label: messages.invitationsNextPage },
          ] as const
        ).map(({ offset, label }) => (
          <button
            key={label.id}
            type="button"
            disabled={busy || offset === null}
            onClick={() => {
              if (offset !== null) load(offset);
            }}
            className={courseActionClass}
          >
            {intl.formatMessage(label)}
          </button>
        ))}
      </div>
    </nav>
  );
}
type Activity =
  | { readonly kind: "Idle" }
  | { readonly kind: "Loading" }
  | { readonly kind: "Failed"; readonly error: EntryApiFailure };

// Same established secondary-action blueprint; explicit foreground refresh only.
export function CourseRefreshButton({
  refresh,
}: {
  readonly refresh: () => void;
}) {
  const intl = useIntl();
  return (
    <button type="button" className={courseActionClass} onClick={refresh}>
      {intl.formatMessage(messages.invitationsRefresh)}
    </button>
  );
}

export default function CourseListRoute({
  resource,
  links,
  canCreate,
  unavailable,
}: CourseRouteProps) {
  if (resource.kind !== "list")
    throw new Error("Course list requires its admitted page.");
  return (
    <CourseList
      initial={resource.page}
      links={links}
      canCreate={canCreate}
      unavailable={unavailable}
    />
  );
}
function CourseList({
  initial,
  links,
  canCreate,
  unavailable,
}: { readonly initial: CoursePage } & Omit<CourseRouteProps, "resource">) {
  const intl = useIntl();
  const { announce } = useAnnouncer();
  const { readAuthenticated, checkRouteAdmission } = useSessionActions();
  const [page, setPage] = useState(initial);
  const [checkedAt, setCheckedAt] = useState(Date.now);
  const {
    state,
    update,
    stateRef: current,
    mounted,
  } = useRouteActivity<Activity>({ kind: "Idle" });
  const heading = useRef<HTMLHeadingElement>(null);
  const load = async (offset: number) => {
    if (current.current.kind === "Loading") return;
    update({ kind: "Loading" });
    const result = await readAuthenticated((signal) =>
      listCourses(offset, signal),
    );
    if (!mounted.current) return;
    if (result.kind === "failed") {
      if (isHiddenCourseFailure(result.failure)) unavailable(result.failure);
      else {
        update({ kind: "Failed", error: result.failure });
        announce(intl.formatMessage(messages.coursesCheckFailed), "urgent");
      }
    } else if (result.kind === "completed") {
      setPage(result.value);
      setCheckedAt(Date.now());
      update({ kind: "Idle" });
      heading.current?.focus();
      if (result.value.offset !== page.offset)
        announce(
          intl.formatMessage(messages.coursesPage, {
            page: Math.floor(result.value.offset / 25) + 1,
          }),
          "polite",
        );
    }
  };
  return (
    <>
      <div className="flex flex-wrap gap-3">
        {canCreate ? (
          <RouteDepartureLink to={links.create} className={courseActionClass}>
            {intl.formatMessage(messages.coursesCreateHeading)}
          </RouteDepartureLink>
        ) : null}
        <CourseRefreshButton refresh={() => void checkRouteAdmission()} />
      </div>
      <h2
        ref={heading}
        tabIndex={-1}
        className="mt-6 text-base font-semibold text-gray-900"
      >
        {intl.formatMessage(messages.coursesListHeading)}
      </h2>
      <CourseCheckedAt time={checkedAt} />
      {state.kind === "Failed" ? (
        <>
          <p className="mt-3 text-sm text-gray-700">
            {intl.formatMessage(messages.coursesCheckFailed)}
          </p>
          <TechnicalErrorDisclosure error={state.error} />
          <button
            type="button"
            className={courseActionClass}
            onClick={() => void load(page.offset)}
          >
            {intl.formatMessage(messages.mfaCheckAgain)}
          </button>
        </>
      ) : null}
      {state.kind === "Loading" ? (
        <p className="mt-3 text-sm text-gray-700">
          {intl.formatMessage(messages.routeLoading)}
        </p>
      ) : page.courses.length === 0 ? (
        <CourseEmpty text={intl.formatMessage(messages.coursesListEmpty)} />
      ) : (
        <CourseTable courses={page.courses} detail={links.detail} />
      )}
      <CoursePagination
        page={page}
        busy={state.kind === "Loading"}
        load={(offset) => void load(offset)}
      />
      <RouteDepartureLink to={links.home} className={courseActionClass}>
        {intl.formatMessage(messages.invitationsBackToHome)}
      </RouteDepartureLink>
    </>
  );
}
