import { useIntl } from "react-intl";
import { canFirstActivate } from "../../platform/api/courses";
import { messages } from "../../platform/i18n/messages";
import { RouteDepartureLink } from "../../platform/ui/RouteDepartureLink";
import { CourseStatusPanel } from "./CoursePreparationRoute";
import { CourseHubBlockers } from "./CourseReadinessChecklist";
import { courseActionClass } from "./CourseListRoute";
import type { CourseRouteProps } from "./CourseRouteProps";

// Tailwind Plus: Application UI > Layout > Cards > Basic card, v4/react-light.jsx,
// library 2026-09-13-083323. MIA: explanatory content only, no status badges.
export default function CourseReadinessRoute({
  resource,
  links,
}: CourseRouteProps) {
  const intl = useIntl();
  if (resource.kind !== "readiness")
    throw new Error("Readiness requires its admitted resource.");
  const { preparation } = resource;
  const { state, blockers } = preparation.readiness;
  const ready = canFirstActivate(preparation);
  const previous =
    preparation.activatedAt !== null || preparation.deactivatedAt !== null;
  const tone =
    state === "active_accepting"
      ? "green"
      : ready
        ? "indigo"
        : state === "inactive_activatable" && previous
          ? "gray"
          : "yellow";
  const heading =
    state === "inactive_incomplete"
      ? messages.readinessPanelBlockedHeading
      : ready
        ? messages.readinessPanelEligibleHeading
        : state === "inactive_activatable"
          ? messages.preparationPanelPreviousHeading
          : state === "active_accepting"
            ? messages.preparationPanelAcceptingHeading
            : messages.preparationPanelNotAcceptingHeading;
  const body =
    state === "inactive_incomplete"
      ? messages.readinessPanelBlockedBody
      : ready
        ? messages.readinessPanelEligibleBody
        : state === "inactive_activatable"
          ? messages.preparationPanelPreviousBody
          : state === "active_accepting"
            ? messages.preparationPanelAcceptingBody
            : messages.preparationPanelNotAcceptingBody;
  const back = (
    <RouteDepartureLink
      to={links.preparation(preparation.course.id)}
      className="inline-flex min-h-6 items-center rounded-sm text-sm font-semibold underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
    >
      {intl.formatMessage(messages.preparationBackToHub)}
    </RouteDepartureLink>
  );
  return (
    <>
      <CourseStatusPanel
        tone={tone}
        heading={heading}
        body={body}
        blockerCount={blockers.length}
        activatedAt={preparation.activatedAt}
        actions={
          ready ? (
            <div className="flex flex-wrap items-center gap-4">
              <RouteDepartureLink
                to={links.activation(preparation.course.id)}
                className={courseActionClass}
              >
                {intl.formatMessage(messages.readinessPanelEligibleAction)}
              </RouteDepartureLink>
              {back}
            </div>
          ) : undefined
        }
      />
      {blockers.length > 0 ||
      preparation.readiness.activation.blockers.some(
        (id) =>
          id !== "assigned_supervisor_required" &&
          id !== "course_already_active" &&
          !blockers.some((item) => item.id === id),
      ) ? (
        <CourseHubBlockers
          preparation={preparation}
          links={links}
          includeExtras
          {...(state === "inactive_incomplete"
            ? { heading: messages.readinessUnmetHeading }
            : {})}
        />
      ) : null}
      <section className="mt-8" aria-labelledby="readiness-how">
        <h2
          id="readiness-how"
          className="text-base/7 font-semibold text-gray-900"
        >
          {intl.formatMessage(messages.readinessHowHeading)}
        </h2>
        <p className="mt-2 text-sm/6 text-gray-700">
          {intl.formatMessage(messages.readinessHowIntro)}
        </p>
        <ul className="mt-4 list-disc space-y-2 pl-6 text-sm/6 text-gray-700">
          {[
            messages.readinessHowGoals,
            messages.readinessHowInstructions,
            messages.readinessHowLanguage,
            messages.readinessHowSupervisor,
            messages.readinessHowMaterial,
          ].map((item) => (
            <li key={item.id}>{intl.formatMessage(item)}</li>
          ))}
        </ul>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {[
            {
              title: messages.readinessHowTechnicalHeading,
              description: messages.readinessHowTechnicalBody,
            },
            {
              title: messages.readinessHowApprovalHeading,
              description: messages.readinessHowApprovalBody,
            },
          ].map(({ title, description }) => (
            <div
              key={title.id}
              className="overflow-hidden rounded-lg bg-white shadow-sm"
            >
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-sm font-semibold text-gray-900">
                  {intl.formatMessage(title)}
                </h3>
                <p className="mt-2 text-sm/6 text-gray-700">
                  {intl.formatMessage(description)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
      <div className="mt-6">{back}</div>
    </>
  );
}
