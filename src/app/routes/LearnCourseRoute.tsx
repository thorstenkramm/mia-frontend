import { useIntl } from "react-intl";
import {
  getLearnCourse,
  isHiddenLearnFailure,
  listJoinedActiveCourses,
  listApprovedCourseMaterialMetadata,
} from "../../platform/api/learnCourses";
import type { CourseId } from "../../platform/api/entry";
import { useAuthenticatedAccess } from "../../platform/data/EntryDataProvider";
import { messages } from "../../platform/i18n/messages";
import { RouteDepartureLink } from "../../platform/ui/RouteDepartureLink";
import type { LearnCourseResource } from "../../features/courses/LearnCourseRouteProps";
import {
  CourseAdmissionSurface,
  useCourseResourceAdmission,
} from "./AdminCourseRoute";
import {
  learnCoursePath,
  learnCoursePaths,
  type LearnCourseEntryRoute,
} from "./entryRoutes";

// BCG-020: stage and complete capabilities have already settled. Each course
// independently reauthorizes; dependent metadata follows only an active joined
// course. The session owner fences this entire read in its current scope epoch.
export default function LearnCourseRoute({
  route,
  courseId,
}: {
  readonly route: LearnCourseEntryRoute;
  readonly courseId: CourseId | null;
}) {
  const intl = useIntl();
  const access = useAuthenticatedAccess();
  const { state, unavailable } =
    useCourseResourceAdmission<LearnCourseResource>(async (signal) => {
      if (!access?.learningParticipation) return null;
      if (route.resource === "list") {
        const ids = access.joinedCourseIds;
        return {
          kind: "list",
          ids,
          batch: await listJoinedActiveCourses(ids, 0, signal),
        };
      }
      if (courseId === null || !access.joinedCourseIds.includes(courseId))
        return null;
      const course = await getLearnCourse(courseId, signal);
      if (course === null) return null;
      return {
        kind: route.resource,
        course,
        page: await listApprovedCourseMaterialMetadata(courseId, 0, signal),
      };
    }, isHiddenLearnFailure);
  // Fixed safe exit, never a cached or potentially revoked resource parent.
  const exit = (
    <RouteDepartureLink
      to="/"
      className="inline-flex min-h-6 rounded-md px-3 py-2 text-sm font-semibold text-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
    >
      {intl.formatMessage(messages.invitationsBackToHome)}
    </RouteDepartureLink>
  );
  const Content = route.component;
  // Exact host JSX intentionally matches the staff host; Learn's minimal
  // resource/links and joined authorization must remain separate. Shared
  // settlement and neutral frame already have one owner. Marker is JSX only.
  // jscpd:ignore-start
  return (
    <CourseAdmissionSurface state={state} route={route} exit={exit}>
      {state.kind === "Ready" ? (
        <Content
          resource={state.resource}
          links={{
            list: learnCoursePaths.list,
            detail: learnCoursePath,
            materials: (id) => learnCoursePath(id, true),
          }}
          unavailable={unavailable}
        />
      ) : null}
    </CourseAdmissionSurface>
  );
  // jscpd:ignore-end
}
