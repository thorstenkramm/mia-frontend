import { getCourse, getCoursePreparation } from "../../platform/api/courses";
import type { CourseId } from "../../platform/api/entry";
import { useAuthenticatedAccess } from "../../platform/data/EntryDataProvider";
import { CourseResourceHost } from "./AdminCourseRoute";
import type { CourseEntryRoute } from "./entryRoutes";

// O2, 2026-10-08: only current authoritative courses.supervise scope IDs.
// No listCourses union or guessed filter. Story 4.2 admits preparation only
// for exact IDs already authorized by the current route/scope gate.
export function PrepareCourseRoute({
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
      courseId={courseId}
      load={async (signal) => {
        if (route.resource !== "prepare") {
          if (
            courseId === null ||
            !access?.supervisedCourseIds.includes(courseId)
          )
            throw new Error(
              "Preparation admission requires current assigned scope.",
            );
          const field = route.resource;
          if (field === "list" || field === "detail" || field === "create")
            throw new Error("Prepare cannot admit administration resources.");
          const preparation = await getCoursePreparation(courseId, signal);
          if (field === "readiness" || field === "activation")
            return { kind: field, preparation };
          return {
            kind: "preparation",
            preparation,
            field: field === "hub" ? null : field,
          };
        }
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
