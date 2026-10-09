import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import { messages } from "../../platform/i18n/messages";
import type { TextSize } from "../../platform/prefs/preferences";
import type { InvitationLink } from "../../platform/session/invitationLink";
import type { PasswordResetLink } from "../../platform/session/passwordResetLink";
import { mfaPaths } from "../../platform/session/mfaEnrollment";
import type { MfaRouteProps } from "../../features/profile/MfaRouteProps";
import type { InvitationRouteProps } from "../../features/invitations/InvitationRouteProps";
import type { CourseRouteProps } from "../../features/courses/CourseRouteProps";
import type { MaterialRouteProps } from "../../features/materials/MaterialRouteProps";
import { toMaterialId, type MaterialId } from "../../platform/api/entry";
import { toCourseId, type CourseId } from "../../platform/api/entry";
import type { CourseTeachingField } from "../../platform/api/courses";
import { courseTeachingFields } from "../../features/courses/courseTeachingFields";
import {
  toInvitationId,
  type InvitationId,
} from "../../platform/api/invitations";

export type EntryRouteProps = {
  initialTextSize: TextSize;
  logoutConfirmed?: boolean;
  passwordResetLink: PasswordResetLink;
  invitationLink: InvitationLink;
};
type EntryRouteBase = {
  readonly parent: {
    readonly path: string;
    readonly label: (typeof messages)[keyof typeof messages];
  } | null;
  readonly titleMessage: (typeof messages)[keyof typeof messages];
  readonly headingMessage: (typeof messages)[keyof typeof messages];
};
type EntryRoute =
  | (EntryRouteBase & {
      readonly path:
        | "/"
        | "/login"
        | "/login/recovery"
        | "/password-reset"
        | "/invitation"
        | "/invitation/accept"
        | "/auth/mfa"
        | "/auth/mfa/recovery"
        | "/auth/password-change"
        | "/auth/logout";
      readonly gate:
        | "Public"
        | "Public + Token(reset)"
        | "Public + Token(invitation)"
        | "Restricted(mfa)"
        | "Restricted(password-change)"
        | "Restricted(logout)"
        | "Authenticated";
      readonly component: LazyExoticComponent<ComponentType<EntryRouteProps>>;
    })
  // Owner decision 2026-10-05: authenticated stage, then own-scope
  // `profile.view`, then the MFA state read as the route resource.
  | (EntryRouteBase & {
      readonly path: (typeof mfaPaths)[keyof typeof mfaPaths];
      readonly gate: "Profile(own MFA)";
      readonly component: LazyExoticComponent<ComponentType<MfaRouteProps>>;
    })
  // Story 3.1 decisions 2026-10-07 (BACKEND-CONTRACT-GAPS.md §BCG-003/006/014):
  // authenticated stage, then globally scoped `accounts.administer`, then the
  // route's existence-proving invitation resource where it has one.
  | (EntryRouteBase & {
      readonly path: (typeof invitationRoutePaths)[keyof typeof invitationRoutePaths];
      readonly gate: "Administer(invitations)";
      readonly resource: "invitation list" | "invitation" | null;
      readonly component: LazyExoticComponent<
        ComponentType<InvitationRouteProps>
      >;
    })
  | (EntryRouteBase & {
      readonly path: (typeof courseRoutePaths)[keyof typeof courseRoutePaths];
      readonly gate: "Administer(courses)" | "Prepare(courses)";
      readonly resource:
        "list" | "detail" | "create" | "prepare" | "hub" | CourseTeachingField;
      readonly component: LazyExoticComponent<ComponentType<CourseRouteProps>>;
    })
  | (EntryRouteBase & {
      readonly path: (typeof materialRoutePaths)[keyof typeof materialRoutePaths];
      readonly gate: "Prepare(materials)";
      readonly resource: "list" | "create" | "detail" | "files";
      readonly component: LazyExoticComponent<
        ComponentType<MaterialRouteProps>
      >;
    });

export const materialRoutePaths = {
  list: "/prepare/courses/:courseId/materials",
  create: "/prepare/courses/:courseId/materials/new",
  detail: "/prepare/courses/:courseId/materials/:materialId",
  files: "/prepare/courses/:courseId/materials/:materialId/files",
} as const;
export function materialPath(
  course: CourseId,
  resource: keyof typeof materialRoutePaths = "list",
  id: MaterialId | null = null,
): string {
  return materialRoutePaths[resource]
    .replace(":courseId", encodeURIComponent(course))
    .replace(":materialId", id === null ? "" : encodeURIComponent(id));
}

