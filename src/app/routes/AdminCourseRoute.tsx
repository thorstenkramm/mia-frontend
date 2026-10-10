import {
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useIntl } from "react-intl";
import { listSupervisorCandidates } from "../../platform/api/administrationAccounts";
import {
  getCourse,
  isHiddenCourseFailure,
  listCourses,
} from "../../platform/api/courses";
import type { CourseId, EntryApiFailure } from "../../platform/api/entry";
import { TechnicalErrorDisclosure } from "../../platform/api/TechnicalErrorDisclosure";
import {
  useAuthenticatedAccess,
  useSessionActions,
} from "../../platform/data/EntryDataProvider";
import { messages } from "../../platform/i18n/messages";
import { RouteDepartureLink } from "../../platform/ui/RouteDepartureLink";
import { RouteRecoveryPanel } from "../../platform/ui/RouteRecoveryPanel";
import type { CourseRouteResource } from "../../features/courses/CourseRouteProps";
import { ApplicationShell } from "../ApplicationShell";
import { SessionWarning } from "../SessionLifecycle";
import { CheckingAccess } from "./CheckingAccess";
import {
  courseDetailPath,
  courseRoutePaths,
  invitationRoutePaths,
  prepareCoursePath,
  materialPath,
  studentPath,
  type CourseEntryRoute,
} from "./entryRoutes";
import { SimpleEntrySurface } from "./SimpleEntrySurface";
import { RouteRecoveryBoundary } from "./RouteRecoveryBoundary";

type HostState<T> =
  | { readonly kind: "Checking" }
  | {
      readonly kind: "Check failed" | "Unavailable";
      readonly error: EntryApiFailure | null;
    }
  | { readonly kind: "Ready"; readonly resource: T };
const actionClass =
  "rounded-md px-3 py-2 text-sm font-semibold text-indigo-600 hover:text-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600";

// Shared admission settlement, not shared authorization: each host owns its
// ordered loader and hidden-failure classification. A generation fences both
// departure and StrictMode's abandoned first load.
export function useCourseResourceAdmission<T>(
  load: (signal: AbortSignal) => Promise<T | null>,
  hidden: (failure: EntryApiFailure) => boolean,
) {
  const { readAuthenticated } = useSessionActions();
  const [state, setState] = useState<HostState<T>>({ kind: "Checking" });
  const sequence = useRef(0);
  const start = useEffectEvent((current: () => boolean) => {
    void readAuthenticated(load).then((result) => {
      if (!current()) return;
      if (result.kind === "completed")
        setState(
          result.value === null
            ? { kind: "Unavailable", error: null }
            : { kind: "Ready", resource: result.value },
        );
      else if (result.kind === "failed")
        setState({
          kind: hidden(result.failure) ? "Unavailable" : "Check failed",
          error: result.failure,
        });
    });
  });
  useLayoutEffect(() => {
    let active = true;
    const attempt = ++sequence.current;
    start(() => active && sequence.current === attempt);
    return () => {
      active = false;
    };
  }, []);
  return {
    state,
    unavailable: (error: EntryApiFailure | null) => {
      sequence.current++;
      setState({ kind: "Unavailable", error });
    },
  };
}

