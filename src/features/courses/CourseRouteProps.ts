import type {
  Course,
  CoursePage,
  CoursePreparation,
  CourseTeachingField,
} from "../../platform/api/courses";
import type { SupervisorCandidatePage } from "../../platform/api/administrationAccounts";
import type { CourseId, EntryApiFailure } from "../../platform/api/entry";

export type CourseRouteResource =
  | {
      readonly kind: "readiness" | "activation";
      readonly preparation: CoursePreparation;
    }
  | { readonly kind: "list"; readonly page: CoursePage }
  | { readonly kind: "detail"; readonly course: Course }
  | { readonly kind: "create"; readonly page: SupervisorCandidatePage | null }
  | {
      readonly kind: "preparation";
      readonly preparation: CoursePreparation;
      readonly field: CourseTeachingField | null;
    }
  | {
      readonly kind: "prepare";
      readonly courses: readonly Course[];
      readonly ids: readonly CourseId[];
    };
export type CourseRouteProps = {
  readonly resource: CourseRouteResource;
  readonly links: {
    readonly home: string;
    readonly list: string;
    readonly create: string;
    readonly invitation: string | null;
    readonly materials: (id: CourseId) => string;
    readonly students: (id: CourseId) => string;
    readonly studentCreate: (id: CourseId) => string;
    readonly readiness: (id: CourseId) => string;
    readonly activation: (id: CourseId) => string;
    readonly detail: (id: CourseId) => string;
    readonly preparation: (
      id: CourseId,
      field?: CourseTeachingField | null,
    ) => string;
  };
  readonly canCreate: boolean;
  readonly unavailable: (failure: EntryApiFailure) => void;
};