export const courseRoutePaths = {
  list: "/admin/courses",
  create: "/admin/courses/new",
  detail: "/admin/courses/:courseId",
  prepare: "/prepare/courses",
  hub: "/prepare/courses/:courseId",
  description: "/prepare/courses/:courseId/details",
  curriculum: "/prepare/courses/:courseId/curriculum",
  learningGoals: "/prepare/courses/:courseId/learning-goals",
  instructions: "/prepare/courses/:courseId/ai-instructions",
  language: "/prepare/courses/:courseId/language",
} as const;
export function prepareCoursePath(
  id: CourseId,
  field: CourseTeachingField | null = null,
): string {
  return courseRoutePaths[field ?? "hub"].replace(
    ":courseId",
    encodeURIComponent(id),
  );
}
const materialRoutes = {
  materialList: {
    resource: "list",
    path: materialRoutePaths.list,
    parent: { path: courseRoutePaths.hub, label: messages.preparationHub },
    titleMessage: messages.materialsTitle,
    headingMessage: messages.materialsHeading,
    component: lazy(() => import("../../features/materials/MaterialListRoute")),
  },
  materialCreate: {
    resource: "create",
    path: materialRoutePaths.create,
    parent: { path: materialRoutePaths.list, label: messages.materialsHeading },
    titleMessage: messages.materialCreateTitle,
    headingMessage: messages.materialCreate,
    component: lazy(
      () => import("../../features/materials/MaterialCreateRoute"),
    ),
  },
  materialDetail: {
    resource: "detail",
    path: materialRoutePaths.detail,
    parent: { path: materialRoutePaths.list, label: messages.materialsHeading },
    titleMessage: messages.materialDetailTitle,
    headingMessage: messages.materialDetail,
    component: lazy(
      () => import("../../features/materials/MaterialDetailRoute"),
    ),
  },
  materialFiles: {
    resource: "files",
    path: materialRoutePaths.files,
    parent: { path: materialRoutePaths.detail, label: messages.materialDetail },
    titleMessage: messages.materialFilesTitle,
    headingMessage: messages.materialFiles,
    component: lazy(
      () => import("../../features/materials/MaterialFilesRoute"),
    ),
  },
} as const;
const preparationHubRoute = {
  parent: {
    path: courseRoutePaths.prepare,
    label: messages.coursesPrepareHeading,
  },
  path: courseRoutePaths.hub,
  gate: "Prepare(courses)",
  resource: "hub",
  titleMessage: messages.preparationHubTitle,
  headingMessage: messages.preparationHub,
  component: lazy(
    () => import("../../features/courses/CoursePreparationRoute"),
  ),
} as const;
function teachingRoute<Field extends CourseTeachingField>(field: Field) {
  const descriptor = courseTeachingFields[field];
  return {
    parent: { path: courseRoutePaths.hub, label: messages.preparationHub },
    path: courseRoutePaths[field],
    gate: "Prepare(courses)",
    resource: field,
    titleMessage: descriptor.title,
    headingMessage: descriptor.heading,
    component: lazy(
      () => import("../../features/courses/CourseTeachingFieldRoute"),
    ),
  } as const;
}
export function courseDetailPath(id: CourseId): string {
  return courseRoutePaths.detail.replace(":courseId", encodeURIComponent(id));
}

// ROUTE-INVENTORY.md §Invitations. `:invitationId` is an opaque backend ID.
// Delete faulty invitation is outside Story 3.1 and has no entry.
export const invitationRoutePaths = {
  list: "/admin/invitations",
  create: "/admin/invitations/new",
  detail: "/admin/invitations/:invitationId",
  resend: "/admin/invitations/:invitationId/resend",
  revoke: "/admin/invitations/:invitationId/revoke",
} as const;

// Concrete invitation paths, built only from the route table's templates.
export function invitationPath(
  template: (typeof invitationRoutePaths)[keyof typeof invitationRoutePaths],
  id: InvitationId | null = null,
): string {
  return id === null
    ? template
    : template.replace(":invitationId", encodeURIComponent(id));
}

