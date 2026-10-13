import { lazy, type ComponentType, type LazyExoticComponent } from "react";
import { messages } from "../../platform/i18n/messages";
import type { TextSize } from "../../platform/prefs/preferences";
import type { InvitationLink } from "../../platform/session/invitationLink";
import type { PasswordResetLink } from "../../platform/session/passwordResetLink";
import { mfaPaths } from "../../platform/session/mfaEnrollment";
import type { MfaRouteProps } from "../../features/profile/MfaRouteProps";
import type { InvitationRouteProps } from "../../features/invitations/InvitationRouteProps";
import type { CourseRouteProps } from "../../features/courses/CourseRouteProps";
import type { LearnCourseRouteProps } from "../../features/courses/LearnCourseRouteProps";
import type { MaterialRouteProps } from "../../features/materials/MaterialRouteProps";
import type { CourseStudentRouteProps } from "../../features/courses/CourseStudentRouteProps";
import { toAccountId, type AccountId } from "../../platform/api/entry";
import { toMaterialId, type MaterialId } from "../../platform/api/entry";
import { toCourseId, type CourseId } from "../../platform/api/entry";
import type { CourseTeachingField } from "../../platform/api/courses";
import { courseTeachingFields } from "../../features/courses/courseTeachingFields";
import type { TutoringRouteProps } from "../../features/tutoring/TutoringRouteProps";
import {
  toTutoringSessionId,
  type TutoringSessionId,
} from "../../platform/api/entry";
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
      readonly path: (typeof learnCoursePaths)[keyof typeof learnCoursePaths];
      readonly gate: "Learn(courses)";
      readonly resource: "list" | "detail" | "materials";
      readonly component: LazyExoticComponent<
        ComponentType<LearnCourseRouteProps>
      >;
    })
  // Story 6.1/6.2: tutoring start carries its own ordered gate (discovery
  // before any start affordance; course re-read before material or intent).
  | (EntryRouteBase & {
      readonly path: (typeof learnStartPaths)[keyof typeof learnStartPaths];
      readonly gate: "Learn(start session)";
      readonly resource: "start-choice" | "material-choice" | "intent";
      readonly component: LazyExoticComponent<
        ComponentType<TutoringRouteProps>
      >;
    })
  | (EntryRouteBase & {
      readonly path: (typeof learnSessionPaths)[keyof typeof learnSessionPaths];
      readonly gate: "Learn(tutoring session)";
      readonly resource: "recovery" | "workspace" | "finish";
      readonly component: LazyExoticComponent<
        ComponentType<TutoringRouteProps>
      >;
    })
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
        | "list"
        | "detail"
        | "create"
        | "prepare"
        | "hub"
        | "readiness"
        | "activation"
        | CourseTeachingField;
      readonly component: LazyExoticComponent<ComponentType<CourseRouteProps>>;
    })
  | (EntryRouteBase & {
      readonly path: (typeof materialRoutePaths)[keyof typeof materialRoutePaths];
      readonly gate: "Prepare(materials)";
      readonly resource: keyof typeof materialRoutePaths;
      readonly component: LazyExoticComponent<
        ComponentType<MaterialRouteProps>
      >;
    })
  | (EntryRouteBase & {
      readonly path: (typeof studentRoutePaths)[keyof typeof studentRoutePaths];
      readonly gate: "Prepare(students)";
      readonly resource: "list" | "create" | "membership";
      readonly component: LazyExoticComponent<
        ComponentType<CourseStudentRouteProps>
      >;
    });

export const learnCoursePaths = {
  list: "/learn/courses",
  detail: "/learn/courses/:courseId",
  materials: "/learn/courses/:courseId/materials",
} as const;
export function learnCoursePath(id: CourseId, materials = false): string {
  return learnCoursePaths[materials ? "materials" : "detail"].replace(
    ":courseId",
    encodeURIComponent(id),
  );
}

