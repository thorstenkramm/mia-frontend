import { useIntl } from "react-intl";
import type { CoursePreparation } from "../../platform/api/courses";
import { messages } from "../../platform/i18n/messages";
import { RouteDepartureLink } from "../../platform/ui/RouteDepartureLink";
import type { CourseRouteProps } from "./CourseRouteProps";
import { courseActionClass } from "./CourseListRoute";
import { useSessionActions } from "../../platform/data/EntryDataProvider";
import { ExclamationCircleIcon } from "@heroicons/react/20/solid";

// Tailwind Plus: Application UI > Layout > Cards > Card with header;
// Elements > Badges > Small pill with border. Library 2026-09-13-083323,
// v4/react-light.jsx. MIA: only server display blockers, trusted same-course
// mapped destinations, one action, no inferred prerequisite success.
export function CourseHubBlockers({
  preparation,
  links,
  heading,
  includeExtras = false,
}: {
  readonly preparation: CoursePreparation;
  readonly links: CourseRouteProps["links"];
  readonly heading?: (typeof messages)[keyof typeof messages];
  // The readiness review alone keeps the 4.5 defense of showing action-only
  // blockers that are absent from the server display list; the hub renders
  // display blockers exactly as reported.
  readonly includeExtras?: boolean;
}) {
  const intl = useIntl();
  const active = preparation.course.state === "active";
  const displayed = preparation.readiness.blockers;
  const extras = (
    includeExtras
      ? preparation.readiness.activation.blockers.filter(
          (id) =>
            id !== "assigned_supervisor_required" &&
            id !== "course_already_active" &&
            !displayed.some((item) => item.id === id),
        )
      : []
  ) as (keyof typeof blockerCopy)[];
  const blockerCopy = {
    learning_goals: [
      messages.preparationBlockerLearningGoalsName,
      messages.preparationBlockerLearningGoalsBody,
      messages.preparationBlockerLearningGoalsAction,
    ],
    ai_tutor_instructions: [
      messages.preparationBlockerInstructionsName,
      messages.preparationBlockerInstructionsBody,
      messages.preparationBlockerInstructionsAction,
    ],
    language: [
      messages.preparationBlockerLanguageName,
      messages.preparationBlockerLanguageBody,
      messages.preparationBlockerLanguageAction,
    ],
    supervisor_presence: [
      messages.preparationBlockerSupervisorName,
      messages.courseActivationSupervisor,
      null,
    ],
    qualifying_material: [
      messages.preparationBlockerMaterialName,
      active
        ? messages.preparationBlockerMaterialActive
        : messages.preparationBlockerMaterialInactive,
      messages.preparationBlockerMaterialAction,
    ],
  } as const;
  return (
    <section className="mt-8" aria-labelledby="course-blockers-heading">
      <h2
        id="course-blockers-heading"
        className="text-base/7 font-semibold text-gray-900"
      >
        {intl.formatMessage(
          heading ??
            (active
              ? messages.preparationBlockersHeadingActive
              : messages.preparationBlockersHeadingInactive),
        )}
      </h2>
      <div className="mt-4 space-y-4">
        {[
          ...displayed,
          ...extras.map((id) => ({ id, field: null, materials: false })),
        ].map((blocker) => {
          const [name, body, action] = blockerCopy[blocker.id];
          const destination = extras.includes(blocker.id)
            ? null
            : blocker.field !== null
              ? links.preparation(preparation.course.id, blocker.field)
              : blocker.materials
                ? links.materials(preparation.course.id)
                : null;
          return (
            <div
              key={blocker.id}
              className="divide-y divide-gray-200 overflow-hidden rounded-lg bg-white shadow-sm inset-ring inset-ring-gray-200"
            >
              <div className="flex flex-wrap items-start gap-3 px-4 py-5 sm:px-6">
                <ExclamationCircleIcon
                  aria-label={intl.formatMessage(
                    messages.preparationBlockerUnmet,
                  )}
                  role="img"
                  className="size-5 shrink-0 text-yellow-700"
                />
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-gray-900">
                    {intl.formatMessage(name)}
                  </h3>
                  <p className="mt-1 text-sm/6 text-gray-700">
                    {intl.formatMessage(body)}
                  </p>
                </div>
                {destination !== null && action !== null ? (
                  <RouteDepartureLink
                    to={destination}
                    className={courseActionClass}
                  >
                    {intl.formatMessage(action)}
                  </RouteDepartureLink>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// Hub/review explicit Refresh always uses ordered route admission. Activation
// deliberately does not use this control: its local unknown record must survive.
export function CourseReadinessRefresh() {
  const intl = useIntl();
  const { checkRouteAdmission } = useSessionActions();
  return (
    <button
      type="button"
      className={courseActionClass}
      onClick={() => void checkRouteAdmission()}
    >
      {intl.formatMessage(messages.invitationsRefresh)}
    </button>
  );
}

// Tailwind Plus: Application UI > Data Display > Description Lists >
// Left-aligned with inline actions; 2026-09-13-083323, v4/react-light.jsx.
// MIA: server blocker rows, wrapped text, trusted implemented destinations only.
