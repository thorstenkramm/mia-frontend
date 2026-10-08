import { useEffectEvent, useLayoutEffect, useRef, useState } from "react";
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
  type CourseEntryRoute,
} from "./entryRoutes";
import { SimpleEntrySurface } from "./SimpleEntrySurface";
import { RouteRecoveryBoundary } from "./RouteRecoveryBoundary";

type HostState =
  | { readonly kind: "Checking" }
  | {
      readonly kind: "Check failed" | "Unavailable";
      readonly error: EntryApiFailure;
    }
  | { readonly kind: "Ready"; readonly resource: CourseRouteResource };
const actionClass =
  "rounded-md px-3 py-2 text-sm font-semibold text-indigo-600 hover:text-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600";

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
}: {
  readonly route: CourseEntryRoute;
  readonly load: (signal: AbortSignal) => Promise<CourseRouteResource>;
}) {
  const intl = useIntl();
  const access = useAuthenticatedAccess();
  const { readAuthenticated, beginAuthenticatedLogout, checkRouteAdmission } =
    useSessionActions();
  const [state, setState] = useState<HostState>({ kind: "Checking" });
  const sequence = useRef(0);
  const start = useEffectEvent((current: () => boolean) => {
    void readAuthenticated(load).then((result) => {
      if (!current()) return;
      if (result.kind === "completed")
        setState({ kind: "Ready", resource: result.value });
      else if (result.kind === "failed")
        setState({
          kind: isHiddenCourseFailure(result.failure)
            ? "Unavailable"
            : "Check failed",
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
  const parent = route.parent;
  const exit = (
    <RouteDepartureLink to={parent.path} className={actionClass}>
      {intl.formatMessage(parent.label)}
    </RouteDepartureLink>
  );
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
  if (state.kind === "Check failed" || state.kind === "Unavailable")
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
          <TechnicalErrorDisclosure error={state.error} />
        </RouteRecoveryPanel>
      </SimpleEntrySurface>
    );
  if (state.kind !== "Ready") throw new Error("Unresolved course host state.");
  const Content = route.component;
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
        <Content
          resource={state.resource}
          links={{
            home: "/",
            list: courseRoutePaths.list,
            create: courseRoutePaths.create,
            detail: courseDetailPath,
            invitation: access?.invitationAdministration
              ? invitationRoutePaths.create
              : null,
          }}
          canCreate={
            access?.courseCreate === true &&
            access.supervisorAssignments &&
            access.supervisorCandidates
          }
          unavailable={(error) => {
            sequence.current++;
            setState({ kind: "Unavailable", error });
          }}
        />
      </RouteRecoveryBoundary>
    </ApplicationShell>
  );
}