// ROUTE-INVENTORY.md §Session Start. Story 6.1 registers course choice and the
// optional material choice; Story 6.2 adds the one intent route hosting the
// static starters and the free-form intent (D1).
export const learnStartPaths = {
  choice: "/learn/start",
  material: "/learn/start/:courseId/material",
  intent: "/learn/start/:courseId/intent",
} as const;
export function learnStartPath(course: CourseId | null = null): string {
  return course === null
    ? learnStartPaths.choice
    : learnStartPaths.material.replace(":courseId", encodeURIComponent(course));
}
export function learnIntentPath(course: CourseId): string {
  return learnStartPaths.intent.replace(
    ":courseId",
    encodeURIComponent(course),
  );
}

// ROUTE-INVENTORY.md §Session Recovery and §Tutoring Workspace. Session
// identity is an opaque backend ID; nothing else enters the path.
export const learnSessionPaths = {
  recovery: "/learn/session",
  workspace: "/learn/sessions/:sessionId",
  finish: "/learn/sessions/:sessionId/finish",
} as const;
export function learnSessionPath(
  id: TutoringSessionId,
  finish = false,
): string {
  return learnSessionPaths[finish ? "finish" : "workspace"].replace(
    ":sessionId",
    encodeURIComponent(id),
  );
}

export const studentRoutePaths = {
  list: "/prepare/courses/:courseId/students",
  create: "/prepare/courses/:courseId/students/new",
  membership: "/prepare/courses/:courseId/students/:studentId",
} as const;
export function studentPath(
  course: CourseId,
  resource: keyof typeof studentRoutePaths = "list",
  student: AccountId | null = null,
): string {
  return studentRoutePaths[resource]
    .replace(":courseId", encodeURIComponent(course))
    .replace(":studentId", student === null ? "" : encodeURIComponent(student));
}

