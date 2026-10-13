import { useLayoutEffect } from "react";
import { useIntl } from "react-intl";
import { useLocation } from "react-router";
import {
  getLearnCourse,
  listApprovedCourseMaterialMetadata,
  listJoinedActiveCourses,
} from "../../platform/api/learnCourses";
import { toMaterialId, type CourseId } from "../../platform/api/entry";
import {
  getActiveTutoringSession,
  getTutoringSession,
  getTutoringSessionCurrentWork,
  isHiddenTutoringFailure,
  listSessionTurns,
  type TutoringSessionId,
} from "../../platform/api/tutoringSessions";
import { useAuthenticatedAccess } from "../../platform/data/EntryDataProvider";
import { messages } from "../../platform/i18n/messages";
import { RouteDepartureLink } from "../../platform/ui/RouteDepartureLink";
import type { TutoringResource } from "../../features/tutoring/TutoringRouteProps";
import { tutoringRetention } from "../../features/tutoring/tutoringRetention";
import {
  CourseAdmissionSurface,
  useCourseResourceAdmission,
} from "./AdminCourseRoute";
import {
  learnCoursePaths,
  learnIntentPath,
  learnSessionPath,
  learnSessionPaths,
  learnStartPath,
  learnStartPaths,
  type LearnSessionEntryRoute,
} from "./entryRoutes";

// Story 6.2 (D2): the material-choice Continue carries exactly one opaque
// MaterialId or an explicit none marker in location state. Malformed or
// absent state is the documented intent-only start; a selection is never
// fabricated and message text never travels.
function handoffMaterial(state: unknown) {
  if (typeof state !== "object" || state === null || !("material" in state))
    return null;
  const value = (state as { readonly material: unknown }).material;
  if (value === null) return null;
  return typeof value === "string" ? toMaterialId(value) : null;
}

// Story 6.1/6.2 tutoring host. The ordered gate: learning participation, then
// per-resource ordered reads — BCG-002 active-session discovery before any
// start affordance; course re-read before the material choice and the intent
// route; the addressed session read, then the BCG-012 current-work read, then
// the transcript on the workspace. Hidden failures share one neutral
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
  const location = useLocation();
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
        case "intent": {
          if (courseId === null || !access.joinedCourseIds.includes(courseId))
            return null;
          const course = await getLearnCourse(courseId, signal);
          if (course === null) return null;
          const active = await getActiveTutoringSession(signal);
          if (active !== null)
            return { kind: "intent", course, active, material: null };
          return {
            kind: "intent",
            course,
            active: null,
            material: handoffMaterial(location.state),
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
          if (session.state !== "active")
            return { kind: "workspace", session, work: null, page: null };
          // The authoritative work read precedes the transcript so the
          // composer never enables without server-authored actions (BCG-012).
          const work = await getTutoringSessionCurrentWork(
            session.id,
            {},
            signal,
          );
          return {
            kind: "workspace",
            session,
            work,
            page: await listSessionTurns(session.id, 0, signal),
          };
        }
      }
    },
    isHiddenTutoringFailure,
  );
  // Admission has the authoritative addressed-resource result. A denied
  // workspace must discard page memory even when account/scope/route keys
  // remain identical; a nondefinitive check failure keeps it covered.
  useLayoutEffect(() => {
    if (route.resource === "workspace" && state.kind === "Unavailable")
      tutoringRetention.destroy();
  }, [route.resource, state.kind]);
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
            intent: (id) => learnIntentPath(id),
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
