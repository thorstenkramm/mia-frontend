import { useRef, useState } from "react";
import { useIntl } from "react-intl";
import { getCourse, isHiddenCourseFailure } from "../../platform/api/courses";
import type { EntryApiFailure } from "../../platform/api/entry";
import { TechnicalErrorDisclosure } from "../../platform/api/TechnicalErrorDisclosure";
import { useSessionActions } from "../../platform/data/EntryDataProvider";
import { useAnnouncer } from "../../platform/announcer/AnnouncementRegion";
import { messages } from "../../platform/i18n/messages";
import { RouteDepartureLink } from "../../platform/ui/RouteDepartureLink";
import type { CourseRouteProps } from "./CourseRouteProps";
import {
  CourseCheckedAt,
  CourseEmpty,
  CourseTable,
  courseActionClass,
} from "./CourseListRoute";
import { useRouteActivity } from "../../platform/ui/useRouteActivity";

// Tailwind Plus: Application UI > Lists > Tables > Simple; Feedback > Empty
// States > Simple (CourseTable/CourseEmpty). Library 2026-09-13-083323,
// v4/react-light.jsx. O2 delta: no server total/pagination; known-ID batches
// are at most 25. Story 4.2 adds only the implemented assigned hub destination.
export default function PrepareCourseListRoute({
  resource,
  links,
  unavailable,
}: CourseRouteProps) {
  const intl = useIntl();
  const { announce } = useAnnouncer();
  const { readAuthenticated, checkRouteAdmission } = useSessionActions();
  if (resource.kind !== "prepare")
    throw new Error("Prepare requires its scope-addressed resources.");
  const [courses, setCourses] = useState(resource.courses);
  const [checkedAt, setCheckedAt] = useState(Date.now);
  const {
    state,
    stateRef: current,
    mounted,
    update,
  } = useRouteActivity<
    | { readonly kind: "Idle" | "Loading" }
    | { readonly kind: "Failed"; readonly error: EntryApiFailure }
  >({ kind: "Idle" });
  const heading = useRef<HTMLHeadingElement>(null);
  const more = async () => {
    if (current.current.kind === "Loading") return;
    update({ kind: "Loading" });
    const result = await readAuthenticated(async (signal) => {
      const batch = [];
      for (const id of resource.ids.slice(courses.length, courses.length + 25))
        batch.push(await getCourse(id, signal));
      return batch;
    });
    if (!mounted.current) return;
    if (result.kind === "completed") {
      setCourses([...courses, ...result.value]);
      setCheckedAt(Date.now());
      update({ kind: "Idle" });
      heading.current?.focus();
    } else if (result.kind === "failed") {
      if (isHiddenCourseFailure(result.failure)) unavailable(result.failure);
      else {
        update({ kind: "Failed", error: result.failure });
        announce(intl.formatMessage(messages.coursesCheckFailed), "urgent");
      }
    }
  };
  return (
    <>
      <h2
        ref={heading}
        tabIndex={-1}
        className="text-base font-semibold text-gray-900"
      >
        {intl.formatMessage(messages.coursesPrepareHeading)}
      </h2>
      <CourseCheckedAt time={checkedAt} />
      {courses.length === 0 ? (
        <CourseEmpty text={intl.formatMessage(messages.coursesPrepareEmpty)} />
      ) : (
        <CourseTable courses={courses} detail={links.preparation} />
      )}
      {state.kind === "Failed" ? (
        <>
          <p className="text-sm text-gray-700">
            {intl.formatMessage(messages.coursesCheckFailed)}
          </p>
          <TechnicalErrorDisclosure error={state.error} />
        </>
      ) : null}
      <div className="mt-6 flex flex-wrap gap-3">
        {courses.length < resource.ids.length ? (
          <button
            type="button"
            disabled={state.kind === "Loading"}
            className={courseActionClass}
            onClick={() => void more()}
          >
            {intl.formatMessage(
              state.kind === "Loading"
                ? messages.routeLoading
                : messages.coursesMore,
            )}
          </button>
        ) : null}
        <button
          type="button"
          className={courseActionClass}
          onClick={() => void checkRouteAdmission()}
        >
          {intl.formatMessage(messages.invitationsRefresh)}
        </button>
        <RouteDepartureLink to={links.home} className={courseActionClass}>
          {intl.formatMessage(messages.invitationsBackToHome)}
        </RouteDepartureLink>
      </div>
    </>
  );
}
