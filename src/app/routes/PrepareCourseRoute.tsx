import { getCourse } from "../../platform/api/courses";
import { useAuthenticatedAccess } from "../../platform/data/EntryDataProvider";
import { CourseResourceHost } from "./AdminCourseRoute";
import type { CourseEntryRoute } from "./entryRoutes";

// O2, 2026-10-08: only current authoritative courses.supervise scope IDs.
// No listCourses union, guessed filter, readiness claim or preparation-hub link.
export function PrepareCourseRoute({
  route,
}: {
  readonly route: CourseEntryRoute;
}) {
  const access = useAuthenticatedAccess();
  return (
    <CourseResourceHost
      route={route}
      load={async (signal) => {
        const ids = access?.supervisedCourseIds ?? [];
        const courses = [];
        // Sequential bounded reads, all in one readAuthenticated security epoch.
        for (const id of ids.slice(0, 25))
          courses.push(await getCourse(id, signal));
        return { kind: "prepare", courses, ids };
      }}
    />
  );
}