export const entryRoutes = {
  materialList: { ...materialRoutes.materialList, gate: "Prepare(materials)" },
  materialCreate: {
    ...materialRoutes.materialCreate,
    gate: "Prepare(materials)",
  },
  materialDetail: {
    ...materialRoutes.materialDetail,
    gate: "Prepare(materials)",
  },
  materialFiles: {
    ...materialRoutes.materialFiles,
    gate: "Prepare(materials)",
  },
  preparationHub: preparationHubRoute,
  preparationDescription: teachingRoute("description"),
  preparationCurriculum: teachingRoute("curriculum"),
  preparationGoals: teachingRoute("learningGoals"),
  preparationInstructions: teachingRoute("instructions"),
  preparationLanguage: teachingRoute("language"),
  signedOut: {
    parent: null,
    path: "/login",
    gate: "Public",
    titleMessage: messages.pageTitle,
    headingMessage: messages.heading,
    component: lazy(() => import("../../features/auth/SignedOutEntryRoute")),
  },
  passwordRecovery: {
    parent: { path: "/login", label: messages.backToSignIn },
    path: "/login/recovery",
    gate: "Public",
    titleMessage: messages.recoveryPageTitle,
    headingMessage: messages.recoveryHeading,
    component: lazy(
      () => import("../../features/auth/PasswordRecoveryEntryRoute"),
    ),
  },
  passwordReset: {
    parent: { path: "/login", label: messages.backToSignIn },
    path: "/password-reset",
    gate: "Public + Token(reset)",
    titleMessage: messages.resetPageTitle,
    headingMessage: messages.resetHeading,
    component: lazy(
      () => import("../../features/auth/PasswordResetEntryRoute"),
    ),
  },
  invitation: {
    parent: { path: "/login", label: messages.backToSignIn },
    path: "/invitation",
    gate: "Public + Token(invitation)",
    titleMessage: messages.invitationPageTitle,
    headingMessage: messages.invitationHeading,
    component: lazy(() => import("../../features/auth/InvitationEntryRoute")),
  },
  invitationAccept: {
    parent: { path: "/invitation", label: messages.routeBackToInvitation },
    path: "/invitation/accept",
    gate: "Public + Token(invitation)",
    titleMessage: messages.invitationAcceptPageTitle,
    headingMessage: messages.invitationAcceptHeading,
    component: lazy(() => import("../../features/auth/InvitationEntryRoute")),
  },
  mfa: {
    parent: null,
    path: "/auth/mfa",
    gate: "Restricted(mfa)",
    titleMessage: messages.mfaPageTitle,
    headingMessage: messages.mfaHeading,
    component: lazy(() => import("../../features/auth/MfaEntryRoute")),
  },
  mfaRecovery: {
    parent: { path: "/auth/mfa", label: messages.mfaUseVerification },
    path: "/auth/mfa/recovery",
    gate: "Restricted(mfa)",
    titleMessage: messages.mfaRecoveryPageTitle,
    headingMessage: messages.mfaRecoveryHeading,
    component: lazy(() => import("../../features/auth/MfaEntryRoute")),
  },
  passwordChange: {
    parent: null,
    path: "/auth/password-change",
    gate: "Restricted(password-change)",
    titleMessage: messages.passwordChangePageTitle,
    headingMessage: messages.passwordChangeHeading,
    component: lazy(
      () => import("../../features/auth/PasswordChangeEntryRoute"),
    ),
  },
  restrictedLogout: {
    parent: null,
    path: "/auth/logout",
    gate: "Restricted(logout)",
    titleMessage: messages.logoutPageTitle,
    headingMessage: messages.logoutHeading,
    component: lazy(() => import("../../features/auth/LogoutEntryRoute")),
  },
  home: {
    parent: null,
    path: "/",
    gate: "Authenticated",
    titleMessage: messages.homePageTitle,
    headingMessage: messages.homeHeading,
    component: lazy(() => import("../../features/home/HomeEntryRoute")),
  },
  mfaOverview: {
    // BCG-009 owner decision 2026-10-07: Home until /profile exists.
    parent: { path: "/", label: messages.mfaBackToHome },
    path: mfaPaths.overview,
    gate: "Profile(own MFA)",
    titleMessage: messages.mfaOverviewPageTitle,
    headingMessage: messages.mfaOverviewHeading,
    component: lazy(() => import("../../features/profile/MfaOverviewRoute")),
  },
  mfaEnroll: {
    parent: { path: mfaPaths.overview, label: messages.mfaBackToOverview },
    path: mfaPaths.enroll,
    gate: "Profile(own MFA)",
    titleMessage: messages.mfaEnrollPageTitle,
    headingMessage: messages.mfaEnrollHeading,
    component: lazy(() => import("../../features/profile/MfaEnrollRoute")),
  },
  mfaVerify: {
    // The safe fallback remains overview when setup is left/lost.
    parent: { path: mfaPaths.overview, label: messages.mfaBackToOverview },
    path: mfaPaths.verify,
    gate: "Profile(own MFA)",
    titleMessage: messages.mfaVerifyPageTitle,
    headingMessage: messages.mfaVerifyHeading,
    component: lazy(() => import("../../features/profile/MfaVerifyRoute")),
  },
  mfaRecoveryCodes: {
    parent: { path: mfaPaths.overview, label: messages.mfaBackToOverview },
    path: mfaPaths.recoveryCodes,
    gate: "Profile(own MFA)",
    titleMessage: messages.mfaCodesPageTitle,
    headingMessage: messages.mfaCodesHeading,
    component: lazy(
      () => import("../../features/profile/MfaRecoveryCodesRoute"),
    ),
  },
  invitationList: {
    parent: { path: "/", label: messages.invitationsBackToHome },
    path: invitationRoutePaths.list,
    gate: "Administer(invitations)",
    resource: "invitation list",
    titleMessage: messages.invitationsListPageTitle,
    headingMessage: messages.invitationsListHeading,
    component: lazy(
      () => import("../../features/invitations/InvitationListRoute"),
    ),
  },
  invitationCreate: {
    parent: {
      path: invitationRoutePaths.list,
      label: messages.invitationsBackToList,
    },
    path: invitationRoutePaths.create,
    gate: "Administer(invitations)",
    resource: null,
    titleMessage: messages.invitationsCreatePageTitle,
    headingMessage: messages.invitationsCreateHeading,
    component: lazy(
      () => import("../../features/invitations/InvitationCreateRoute"),
    ),
  },
  invitationDetail: {
    parent: {
      path: invitationRoutePaths.list,
      label: messages.invitationsBackToList,
    },
    path: invitationRoutePaths.detail,
    gate: "Administer(invitations)",
    resource: "invitation",
    titleMessage: messages.invitationsDetailPageTitle,
    headingMessage: messages.invitationsDetailHeading,
    component: lazy(
      () => import("../../features/invitations/InvitationDetailRoute"),
    ),
  },
  invitationResend: {
    parent: {
      path: invitationRoutePaths.detail,
      label: messages.invitationsBackToDetail,
    },
    path: invitationRoutePaths.resend,
    gate: "Administer(invitations)",
    resource: "invitation",
    titleMessage: messages.invitationsResendPageTitle,
    headingMessage: messages.invitationsResendHeading,
    component: lazy(
      () => import("../../features/invitations/InvitationResendRoute"),
    ),
  },
  invitationRevoke: {
    parent: {
      path: invitationRoutePaths.detail,
      label: messages.invitationsBackToDetail,
    },
    path: invitationRoutePaths.revoke,
    gate: "Administer(invitations)",
    resource: "invitation",
    titleMessage: messages.invitationsRevokePageTitle,
    headingMessage: messages.invitationsRevokeHeading,
    component: lazy(
      () => import("../../features/invitations/InvitationRevokeRoute"),
    ),
  },
  courseList: {
    parent: { path: "/", label: messages.invitationsBackToHome },
    path: courseRoutePaths.list,
    gate: "Administer(courses)",
    resource: "list",
    titleMessage: messages.coursesListTitle,
    headingMessage: messages.coursesListHeading,
    component: lazy(() => import("../../features/courses/CourseListRoute")),
  },
  courseCreate: {
    parent: { path: courseRoutePaths.list, label: messages.coursesBackToList },
    path: courseRoutePaths.create,
    gate: "Administer(courses)",
    resource: "create",
    titleMessage: messages.coursesCreateTitle,
    headingMessage: messages.coursesCreateHeading,
    component: lazy(() => import("../../features/courses/CourseCreateRoute")),
  },
  courseDetail: {
    parent: { path: courseRoutePaths.list, label: messages.coursesBackToList },
    path: courseRoutePaths.detail,
    gate: "Administer(courses)",
    resource: "detail",
    titleMessage: messages.coursesDetailTitle,
    headingMessage: messages.coursesDetailHeading,
    component: lazy(() => import("../../features/courses/CourseDetailRoute")),
  },
  prepareCourses: {
    parent: { path: "/", label: messages.invitationsBackToHome },
    path: courseRoutePaths.prepare,
    gate: "Prepare(courses)",
    resource: "prepare",
    titleMessage: messages.coursesPrepareTitle,
    headingMessage: messages.coursesPrepareHeading,
    component: lazy(
      () => import("../../features/courses/PrepareCourseListRoute"),
    ),
  },
} as const satisfies Record<string, EntryRoute>;

