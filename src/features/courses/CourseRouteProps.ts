import type { Course, CoursePage } from "../../platform/api/courses";
import type { SupervisorCandidatePage } from "../../platform/api/administrationAccounts";
import type { CourseId, EntryApiFailure } from "../../platform/api/entry";

export type CourseRouteResource =
  | { readonly kind: "list"; readonly page: CoursePage }
  | { readonly kind: "detail"; readonly course: Course }
  | { readonly kind: "create"; readonly page: SupervisorCandidatePage | null }
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
    readonly detail: (id: CourseId) => string;
  };
  readonly canCreate: boolean;
  readonly unavailable: (failure: EntryApiFailure) => void;
};