export const materialRoutePaths = {
  list: "/prepare/courses/:courseId/materials",
  create: "/prepare/courses/:courseId/materials/new",
  detail: "/prepare/courses/:courseId/materials/:materialId",
  files: "/prepare/courses/:courseId/materials/:materialId/files",
  processing: "/prepare/courses/:courseId/materials/:materialId/processing",
  brief: "/prepare/courses/:courseId/materials/:materialId/brief",
  approval: "/prepare/courses/:courseId/materials/:materialId/approval",
  revoke: "/prepare/courses/:courseId/materials/:materialId/approval/revoke",
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
  readiness: "/prepare/courses/:courseId/readiness",
  activation: "/prepare/courses/:courseId/activate",
  description: "/prepare/courses/:courseId/details",
  curriculum: "/prepare/courses/:courseId/curriculum",
  learningGoals: "/prepare/courses/:courseId/learning-goals",
  instructions: "/prepare/courses/:courseId/ai-instructions",
  language: "/prepare/courses/:courseId/language",
} as const;
export function prepareCoursePath(
  id: CourseId,
  field: CourseTeachingField | "readiness" | "activation" | null = null,
): string {
  return courseRoutePaths[field ?? "hub"].replace(
    ":courseId",
    encodeURIComponent(id),
  );
}
const materialRoutes = {
  materialProcessing: {
    resource: "processing",
    path: materialRoutePaths.processing,
    parent: { path: materialRoutePaths.detail, label: messages.materialDetail },
    titleMessage: messages.materialProcessingTitle,
    headingMessage: messages.materialProcessingHeading,
    component: lazy(
      () => import("../../features/materials/MaterialProcessingRoute"),
    ),
  },
  materialBrief: {
    resource: "brief",
    path: materialRoutePaths.brief,
    parent: { path: materialRoutePaths.detail, label: messages.materialDetail },
    titleMessage: messages.materialBriefTitle,
    headingMessage: messages.materialBriefHeading,
    component: lazy(
      () => import("../../features/materials/MaterialBriefRoute"),
    ),
  },
  materialApproval: {
    resource: "approval",
    path: materialRoutePaths.approval,
    parent: { path: materialRoutePaths.detail, label: messages.materialDetail },
    titleMessage: messages.materialApprovalTitle,
    headingMessage: messages.materialApprovalHeading,
    component: lazy(
      () => import("../../features/materials/MaterialApprovalRoute"),
    ),
  },
  materialRevoke: {
    resource: "revoke",
    path: materialRoutePaths.revoke,
    parent: {
      path: materialRoutePaths.approval,
      label: messages.materialApprovalHeading,
    },
    titleMessage: messages.materialRevokeTitle,
    headingMessage: messages.materialRevokeHeading,
    component: lazy(
      () => import("../../features/materials/MaterialRevokeRoute"),
    ),
  },
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
  learnCourses: {
    path: learnCoursePaths.list,
    gate: "Learn(courses)",
    resource: "list",
    parent: { path: "/", label: messages.invitationsBackToHome },
    titleMessage: messages.learnCoursesTitle,
    headingMessage: messages.learnCourses,
    component: lazy(() => import("../../features/courses/LearnCourseSurface")),
  },
  learnCourse: {
    path: learnCoursePaths.detail,
    gate: "Learn(courses)",
    resource: "detail",
    parent: { path: learnCoursePaths.list, label: messages.learnCourses },
    titleMessage: messages.learnCourseTitle,
    headingMessage: messages.learnCourse,
    component: lazy(() => import("../../features/courses/LearnCourseSurface")),
  },
  learnMaterials: {
    path: learnCoursePaths.materials,
    gate: "Learn(courses)",
    resource: "materials",
    parent: { path: learnCoursePaths.detail, label: messages.learnCourse },
    titleMessage: messages.learnMaterialsTitle,
    headingMessage: messages.learnMaterials,
    component: lazy(() => import("../../features/courses/LearnCourseSurface")),
  },
  learnStart: {
    path: learnStartPaths.choice,
    gate: "Learn(start session)",
    resource: "start-choice",
    parent: { path: learnCoursePaths.list, label: messages.learnCourses },
    titleMessage: messages.tutoringStartTitle,
    headingMessage: messages.tutoringStartHeading,
    component: lazy(
      () => import("../../features/tutoring/SessionStartCourseChoiceRoute"),
    ),
  },
  learnStartMaterial: {
    path: learnStartPaths.material,
    gate: "Learn(start session)",
    resource: "material-choice",
    parent: {
      path: learnStartPaths.choice,
      label: messages.tutoringStartHeading,
    },
    titleMessage: messages.tutoringMaterialTitle,
    headingMessage: messages.tutoringMaterialHeading,
    component: lazy(
      () => import("../../features/tutoring/SessionStartMaterialRoute"),
    ),
  },
  learnStartIntent: {
    path: learnStartPaths.intent,
    gate: "Learn(start session)",
    resource: "intent",
    parent: {
      path: learnStartPaths.material,
      label: messages.tutoringMaterialHeading,
    },
    titleMessage: messages.tutoringIntentTitle,
    headingMessage: messages.tutoringIntentHeading,
    component: lazy(
      () => import("../../features/tutoring/SessionStartIntentRoute"),
    ),
  },
  learnSessionRecovery: {
    path: learnSessionPaths.recovery,
    gate: "Learn(tutoring session)",
    resource: "recovery",
    parent: { path: "/", label: messages.invitationsBackToHome },
    titleMessage: messages.tutoringRecoveryTitle,
    headingMessage: messages.tutoringRecoveryHeading,
    component: lazy(
      () => import("../../features/tutoring/SessionRecoveryRoute"),
    ),
  },
  learnSessionWorkspace: {
    path: learnSessionPaths.workspace,
    gate: "Learn(tutoring session)",
    resource: "workspace",
    parent: { path: learnCoursePaths.list, label: messages.learnCourses },
    titleMessage: messages.tutoringWorkspaceTitle,
    headingMessage: messages.tutoringWorkspaceHeading,
    component: lazy(
      () => import("../../features/tutoring/TutoringWorkspaceRoute"),
    ),
  },
  learnSessionFinish: {
    path: learnSessionPaths.finish,
    gate: "Learn(tutoring session)",
    resource: "finish",
    parent: {
      path: learnSessionPaths.workspace,
      label: messages.tutoringWorkspaceHeading,
    },
    titleMessage: messages.tutoringFinishTitle,
    headingMessage: messages.tutoringFinishHeading,
    component: lazy(
      () => import("../../features/tutoring/TutoringFinishRoute"),
    ),
  },
  studentList: {
    path: studentRoutePaths.list,
    gate: "Prepare(students)",
    resource: "list",
    parent: { path: courseRoutePaths.hub, label: messages.preparationHub },
    titleMessage: messages.studentListTitle,
    headingMessage: messages.studentList,
    component: lazy(
      () => import("../../features/courses/CourseStudentListRoute"),
    ),
  },
  studentCreate: {
    path: studentRoutePaths.create,
    gate: "Prepare(students)",
    resource: "create",
    parent: { path: studentRoutePaths.list, label: messages.studentList },
    titleMessage: messages.studentCreateTitle,
    headingMessage: messages.studentCreate,
    component: lazy(
      () => import("../../features/courses/CourseStudentCreateRoute"),
    ),
  },
  studentMembership: {
    path: studentRoutePaths.membership,
    gate: "Prepare(students)",
    resource: "membership",
    parent: { path: studentRoutePaths.list, label: messages.studentList },
    titleMessage: messages.studentMembershipTitle,
    headingMessage: messages.studentMembership,
    component: lazy(
      () => import("../../features/courses/CourseStudentMembershipRoute"),
    ),
  },
  materialProcessing: {
    ...materialRoutes.materialProcessing,
    gate: "Prepare(materials)",
  },
  materialBrief: {
    ...materialRoutes.materialBrief,
    gate: "Prepare(materials)",
  },
  materialApproval: {
    ...materialRoutes.materialApproval,
    gate: "Prepare(materials)",
  },
  materialRevoke: {
    ...materialRoutes.materialRevoke,
    gate: "Prepare(materials)",
  },
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
  preparationReadiness: {
    ...preparationHubRoute,
    resource: "readiness",
    path: courseRoutePaths.readiness,
    parent: { path: courseRoutePaths.hub, label: messages.preparationHub },
    titleMessage: messages.courseReadinessTitle,
    headingMessage: messages.courseReadinessHeading,
    component: lazy(
      () => import("../../features/courses/CourseReadinessRoute"),
    ),
  },
  preparationActivation: {
    ...preparationHubRoute,
    resource: "activation",
    path: courseRoutePaths.activation,
    parent: {
      path: courseRoutePaths.readiness,
      label: messages.courseReadinessHeading,
    },
    titleMessage: messages.courseActivationTitle,
    headingMessage: messages.courseActivationHeading,
    component: lazy(
      () => import("../../features/courses/CourseActivationRoute"),
    ),
  },
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
export type LearnCourseEntryRoute = Extract<
  (typeof entryRoutes)[EntryRouteKey],
  { readonly gate: "Learn(courses)" }
>;
export type LearnSessionEntryRoute = Extract<
  (typeof entryRoutes)[EntryRouteKey],
  { readonly gate: "Learn(start session)" | "Learn(tutoring session)" }
>;
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
export type StudentEntryRoute = Extract<
  (typeof entryRoutes)[EntryRouteKey],
  { readonly gate: "Prepare(students)" }
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
  readonly learningParticipation?: boolean;
  readonly joinedCourseIds?: readonly CourseId[];
};

