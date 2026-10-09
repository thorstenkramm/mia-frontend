import { useIntl } from "react-intl";
import { useSessionActions } from "../../platform/data/EntryDataProvider";
import { messages } from "../../platform/i18n/messages";
import { RouteDepartureLink } from "../../platform/ui/RouteDepartureLink";
import { MaterialState } from "./MaterialProcessingRoute";
import {
  materialActionClass,
  materialLabels,
  type MaterialRouteProps,
} from "./MaterialRouteProps";

// Tailwind Plus: Application UI > Data Display > Description Lists >
// Left-aligned with inline actions, 2026-09-13-083323, v4/react-light.jsx.
// MIA: persisted metadata only, separate approval/technical state; wrapping names,
// no download/future actions; state-appropriate continuations for course-wide files.
export default function MaterialDetailRoute({
  resource,
  links,
}: MaterialRouteProps) {
  const intl = useIntl();
  const { checkRouteAdmission } = useSessionActions();
  if (resource.kind !== "detail")
    throw new Error("Material detail requires admission.");
  const material = resource.material;
  return (
    <>
      <MaterialState material={material} />
      <dl className="mt-6 divide-y divide-gray-100 border-t border-gray-100">
        {[
          materialLabels[material.scope],
          materialLabels[material.kind],
          materialLabels[material.format],
          materialLabels[material.state],
          material.approved
            ? messages.materialApproved
            : messages.materialUnapproved,
        ].map((label) => (
          <div key={label.id} className="py-6">
            <dt className="text-sm/6 font-medium text-gray-900">
              {intl.formatMessage(label)}
            </dt>
            <dd className="mt-1 text-sm/6 text-gray-700">
              {material.scope === "course-wide" &&
              (material.state === "draft" || material.state === "failed") &&
              material.format !== "link" &&
              label === materialLabels[material.state] ? (
                <RouteDepartureLink
                  to={links.files(material.id)}
                  className={materialActionClass}
                >
                  {intl.formatMessage(messages.materialFiles)}
                </RouteDepartureLink>
              ) : null}
            </dd>
          </div>
        ))}
      </dl>
      {material.scope === "course-wide" ? (
        <nav
          className="mt-6 flex flex-wrap gap-3"
          aria-label={intl.formatMessage(messages.materialDetail)}
        >
          {material.format !== "link" &&
          (material.state === "processing" || material.state === "failed") ? (
            <RouteDepartureLink
              to={links.processing(material.id)}
              className={materialActionClass}
            >
              {intl.formatMessage(messages.materialProcessingHeading)}
            </RouteDepartureLink>
          ) : null}
          {material.brief !== null ? (
            <RouteDepartureLink
              to={links.brief(material.id)}
              className={materialActionClass}
            >
              {intl.formatMessage(messages.materialBriefHeading)}
            </RouteDepartureLink>
          ) : null}
          {material.state === "ready" ? (
            <RouteDepartureLink
              to={links.approval(material.id)}
              className={materialActionClass}
            >
              {intl.formatMessage(messages.materialApprovalHeading)}
            </RouteDepartureLink>
          ) : null}
        </nav>
      ) : null}
      <button
        type="button"
        onClick={() => void checkRouteAdmission()}
        className={materialActionClass}
      >
        {intl.formatMessage(messages.invitationsRefresh)}
      </button>
    </>
  );
}