export type EntryRouteKey = keyof typeof entryRoutes;
export type ProfileMfaEntryRoute = Extract<
  (typeof entryRoutes)[EntryRouteKey],
  { readonly gate: "Profile(own MFA)" }
>;

export type InvitationEntryRoute = Extract<
  (typeof entryRoutes)[EntryRouteKey],
  { readonly gate: "Administer(invitations)" }
>;
export type CourseEntryRoute = Extract<
  (typeof entryRoutes)[EntryRouteKey],
  { readonly gate: "Administer(courses)" | "Prepare(courses)" }
>;
export type MaterialEntryRoute = Extract<
  (typeof entryRoutes)[EntryRouteKey],
  { readonly gate: "Prepare(materials)" }
>;

const profileMfaRouteKeys = [
  "mfaOverview",
  "mfaEnroll",
  "mfaVerify",
  "mfaRecoveryCodes",
] as const satisfies readonly EntryRouteKey[];

// The gate decisions the authenticated route dispatch needs.
export type AuthenticatedRouteAccess = {
  readonly ownProfileView: boolean;
  readonly invitationAdministration: boolean;
  readonly courseRecords: boolean;
  readonly courseCreate: boolean;
  readonly supervisorAssignments: boolean;
  readonly courseSupervision: boolean;
  readonly supervisedCourseIds?: readonly CourseId[];
};

