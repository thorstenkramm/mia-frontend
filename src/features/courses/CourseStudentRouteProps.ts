import type { Course } from "../../platform/api/courses";
import type {
  StudentMembership,
  StudentPage,
} from "../../platform/api/courseStudents";
import type { AccountId, EntryApiFailure } from "../../platform/api/entry";

export type StudentResource =
  | {
      readonly kind: "list";
      readonly course: Course;
      readonly page: StudentPage;
    }
  | { readonly kind: "create"; readonly course: Course }
  | {
      readonly kind: "membership";
      readonly course: Course;
      readonly membership: StudentMembership;
    };
export type CourseStudentRouteProps = {
  readonly resource: StudentResource;
  readonly links: {
    readonly parent: string;
    readonly list: string;
    readonly create: string;
    readonly membership: (id: AccountId) => string;
  };
  readonly unavailable: (error: EntryApiFailure | null) => void;
};
