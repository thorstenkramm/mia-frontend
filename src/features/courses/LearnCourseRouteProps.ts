import type { CourseId, EntryApiFailure } from "../../platform/api/entry";
import type {
  JoinedCourseBatch,
  LearnCourse,
  LearnMaterialPage,
} from "../../platform/api/learnCourses";

export type LearnCourseResource =
  | {
      readonly kind: "list";
      readonly batch: JoinedCourseBatch;
      readonly ids: readonly CourseId[];
    }
  | {
      readonly kind: "detail" | "materials";
      readonly course: LearnCourse;
      readonly page: LearnMaterialPage;
    };
export type LearnCourseRouteProps = {
  readonly resource: LearnCourseResource;
  readonly links: {
    readonly list: string;
    readonly detail: (id: CourseId) => string;
    readonly materials: (id: CourseId) => string;
  };
  readonly unavailable: (failure: EntryApiFailure | null) => void;
};