// Established exact shell/recovery blueprints. Hosts supply only admitted
// children; this frame owns the identical neutral checking/failure presentation.
export function CourseAdmissionSurface<T>({
  state,
  route,
  exit,
  children,
}: {
  readonly state: HostState<T>;
  readonly route: Pick<CourseEntryRoute, "titleMessage" | "headingMessage">;
  readonly exit: ReactNode;
  readonly children: ReactNode;
}) {
  const intl = useIntl();
  const { beginAuthenticatedLogout, checkRouteAdmission } = useSessionActions();
  const signOut = (
    <button
      type="button"
      className={actionClass}
      onClick={beginAuthenticatedLogout}
    >
      {intl.formatMessage(messages.logoutButton)}
    </button>
  );
  if (state.kind === "Checking")
    return (
      <CheckingAccess>
        <SessionWarning />
      </CheckingAccess>
    );
  if (state.kind !== "Ready")
    return (
      <SimpleEntrySurface
        titleMessage={messages.coursesUnavailableTitle}
        headingMessage={messages.coursesUnavailableHeading}
      >
        <SessionWarning />
        <RouteRecoveryPanel
          heading={intl.formatMessage(messages.coursesUnavailableHeading)}
          actions={
            <>
              {state.kind === "Check failed" ? (
                <button
                  type="button"
                  className={actionClass}
                  onClick={() => void checkRouteAdmission()}
                >
                  {intl.formatMessage(messages.mfaCheckAgain)}
                </button>
              ) : null}
              {exit}
              {signOut}
            </>
          }
        >
          <p>
            {intl.formatMessage(
              state.kind === "Unavailable"
                ? messages.coursesUnavailable
                : messages.coursesCheckFailed,
            )}
          </p>
          {state.error === null ? null : (
            <TechnicalErrorDisclosure error={state.error} />
          )}
        </RouteRecoveryPanel>
      </SimpleEntrySurface>
    );
  return (
    <ApplicationShell
      titleMessage={route.titleMessage}
      headingMessage={route.headingMessage}
    >
      <SessionWarning />
      <RouteRecoveryBoundary
        actions={
          <>
            {exit}
            {signOut}
          </>
        }
      >
        {children}
      </RouteRecoveryBoundary>
    </ApplicationShell>
  );
}

export function AdminCourseRoute({
  route,
  courseId,
}: {
  readonly route: CourseEntryRoute;
  readonly courseId: CourseId | null;
}) {
  const access = useAuthenticatedAccess();
  return (
    <CourseResourceHost
      route={route}
      load={async (signal) => {
        switch (route.resource) {
          case "list":
            return { kind: "list", page: await listCourses(0, signal) };
          case "detail":
            if (courseId === null)
              throw new Error("Course detail admission requires an ID.");
            return {
              kind: "detail",
              course: await getCourse(courseId, signal),
            };
          case "create":
            return {
              kind: "create",
              page: access?.supervisorCandidates
                ? await listSupervisorCandidates(0, signal)
                : null,
            };
          case "prepare":
          case "hub":
          case "readiness":
          case "activation":
          case "description":
          case "curriculum":
          case "learningGoals":
          case "instructions":
          case "language":
            throw new Error("Prepare requires scoped resource admission.");
        }
      }}
    />
  );
}

// Course-specific resource gate shared by admin and exact-scope Prepare hosts.
// This owns failure transitions, so dependent denial removes the entire feature,
// shell, form, selected labels and open departure dialog before neutral recovery.
export function CourseResourceHost({
  route,
  load,
  courseId = null,
}: {
  readonly route: CourseEntryRoute;
  readonly load: (signal: AbortSignal) => Promise<CourseRouteResource>;
  readonly courseId?: CourseId | null;
}) {
  const intl = useIntl();
  const access = useAuthenticatedAccess();
  const { state, unavailable } = useCourseResourceAdmission(
    load,
    isHiddenCourseFailure,
  );
  const parent = {
    ...route.parent,
    path:
      courseId === null
        ? route.parent.path
        : route.parent.path.replace(":courseId", encodeURIComponent(courseId)),
  };
  const exit = (
    <RouteDepartureLink to={parent.path} className={actionClass}>
      {intl.formatMessage(parent.label)}
    </RouteDepartureLink>
  );
  const Content = route.component;
  return (
    <CourseAdmissionSurface state={state} route={route} exit={exit}>
      {state.kind === "Ready" ? (
        <Content
          resource={state.resource}
          links={{
            home: "/",
            list: courseRoutePaths.list,
            create: courseRoutePaths.create,
            detail: courseDetailPath,
            preparation: prepareCoursePath,
            materials: materialPath,
            students: (id) => studentPath(id),
            studentCreate: (id) => studentPath(id, "create"),
            readiness: (id) => prepareCoursePath(id, "readiness"),
            activation: (id) => prepareCoursePath(id, "activation"),
            invitation: access?.invitationAdministration
              ? invitationRoutePaths.create
              : null,
          }}
          canCreate={
            access?.courseCreate === true &&
            access.supervisorAssignments &&
            access.supervisorCandidates
          }
          unavailable={unavailable}
        />
      ) : null}
    </CourseAdmissionSurface>
  );
}
