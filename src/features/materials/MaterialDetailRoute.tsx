import { useIntl } from "react-intl";
import { useSessionActions } from "../../platform/data/EntryDataProvider";
import { messages } from "../../platform/i18n/messages";
import { RouteDepartureLink } from "../../platform/ui/RouteDepartureLink";
import {
  materialActionClass,
  materialLabels,
  type MaterialRouteProps,
} from "./MaterialRouteProps";

// Tailwind Plus: Application UI > Data Display > Description Lists >
// Left-aligned with inline actions, 2026-09-13-083323, v4/react-light.jsx.
// MIA: persisted metadata only, separate approval/technical state; wrapping names,
// no brief/download/future actions; draft continuation only for course-wide files.
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
      <h2 className="text-base/7 font-semibold text-gray-900 wrap-anywhere">
        <bdi>{material.name}</bdi>
      </h2>
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
              material.state === "draft" &&
              material.format !== "link" &&
              label === materialLabels.draft ? (
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
