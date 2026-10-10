import { useIntl } from "react-intl";
import { getCourse, isHiddenCourseFailure } from "../../platform/api/courses";
import {
  getCourseStudentMembership,
  isHiddenStudentFailure,
  listCourseStudents,
} from "../../platform/api/courseStudents";
import type { AccountId, CourseId } from "../../platform/api/entry";
import { useAuthenticatedAccess } from "../../platform/data/EntryDataProvider";
import { RouteDepartureLink } from "../../platform/ui/RouteDepartureLink";
import type { StudentResource } from "../../features/courses/CourseStudentRouteProps";
import {
  CourseAdmissionSurface,
  useCourseResourceAdmission,
} from "./AdminCourseRoute";
import {
  studentPath,
  prepareCoursePath,
  type StudentEntryRoute,
} from "./entryRoutes";

// Student scope and ordered dependent reads stay here; the established course
// host owns admission settlement and the exact neutral shell/recovery frame.
export default function PrepareStudentRoute({
  route,
  courseId,
  studentId,
}: {
  readonly route: StudentEntryRoute;
  readonly courseId: CourseId | null;
  readonly studentId: AccountId | null;
}) {
  const intl = useIntl();
  const access = useAuthenticatedAccess();
  const { state, unavailable } = useCourseResourceAdmission<StudentResource>(
    async (signal) => {
      if (
        courseId === null ||
        !access?.courseSupervision ||
        !access.supervisedCourseIds.includes(courseId)
      )
        throw new Error("Student admission requires assigned course scope.");
      const course = await getCourse(courseId, signal);
      switch (route.resource) {
        case "list":
          return {
            kind: "list",
            course,
            page: await listCourseStudents(courseId, 0, signal),
          };
        case "create":
          return course.state === "active" ? { kind: "create", course } : null;
        case "membership":
          if (studentId === null)
            throw new Error("Membership requires student identity.");
          return {
            kind: "membership",
            course,
            membership: await getCourseStudentMembership(
              courseId,
              studentId,
              signal,
            ),
          };
      }
    },
    (failure) =>
      isHiddenStudentFailure(failure) || isHiddenCourseFailure(failure),
  );
  const parent =
    courseId === null
      ? "/"
      : route.parent.path.replace(":courseId", encodeURIComponent(courseId));
  const exit = (
    <RouteDepartureLink
      className="inline-flex min-h-6 items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
      to={parent}
    >
      {intl.formatMessage(route.parent.label)}
    </RouteDepartureLink>
  );
  const Content = route.component;
  return (
    <CourseAdmissionSurface state={state} route={route} exit={exit}>
      {state.kind === "Ready" && courseId !== null ? (
        <>
          <Content
            resource={state.resource}
            links={{
              parent: prepareCoursePath(courseId),
              list: studentPath(courseId),
              create: studentPath(courseId, "create"),
              membership: (id) => studentPath(courseId, "membership", id),
            }}
            unavailable={unavailable}
          />
          {exit}
        </>
      ) : null}
    </CourseAdmissionSurface>
  );
}