export type AuthenticatedRoute = {
  readonly key: EntryRouteKey;
  // The canonical concrete path for this location.
  readonly path: string;
  readonly invitationId: InvitationId | null;
  readonly courseId?: CourseId;
  readonly materialId?: MaterialId;
};

const home: AuthenticatedRoute = {
  key: "home",
  path: entryRoutes.home.path,
  invitationId: null,
};
const preparationKeys = [
  "preparationHub",
  "preparationDescription",
  "preparationCurriculum",
  "preparationGoals",
  "preparationInstructions",
  "preparationLanguage",
] as const;

// Path-aware dispatch for the authenticated stage. A route whose capability
// and scope the current gate decision lacks falls back to Home, as does any
// unknown path.
export function authenticatedRoute(
  pathname: string,
  access: AuthenticatedRouteAccess,
): AuthenticatedRoute {
  const material = parseMaterialRoute(pathname, access);
  if (material !== null) return material;
  if (pathname === courseRoutePaths.prepare && access.courseSupervision)
    return {
      key: "prepareCourses",
      path: courseRoutePaths.prepare,
      invitationId: null,
    };
  if (
    access.courseSupervision &&
    pathname.startsWith(`${courseRoutePaths.prepare}/`)
  ) {
    const [segment = "", action, ...rest] = pathname
      .slice(courseRoutePaths.prepare.length + 1)
      .split("/");
    if (segment !== "" && rest.length === 0) {
      try {
        const id = toCourseId(decodeURIComponent(segment));
        if (id !== "" && access.supervisedCourseIds?.includes(id)) {
          const key = preparationKeys.find((candidate) =>
            action === undefined
              ? candidate === "preparationHub"
              : entryRoutes[candidate].path.split("/").at(-1) === action,
          );
          if (key !== undefined)
            return {
              key,
              path: entryRoutes[key].path.replace(
                ":courseId",
                encodeURIComponent(id),
              ),
              courseId: id,
              invitationId: null,
            };
        }
      } catch {
        return home;
      }
    }
    return home;
  }
  if (pathname === courseRoutePaths.create)
    return access.courseCreate && access.supervisorAssignments
      ? {
          key: "courseCreate",
          path: courseRoutePaths.create,
          invitationId: null,
        }
      : home;
  if (access.courseRecords) {
    if (pathname === courseRoutePaths.list)
      return {
        key: "courseList",
        path: courseRoutePaths.list,
        invitationId: null,
      };
    const prefix = `${courseRoutePaths.list}/`;
    if (pathname.startsWith(prefix)) {
      const segment = pathname.slice(prefix.length);
      if (segment !== "" && !segment.includes("/")) {
        try {
          const decoded = decodeURIComponent(segment);
          if (decoded !== "new" && decoded !== "") {
            const courseId = toCourseId(decoded);
            return {
              key: "courseDetail",
              path: courseDetailPath(courseId),
              courseId,
              invitationId: null,
            };
          }
        } catch {
          return home;
        }
      }
    }
  }
  if (access.invitationAdministration) {
    const invitation = invitationRoute(pathname);
    if (invitation !== null) return invitation;
  }
  if (!access.ownProfileView) return home;
  const key = profileMfaRouteKeys.find(
    (candidate) => entryRoutes[candidate].path === pathname,
  );
  return key === undefined
    ? home
    : { key, path: entryRoutes[key].path, invitationId: null };
}

