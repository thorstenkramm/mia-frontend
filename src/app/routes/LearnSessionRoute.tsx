import { useIntl } from "react-intl";
import {
  getLearnCourse,
  listApprovedCourseMaterialMetadata,
  listJoinedActiveCourses,
} from "../../platform/api/learnCourses";
import type { CourseId } from "../../platform/api/entry";
import {
  getActiveTutoringSession,
  getTutoringSession,
  isHiddenTutoringFailure,
  listSessionTurns,
  type TutoringSessionId,
} from "../../platform/api/tutoringSessions";
import { useAuthenticatedAccess } from "../../platform/data/EntryDataProvider";
import { messages } from "../../platform/i18n/messages";
import { RouteDepartureLink } from "../../platform/ui/RouteDepartureLink";
import type { TutoringResource } from "../../features/tutoring/TutoringRouteProps";
import {
  CourseAdmissionSurface,
  useCourseResourceAdmission,
} from "./AdminCourseRoute";
import {
  learnCoursePaths,
  learnSessionPath,
  learnSessionPaths,
  learnStartPath,
  learnStartPaths,
  type LearnSessionEntryRoute,
} from "./entryRoutes";

// Story 6.1 tutoring host. The ordered gate: learning participation, then
// per-resource ordered reads — BCG-002 active-session discovery before any
// start affordance; course re-read before the material choice; the addressed
// session read before the transcript. Hidden failures share one neutral
// presentation through the shared admission surface with tutoring copy.
export default function LearnSessionRoute({
  route,
  courseId,
  sessionId,
}: {
  readonly route: LearnSessionEntryRoute;
  readonly courseId: CourseId | null;
  readonly sessionId: TutoringSessionId | null;
}) {
  const intl = useIntl();
  const access = useAuthenticatedAccess();
  const { state, unavailable } = useCourseResourceAdmission<TutoringResource>(
    async (signal) => {
      if (!access?.learningParticipation) return null;
      switch (route.resource) {
        case "start-choice": {
          const active = await getActiveTutoringSession(signal);
          if (active !== null)
            return { kind: "start-choice", active, ids: [], batch: null };
          const ids = access.joinedCourseIds;
          return {
            kind: "start-choice",
            active: null,
            ids,
            batch: await listJoinedActiveCourses(ids, 0, signal),
          };
        }
        case "material-choice": {
          if (courseId === null || !access.joinedCourseIds.includes(courseId))
            return null;
          const course = await getLearnCourse(courseId, signal);
          if (course === null) return null;
          const active = await getActiveTutoringSession(signal);
          if (active !== null)
            return { kind: "material-choice", course, active, page: null };
          if (!course.newSession.eligible)
            return {
              kind: "material-choice",
              course,
              active: null,
              page: null,
            };
          return {
            kind: "material-choice",
            course,
            active: null,
            page: await listApprovedCourseMaterialMetadata(
              course.id,
              0,
              signal,
            ),
          };
        }
        case "recovery":
          return {
            kind: "recovery",
            active: await getActiveTutoringSession(signal),
          };
        case "workspace": {
          if (sessionId === null) return null;
          const session = await getTutoringSession(sessionId, signal);
          return {
            kind: "workspace",
            session,
            page:
              session.state === "active"
                ? await listSessionTurns(session.id, 0, signal)
                : null,
          };
        }
      }
    },
    isHiddenTutoringFailure,
  );
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
  // Exact host JSX intentionally matches the Learn course host; tutoring's
  // ordered reads and hidden policy must remain separate. Shared settlement
  // and the neutral frame already have one owner. Marker is JSX only.
  // jscpd:ignore-start
  return (
    <CourseAdmissionSurface
      state={state}
      route={route}
      exit={exit}
      copy={{
        unavailableTitle: messages.tutoringUnavailableTitle,
        unavailableHeading: messages.tutoringUnavailableHeading,
        unavailableBody: messages.tutoringUnavailableBody,
        checkFailedBody: messages.tutoringCheckFailed,
      }}
    >
      {state.kind === "Ready" ? (
        <Content
          resource={state.resource}
          links={{
            home: "/",
            courses: learnCoursePaths.list,
            start: learnStartPaths.choice,
            material: (id) => learnStartPath(id),
            recovery: learnSessionPaths.recovery,
            workspace: (id) => learnSessionPath(id),
          }}
          unavailable={unavailable}
        />
      ) : null}
    </CourseAdmissionSurface>
  );
  // jscpd:ignore-end
}
