// Synthetic protocol documents only. Callers supply per-run protected markers;
// no fixture content belongs in snapshots, assertion messages or artifacts.
export function learnCapabilities(
  ids = ["course_1"],
  available = true,
  account = "account-id",
  staff = true,
) {
  return {
    data: {
      type: "account-capabilities",
      id: account,
      attributes: {
        capabilities: [
          "profile.view",
          "profile.edit",
          "accounts.administer",
          "audit.view",
          "jobs.view",
          "courses.create",
          "course_records.manage",
          "course_supervisors.manage",
          "courses.supervise",
          "students.manage",
          "students.ban",
          "students.unban",
          "learning.participate",
          "mentoring.fulfill",
        ].map((action) => ({
          action,
          available:
            action === "learning.participate"
              ? available
              : staff && action === "courses.supervise",
          scope: {
            global: false,
            own_resource: false,
            course_ids:
              action === "learning.participate"
                ? ids
                : staff && action === "courses.supervise"
                  ? ["staff_only"]
                  : [],
            student_ids: [],
            course_students: [],
          },
        })),
      },
    },
  };
}
export function learnCourseDocument(
  name: string,
  forbidden: string,
  id = "course_1",
  state = "active",
  accepting = true,
  newSessionBlockers: string[] = [],
) {
  return {
    data: {
      type: "courses",
      id,
      attributes: {
        name,
        state,
        ai_tutor_instructions: forbidden,
        description: forbidden,
        readiness: {
          state:
            state === "inactive"
              ? "inactive_incomplete"
              : accepting
                ? "active_accepting"
                : "active_not_accepting",
          activation: {
            eligible: false,
            blockers: [],
            consequences: ["activate_course"],
          },
          new_session: {
            eligible: accepting,
            blockers: newSessionBlockers,
            consequences: ["start_tutoring_session"],
          },
          blockers: [],
        },
      },
      relationships: { supervisors: { data: [] } },
    },
  };
}
export function learnMaterialRow(
  name: string,
  forbidden: string,
  id = "material_1",
  course = "course_1",
  scope = "course-wide",
  state = "ready",
  approved = true,
  format = "pdf",
) {
  return {
    type: "materials",
    id,
    attributes: {
      name,
      kind: format === "link" ? "website" : "text-book",
      format,
      scope,
      state,
      approved,
      brief: { summary: forbidden },
      brief_source: forbidden,
      failure_code: forbidden,
      url: forbidden,
      original_filename: forbidden,
    },
    relationships: { course: { data: { type: "courses", id: course } } },
  };
}
