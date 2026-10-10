import { useState } from "react";
import { useIntl } from "react-intl";
import type { CoursePreparation } from "../../platform/api/courses";
import { messages } from "../../platform/i18n/messages";
import { RouteDepartureLink } from "../../platform/ui/RouteDepartureLink";
import type { CourseRouteProps } from "./CourseRouteProps";
import { courseTeachingFields } from "./courseTeachingFields";
import { CourseCheckedAt, courseActionClass } from "./CourseListRoute";
import { canFirstActivate } from "../../platform/api/courses";
import {
  CourseReadinessChecklist,
  CourseActivationAvailability,
  CourseReadinessRefresh,
} from "./CourseReadinessChecklist";

export const readinessMessages = {
  inactive_incomplete: messages.preparationIncomplete,
  inactive_activatable: messages.preparationActivatable,
  active_accepting: messages.preparationAccepting,
  active_not_accepting: messages.preparationBlocked,
} as const;

// Tailwind Plus: Application UI > Data Display > Description Lists >
// Left-aligned with inline actions. Library 2026-09-13-083323, v4/react-light.jsx.
// MIA: server-authored text only; wrap/stack rows, accurate field link labels,
// no percentage or material-state inference, no future action destinations.
export default function CoursePreparationRoute({
  resource,
  links,
}: CourseRouteProps) {
  const intl = useIntl();
  const [checkedAt] = useState(Date.now);
  if (resource.kind !== "preparation" || resource.field !== null)
    throw new Error("Hub requires its admitted preparation resource.");
  const { preparation } = resource;
  return (
    <>
      <CoursePreparationStatus preparation={preparation} />
      <CourseCheckedAt time={checkedAt} />
      <CourseReadinessChecklist preparation={preparation} links={links} />
      <CourseActivationAvailability preparation={preparation} />
      <nav
        aria-label={intl.formatMessage(messages.preparationHub)}
        className="mt-6 flex flex-wrap gap-3"
      >
        <RouteDepartureLink
          to={links.students(preparation.course.id)}
          className={courseActionClass}
        >
          {intl.formatMessage(messages.studentList)}
        </RouteDepartureLink>
        {preparation.course.state === "active" ? (
          <RouteDepartureLink
            to={links.studentCreate(preparation.course.id)}
            className={courseActionClass}
          >
            {intl.formatMessage(messages.studentCreate)}
          </RouteDepartureLink>
        ) : null}
        <RouteDepartureLink
          to={links.readiness(preparation.course.id)}
          className={courseActionClass}
        >
          {intl.formatMessage(messages.courseReadinessHeading)}
        </RouteDepartureLink>
        {canFirstActivate(preparation) ? (
          <RouteDepartureLink
            to={links.activation(preparation.course.id)}
            className={courseActionClass}
          >
            {intl.formatMessage(messages.courseActivationHeading)}
          </RouteDepartureLink>
        ) : null}
        <RouteDepartureLink
          to={links.materials(preparation.course.id)}
          className={courseActionClass}
        >
          {intl.formatMessage(messages.materialsHeading)}
        </RouteDepartureLink>
        <RouteDepartureLink
          to={links.materials(preparation.course.id)}
          className={courseActionClass}
        >
          {intl.formatMessage(messages.materialChooseBrief)}
        </RouteDepartureLink>
        {(
          [
            "description",
            "curriculum",
            "learningGoals",
            "instructions",
            "language",
          ] as const
        ).map((field) => (
          <RouteDepartureLink
            key={field}
            to={links.preparation(preparation.course.id, field)}
            className={courseActionClass}
          >
            {intl.formatMessage(courseTeachingFields[field].heading)}
          </RouteDepartureLink>
        ))}
      </nav>
      <div className="mt-6 flex flex-wrap gap-3">
        <CourseReadinessRefresh />
        <RouteDepartureLink to="/prepare/courses" className={courseActionClass}>
          {intl.formatMessage(messages.coursesPrepareHeading)}
        </RouteDepartureLink>
      </div>
    </>
  );
}
export function CoursePreparationStatus({
  preparation,
}: {
  readonly preparation: CoursePreparation;
}) {
  const intl = useIntl();
  return (
    <>
      <h2 className="text-base/7 font-semibold text-gray-900 wrap-anywhere">
        <bdi>{preparation.course.name}</bdi>
      </h2>
      <p className="mt-2 text-sm/6 text-gray-700">
        {intl.formatMessage(readinessMessages[preparation.readiness.state])}
      </p>
    </>
  );
}