export type AuthenticatedRoute = {
  readonly key: EntryRouteKey;
  // The canonical concrete path for this location.
  readonly path: string;
  readonly invitationId: InvitationId | null;
  readonly courseId?: CourseId;
  readonly materialId?: MaterialId;
  readonly studentId?: AccountId;
  readonly sessionId?: TutoringSessionId;
};

const home: AuthenticatedRoute = {
  key: "home",
  path: entryRoutes.home.path,
  invitationId: null,
};
const preparationKeys = [
  "preparationReadiness",
  "preparationActivation",
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
  // Recognize addressed Learn paths even after scope loss: the resource host
  // renders the same neutral hidden result without a dependent request.
  if (pathname === learnCoursePaths.list && access.learningParticipation)
    return { key: "learnCourses", path: pathname, invitationId: null };
  const learn = /^\/learn\/courses\/([^/]+)(\/materials)?$/u.exec(pathname);
  if (learn?.[1] !== undefined) {
    try {
      const id = toCourseId(decodeURIComponent(learn[1]));
      if (id !== "" && id !== "new")
        return {
          key: learn[2] === undefined ? "learnCourse" : "learnMaterials",
          path: learnCoursePath(id, learn[2] !== undefined),
          courseId: id,
          invitationId: null,
        };
    } catch {
      return home;
    }
  }
  // Session start needs learning participation up front; the addressed
  // material, recovery and workspace paths stay recognized after scope loss
  // so the host can render its neutral hidden result without dependent reads.
  if (pathname === learnStartPaths.choice && access.learningParticipation)
    return { key: "learnStart", path: pathname, invitationId: null };
  const startMaterial = /^\/learn\/start\/([^/]+)\/material$/u.exec(pathname);
  if (startMaterial?.[1] !== undefined) {
    try {
      const id = toCourseId(decodeURIComponent(startMaterial[1]));
      if (id !== "" && id !== "new")
        return {
          key: "learnStartMaterial",
          path: learnStartPath(id),
          courseId: id,
          invitationId: null,
        };
    } catch {
      return home;
    }
  }
  const startIntent = /^\/learn\/start\/([^/]+)\/intent$/u.exec(pathname);
  if (startIntent?.[1] !== undefined) {
    try {
      const id = toCourseId(decodeURIComponent(startIntent[1]));
      if (id !== "" && id !== "new")
        return {
          key: "learnStartIntent",
          path: learnIntentPath(id),
          courseId: id,
          invitationId: null,
        };
    } catch {
      return home;
    }
  }
  if (pathname === learnSessionPaths.recovery)
    return { key: "learnSessionRecovery", path: pathname, invitationId: null };
  const session = /^\/learn\/sessions\/([^/]+)(\/finish)?$/u.exec(pathname);
  if (session?.[1] !== undefined) {
    let sessionId: TutoringSessionId | null = null;
    try {
      sessionId = toTutoringSessionId(decodeURIComponent(session[1]));
    } catch {
      return home;
    }
    if (sessionId !== null)
      return {
        key:
          session[2] === undefined
            ? "learnSessionWorkspace"
            : "learnSessionFinish",
        path: learnSessionPath(sessionId, session[2] !== undefined),
        sessionId,
        invitationId: null,
      };
  }
  const student = parseStudentRoute(pathname, access);
  if (student !== null) return student;
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
    /^\/prepare\/courses\/([^/]+)\/materials(?:\/([^/]+)(?:\/(files|processing|brief|approval(?:\/revoke)?))?)?$/u.exec(
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
    const actions = {
      files: ["files", "materialFiles"],
      processing: ["processing", "materialProcessing"],
      brief: ["brief", "materialBrief"],
      approval: ["approval", "materialApproval"],
      "approval/revoke": ["revoke", "materialRevoke"],
    } as const;
    const action = match[3];
    const resolved =
      action === "files" ||
      action === "processing" ||
      action === "brief" ||
      action === "approval" ||
      action === "approval/revoke"
        ? actions[action]
        : null;
    const resource = resolved?.[0] ?? "detail";
    return {
      key: resolved?.[1] ?? "materialDetail",
      courseId,
      materialId,
      path: materialPath(courseId, resource, materialId),
      invitationId: null,
    };
  } catch {
    return null;
  }
}

function parseStudentRoute(
  pathname: string,
  access: AuthenticatedRouteAccess,
): AuthenticatedRoute | null {
  const match = /^\/prepare\/courses\/([^/]+)\/students(?:\/([^/]+))?$/u.exec(
    pathname,
  );
  if (!access.courseSupervision || match?.[1] === undefined) return null;
  try {
    const courseId = toCourseId(decodeURIComponent(match[1]));
    if (!access.supervisedCourseIds?.includes(courseId)) return null;
    const segment =
      match[2] === undefined ? null : decodeURIComponent(match[2]);
    const key =
      segment === null
        ? "studentList"
        : segment === "new"
          ? "studentCreate"
          : "studentMembership";
    if (
      segment !== null &&
      [
        "add",
        "remove",
        "profile",
        "security",
        "materials",
        "sessions",
      ].includes(segment)
    )
      return null;
    const studentId =
      key === "studentMembership" && segment !== null
        ? toAccountId(segment)
        : null;
    return {
      key,
      courseId,
      ...(studentId === null ? {} : { studentId }),
      path: studentPath(courseId, entryRoutes[key].resource, studentId),
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
