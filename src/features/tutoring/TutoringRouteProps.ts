import type {
  CourseId,
  EntryApiFailure,
  MaterialId,
} from "../../platform/api/entry";
import type {
  JoinedCourseBatch,
  LearnCourse,
  LearnMaterialPage,
} from "../../platform/api/learnCourses";
import type {
  ActiveTutoringSession,
  SessionTurnPage,
  TutoringSession,
  TutoringSessionId,
  TutoringWork,
} from "../../platform/api/tutoringSessions";

// The closed admitted-resource union for the Story 6.1/6.2 tutoring routes.
// The host (app/routes/LearnSessionRoute.tsx) owns the ordered reads; a
// component only ever sees the resource its route admitted.
export type TutoringResource =
  | {
      readonly kind: "start-choice";
      // BCG-002 discovery precedes the course list: a found active session
      // suppresses it entirely, so ids/batch never load.
      readonly active: ActiveTutoringSession;
      readonly ids: readonly CourseId[];
      readonly batch: null;
    }
  | {
      readonly kind: "start-choice";
      readonly active: null;
      readonly ids: readonly CourseId[];
      readonly batch: JoinedCourseBatch;
    }
  | {
      readonly kind: "material-choice";
      readonly course: LearnCourse;
      // A found active session renders the resume presentation; no material
      // read ran.
      readonly active: ActiveTutoringSession;
      readonly page: null;
    }
  | {
      readonly kind: "material-choice";
      readonly course: LearnCourse;
      readonly active: null;
      // Null page: the course is not accepting new sessions (truthful fixed
      // copy); only an eligible course reads its 5.2 material metadata.
      readonly page: LearnMaterialPage | null;
    }
  | {
      readonly kind: "intent";
      readonly course: LearnCourse;
      // BCG-002 discovery precedes the compose affordance: a found active
      // session renders the resume presentation, never a starter.
      readonly active: ActiveTutoringSession;
      readonly material: null;
    }
  | {
      readonly kind: "intent";
      readonly course: LearnCourse;
      readonly active: null;
      // The D2 material-choice handoff: one opaque ID or explicit none.
      // Absent or malformed handoff state is the documented intent-only
      // start; a selection is never fabricated.
      readonly material: MaterialId | null;
    }
  | {
      readonly kind: "recovery";
      // Explicit null is the authoritative no-active-session result.
      readonly active: ActiveTutoringSession | null;
    }
  | {
      readonly kind: "workspace";
      readonly session: TutoringSession;
      // BCG-012 Story 6.2 slice: the authoritative work read, admitted with
      // the transcript page for an active session before the composer is
      // enabled. A completed owner session admits persisted turns only, with
      // no current-work read, and renders without the composer or stream.
      readonly work: TutoringWork | null;
      readonly page: SessionTurnPage | null;
    }
  | {
      readonly kind: "finish";
      readonly session: TutoringSession;
      readonly work: TutoringWork | null;
    };

// Trusted concrete-path builders supplied by the route host; components never
// construct paths themselves.
export type TutoringLinks = {
  readonly home: string;
  readonly courses: string;
  readonly start: string;
  readonly material: (course: CourseId) => string;
  readonly intent: (course: CourseId) => string;
  readonly recovery: string;
  readonly workspace: (session: TutoringSessionId) => string;
  readonly finish: (session: TutoringSessionId) => string;
};

export type TutoringRouteProps = {
  readonly resource: TutoringResource;
  readonly links: TutoringLinks;
  readonly unavailable: (failure: EntryApiFailure | null) => void;
};
