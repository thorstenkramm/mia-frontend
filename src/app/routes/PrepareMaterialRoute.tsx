import { useEffectEvent, useLayoutEffect, useRef, useState } from "react";
import { useIntl } from "react-intl";
import {
  getCoursePreparation,
  isHiddenCourseFailure,
} from "../../platform/api/courses";
import {
  getMaterial,
  isHiddenMaterialFailure,
  listMaterialFiles,
  listMaterials,
  type MaterialId,
} from "../../platform/api/materials";
import type { CourseId, EntryApiFailure } from "../../platform/api/entry";
import {
  useAuthenticatedAccess,
  useSessionActions,
} from "../../platform/data/EntryDataProvider";
import { messages } from "../../platform/i18n/messages";
import { TechnicalErrorDisclosure } from "../../platform/api/TechnicalErrorDisclosure";
import { RouteDepartureLink } from "../../platform/ui/RouteDepartureLink";
import { RouteRecoveryPanel } from "../../platform/ui/RouteRecoveryPanel";
import {
  materialActionClass,
  type MaterialResource,
} from "../../features/materials/MaterialRouteProps";
import { ApplicationShell } from "../ApplicationShell";
import { SessionWarning } from "../SessionLifecycle";
import { CheckingAccess } from "./CheckingAccess";
import { SimpleEntrySurface } from "./SimpleEntrySurface";
import { RouteRecoveryBoundary } from "./RouteRecoveryBoundary";
import {
  materialPath,
  prepareCoursePath,
  type MaterialEntryRoute,
} from "./entryRoutes";

type HostState =
  | { readonly kind: "Checking" }
  | { readonly kind: "Ready"; readonly resource: MaterialResource }
  | {
      readonly kind: "Unavailable" | "Check failed";
      readonly error: EntryApiFailure | null;
    };
export default function PrepareMaterialRoute({
  route,
  courseId,
  materialId,
}: {
  readonly route: MaterialEntryRoute;
  readonly courseId: CourseId | null;
  readonly materialId: MaterialId | null;
}) {
  const intl = useIntl();
  const access = useAuthenticatedAccess();
  const { readAuthenticated, checkRouteAdmission, beginAuthenticatedLogout } =
    useSessionActions();
  const [state, setState] = useState<HostState>({ kind: "Checking" });
  const live = useRef(false);
  const load = useEffectEvent(() => {
    void readAuthenticated(async (signal) => {
      if (
        courseId === null ||
        !access?.courseSupervision ||
        !access.supervisedCourseIds.includes(courseId)
      )
        throw new Error("Material admission requires assigned course scope.");
      await getCoursePreparation(courseId, signal);
      switch (route.resource) {
        case "list":
          return {
            kind: "list",
            page: await listMaterials(courseId, 0, signal),
          } as const;
        case "create":
          return { kind: "create" } as const;
        case "detail":
        case "files": {
          if (materialId === null)
            throw new Error("Material resource requires an identity.");
          const material = await getMaterial(courseId, materialId, signal);
          if (route.resource === "detail")
            return { kind: "detail", material } as const;
          if (material.scope !== "course-wide" || material.format === "link")
            return { kind: "Unavailable" } as const;
          return {
            kind: "files",
            material,
            files: await listMaterialFiles(materialId, signal),
          } as const;
        }
      }
    }).then((result) => {
      if (!live.current) return;
      if (result.kind === "completed")
        setState(
          result.value.kind === "Unavailable"
            ? { kind: "Unavailable", error: null }
            : { kind: "Ready", resource: result.value },
        );
      else if (result.kind === "failed")
        setState({
          kind:
            isHiddenMaterialFailure(result.failure) ||
            isHiddenCourseFailure(result.failure)
              ? "Unavailable"
              : "Check failed",
          error: result.failure,
        });
    });
  });
  useLayoutEffect(() => {
    live.current = true;
    load();
    return () => {
      live.current = false;
    };
  }, []);
  const parent =
    courseId === null
      ? "/"
      : route.parent.path
          .replace(":courseId", encodeURIComponent(courseId))
          .replace(
            ":materialId",
            materialId === null ? "" : encodeURIComponent(materialId),
          );
  const exit = (
    <RouteDepartureLink className={materialActionClass} to={parent}>
      {intl.formatMessage(route.parent.label)}
    </RouteDepartureLink>
  );
  if (state.kind === "Checking")
    return (
      <CheckingAccess>
        <SessionWarning />
      </CheckingAccess>
    );
  if (state.kind !== "Ready" || courseId === null)
    return (
      <SimpleEntrySurface
        titleMessage={messages.coursesUnavailableTitle}
        headingMessage={messages.coursesUnavailableHeading}
      >
        {/* jscpd:ignore-start — same fixed unavailable presentation as AdminCourseRoute;
            admission and dependent teardown remain independently owned. */}
        <SessionWarning />
        <RouteRecoveryPanel
          heading={intl.formatMessage(messages.coursesUnavailableHeading)}
          actions={
            <>
              {state.kind === "Check failed" ? (
                <button
                  type="button"
                  className={materialActionClass}
                  onClick={() => void checkRouteAdmission()}
                >
                  {/* jscpd:ignore-end */}
                  {intl.formatMessage(messages.invitationsRefresh)}
                </button>
              ) : null}
              {exit}
              <button
                type="button"
                className={materialActionClass}
                onClick={beginAuthenticatedLogout}
              >
                {intl.formatMessage(messages.logoutButton)}
              </button>
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
          {state.kind === "Ready" || state.error === null ? null : (
            <TechnicalErrorDisclosure error={state.error} />
          )}
        </RouteRecoveryPanel>
      </SimpleEntrySurface>
    );
  const Content = route.component;
  return (
    <ApplicationShell
      titleMessage={route.titleMessage}
      headingMessage={route.headingMessage}
    >
      <SessionWarning />
      <RouteRecoveryBoundary actions={exit}>
        <Content
          courseId={courseId}
          resource={state.resource}
          links={{
            parent: prepareCoursePath(courseId),
            list: materialPath(courseId),
            create: materialPath(courseId, "create"),
            detail: (id) => materialPath(courseId, "detail", id),
            files: (id) => materialPath(courseId, "files", id),
          }}
          unavailable={(error) => setState({ kind: "Unavailable", error })}
        />
        {exit}
      </RouteRecoveryBoundary>
    </ApplicationShell>
  );
}
