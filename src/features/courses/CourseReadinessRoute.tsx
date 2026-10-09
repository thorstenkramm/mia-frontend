import { useIntl } from "react-intl";
import { canFirstActivate } from "../../platform/api/courses";
import { messages } from "../../platform/i18n/messages";
import { RouteDepartureLink } from "../../platform/ui/RouteDepartureLink";
import { CoursePreparationStatus } from "./CoursePreparationRoute";
import {
  CourseActivationAvailability,
  CourseReadinessChecklist,
  CourseReadinessRefresh,
} from "./CourseReadinessChecklist";
import { CourseCheckedAt, courseActionClass } from "./CourseListRoute";
import type { CourseRouteProps } from "./CourseRouteProps";
import { useState } from "react";

// Description-list blueprint is owned by CourseReadinessChecklist; status and
// navigation retain the hub's existing heading/button blueprint bindings.
export default function CourseReadinessRoute({
  resource,
  links,
}: CourseRouteProps) {
  const intl = useIntl();
  const [checkedAt] = useState(Date.now);
  if (resource.kind !== "readiness")
    throw new Error("Readiness requires its admitted resource.");
  const { preparation } = resource;
  return (
    <>
      <CoursePreparationStatus preparation={preparation} />
      <CourseCheckedAt time={checkedAt} />
      <CourseReadinessChecklist preparation={preparation} links={links} />
      <CourseActivationAvailability preparation={preparation} />
      <div className="mt-6 flex flex-wrap gap-3">
        {canFirstActivate(preparation) ? (
          <RouteDepartureLink
            to={links.activation(preparation.course.id)}
            className={courseActionClass}
          >
            {intl.formatMessage(messages.courseActivationHeading)}
          </RouteDepartureLink>
        ) : null}
        <CourseReadinessRefresh />
        <RouteDepartureLink
          to={links.preparation(preparation.course.id)}
          className={courseActionClass}
        >
          {intl.formatMessage(messages.preparationHub)}
        </RouteDepartureLink>
      </div>
    </>
  );
}
