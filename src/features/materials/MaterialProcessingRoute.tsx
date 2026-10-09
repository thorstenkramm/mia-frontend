import { useIntl } from "react-intl";
import type { Material } from "../../platform/api/materials";
import { TechnicalErrorDisclosure } from "../../platform/api/TechnicalErrorDisclosure";
import { messages } from "../../platform/i18n/messages";
import { UserText } from "../../platform/markdown/UserText";
import { RouteDepartureLink } from "../../platform/ui/RouteDepartureLink";
import {
  materialActionClass,
  materialLabels,
  type MaterialRouteProps,
} from "./MaterialRouteProps";
import { useMaterialLifecycle } from "./useMaterialLifecycle";
import { briefErrorText } from "./materialBriefFeedback";

// Tailwind Plus: Application UI > Data Display > Description Lists > Left-aligned
// with inline actions; Feedback > Alerts > With description, 2026-09-13-083323,
// v4/react-light.jsx. MIA: backend states only, explicit Refresh, paginated safe
// jobs, no provider/retry diagnostics, no inferred readiness or fabricated progress.
export default function MaterialProcessingRoute({
  resource,
  links,
  unavailable,
}: MaterialRouteProps) {
  const intl = useIntl();
  if (resource.kind !== "processing")
    throw new Error("Processing requires admission.");
  const model = useMaterialLifecycle(
    resource.material,
    "processing",
    unavailable,
    resource.files,
    resource.jobs,
  );
  const material = model.material;
  if (material === null) return null;
  const jobLabels = {
    queued: messages.materialQueued,
    running: messages.materialJobRunning,
    succeeded: messages.materialJobSucceeded,
    failed: messages.materialFailed,
    cancelled: messages.materialJobCancelled,
  };
  return (
    <>
      <MaterialState material={material} />
      <p className="mt-3 text-sm/6 text-gray-700">
        {intl.formatMessage(messages.materialNoNotifications)}
      </p>
      <MaterialLifecycleFeedback model={model} />
      {material.state === "failed" ? (
        <div className="mt-6 rounded-md bg-yellow-50 p-4">
          <div className="flex">
            <div className="min-w-0 text-sm/6 text-yellow-800">
              <p>
                {intl.formatMessage(
                  material.failure_code === "material_ocr_invalid" ||
                    material.failure_code === "material_extraction_invalid"
                    ? messages.materialOcrFailure
                    : material.failure_code === "material_brief_invalid"
                      ? messages.materialBriefFailure
                      : messages.materialProcessingFailure,
                )}
              </p>
            </div>
          </div>
        </div>
      ) : null}
      <h2 className="mt-6 text-base/7 font-semibold text-gray-900">
        {intl.formatMessage(messages.materialFiles)}
      </h2>
      <ul className="mt-6 divide-y divide-gray-100 rounded-md border border-gray-200">
        {model.files.map((file) => (
          <li
            key={file.id}
            className="min-w-0 space-y-2 px-4 py-4 text-sm/6 wrap-anywhere"
          >
            <p>
              <UserText text={file.name} />
            </p>
            <p>{intl.formatMessage(materialLabels[file.state])}</p>
            {file.state === "failed" ? (
              <p>{intl.formatMessage(messages.materialOcrFailure)}</p>
            ) : null}
          </li>
        ))}
      </ul>
      <h2
        ref={model.heading}
        tabIndex={-1}
        className="mt-6 text-base/7 font-semibold text-gray-900"
      >
        {intl.formatMessage(messages.materialJobs)}
      </h2>
      <ul className="mt-6 divide-y divide-gray-100 border-t border-gray-100">
        {model.jobs?.items.map((job) => (
          <li key={job.id} className="py-6 text-sm/6 text-gray-700">
            {intl.formatMessage(jobLabels[job.state])}
          </li>
        ))}
      </ul>
      <nav
        className="mt-6 flex flex-wrap gap-3"
        aria-label={intl.formatMessage(messages.materialJobs)}
      >
        {model.jobs?.previousOffset === null || model.jobs === null ? null : (
          <button
            type="button"
            className={materialActionClass}
            disabled={model.locked}
            onClick={() =>
              void model.reconcile(model.jobs?.previousOffset ?? 0, true)
            }
          >
            {intl.formatMessage(messages.invitationsPreviousPage)}
          </button>
        )}
        {model.jobs?.nextOffset === null || model.jobs === null ? null : (
          <button
            type="button"
            className={materialActionClass}
            disabled={model.locked}
            onClick={() =>
              void model.reconcile(model.jobs?.nextOffset ?? 0, true)
            }
          >
            {intl.formatMessage(messages.invitationsNextPage)}
          </button>
        )}
        <button
          type="button"
          className={materialActionClass}
          disabled={model.locked}
          onClick={() => void model.reconcile()}
        >
          {intl.formatMessage(messages.invitationsRefresh)}
        </button>
        {material.state === "failed" || material.state === "draft" ? (
          <RouteDepartureLink
            to={links.files(material.id)}
            className={materialActionClass}
          >
            {intl.formatMessage(messages.materialFiles)}
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
      </nav>
    </>
  );
}
export function MaterialState({ material }: { material: Material }) {
  const intl = useIntl();
  return (
    <>
      <h2 className="text-base/7 font-semibold text-gray-900 wrap-anywhere">
        <UserText text={material.name} />
      </h2>
      <dl className="mt-6 divide-y divide-gray-100 border-t border-gray-100">
        <div className="py-6">
          <dt className="text-sm/6 font-medium text-gray-900">
            {intl.formatMessage(messages.materialTechnical)}
          </dt>
          <dd className="mt-1 text-sm/6 text-gray-700">
            {intl.formatMessage(materialLabels[material.state])}
          </dd>
        </div>
        <div className="py-6">
          <dt className="text-sm/6 font-medium text-gray-900">
            {intl.formatMessage(messages.materialEducational)}
          </dt>
          <dd className="mt-1 text-sm/6 text-gray-700">
            {intl.formatMessage(
              material.approved
                ? messages.materialApproved
                : messages.materialUnapproved,
            )}
          </dd>
        </div>
      </dl>
      {material.format === "link" ? (
        <p>{intl.formatMessage(messages.materialLinkNonqualifying)}</p>
      ) : null}
    </>
  );
}
export function MaterialLifecycleFeedback({
  model,
}: {
  model: ReturnType<typeof useMaterialLifecycle>;
}) {
  const intl = useIntl();
  return (
    <div className="mt-3 space-y-3 text-sm/6 text-gray-700 wrap-anywhere">
      <p ref={model.statusTarget} tabIndex={-1} id="brief-validation">
        {model.state.kind === "Save outcome unknown" ||
        model.state.kind === "Read differs"
          ? model.feedback
          : model.state.kind === "Reconciling form"
            ? intl.formatMessage(messages.materialReconcile)
            : model.pending
              ? intl.formatMessage(messages.materialLifecyclePending)
              : model.feedback}
      </p>
      {model.invalid.length ? (
        <ul>
          {model.invalid.map((error) => (
            <li key={error.field}>
              <a
                href={`#brief-${error.field}`}
                onClick={(event) => {
                  event.preventDefault();
                  const node = document.getElementById(`brief-${error.field}`);
                  node?.closest("details")?.setAttribute("open", "");
                  node?.focus();
                }}
                className="min-h-6 text-indigo-600 underline"
              >
                {briefErrorText(intl, error)}
              </a>
            </li>
          ))}
        </ul>
      ) : null}
      {model.pending || model.state.kind === "Reconciling form" ? (
        <button
          type="button"
          className={materialActionClass}
          onClick={model.stop}
        >
          {intl.formatMessage(messages.invitationsStopWaiting)}
        </button>
      ) : null}
      <p>
        {intl.formatMessage(messages.invitationsLastChecked, {
          time: intl.formatTime(model.checkedAt, { timeZoneName: "short" }),
        })}
      </p>
      {model.readinessMessage !== null ? (
        <p>{intl.formatMessage(model.readinessMessage)}</p>
      ) : null}
      {model.readinessFailed ? (
        <p>{intl.formatMessage(messages.materialReadinessFailed)}</p>
      ) : null}
      {model.error === null ? null : (
        <TechnicalErrorDisclosure error={model.error} />
      )}
    </div>
  );
}