function parseMaterialRoute(
  pathname: string,
  access: AuthenticatedRouteAccess,
): AuthenticatedRoute | null {
  if (!access.courseSupervision) return null;
  const match =
    /^\/prepare\/courses\/([^/]+)\/materials(?:\/([^/]+)(?:\/(files))?)?$/u.exec(
      pathname,
    );
  if (match === null || match[1] === undefined) return null;
  try {
    const courseId = toCourseId(decodeURIComponent(match[1]));
    if (!access.supervisedCourseIds?.includes(courseId)) return null;
    const segment = match[2];
    if (segment === undefined)
      return {
        key: "materialList",
        courseId,
        path: materialPath(courseId),
        invitationId: null,
      };
    if (segment === "new" && match[3] === undefined)
      return {
        key: "materialCreate",
        courseId,
        path: materialPath(courseId, "create"),
        invitationId: null,
      };
    const materialId = toMaterialId(decodeURIComponent(segment));
    if (materialId === null || materialId === "new") return null;
    const resource = match[3] === "files" ? "files" : "detail";
    return {
      key: resource === "files" ? "materialFiles" : "materialDetail",
      courseId,
      materialId,
      path: materialPath(courseId, resource, materialId),
      invitationId: null,
    };
  } catch {
    return null;
  }
}

const invitationActionKeys = {
  resend: "invitationResend",
  revoke: "invitationRevoke",
} as const;

function invitationRoute(pathname: string): AuthenticatedRoute | null {
  const prefix = `${invitationRoutePaths.list}`;
  if (pathname === prefix)
    return { key: "invitationList", path: prefix, invitationId: null };
  if (pathname === invitationRoutePaths.create)
    return {
      key: "invitationCreate",
      path: invitationRoutePaths.create,
      invitationId: null,
    };
  if (!pathname.startsWith(`${prefix}/`)) return null;
  const [segment = "", action, ...rest] = pathname
    .slice(prefix.length + 1)
    .split("/");
  if (rest.length > 0) return null;
  let decoded: string;
  try {
    decoded = decodeURIComponent(segment);
  } catch {
    return null;
  }
  // `new` is the create route, never an invitation ID.
  if (decoded === "" || decoded === "new") return null;
  const invitationId = toInvitationId(decoded);
  if (action === undefined)
    return {
      key: "invitationDetail",
      path: invitationPath(invitationRoutePaths.detail, invitationId),
      invitationId,
    };
  if (action !== "resend" && action !== "revoke") return null;
  const key = invitationActionKeys[action];
  return {
    key,
    path: invitationPath(entryRoutes[key].path, invitationId),
    invitationId,
  };
}
