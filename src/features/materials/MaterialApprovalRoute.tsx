import {
  Dialog,
  DialogBackdrop,
  DialogDescription,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { useIntl } from "react-intl";
import { useNavigate } from "react-router";
import { messages } from "../../platform/i18n/messages";
import { RouteDepartureLink } from "../../platform/ui/RouteDepartureLink";
import { DiscardChangesDialog } from "../../platform/ui/DiscardChangesDialog";
import {
  materialActionClass,
  type MaterialRouteProps,
} from "./MaterialRouteProps";
import { useMaterialLifecycle } from "./useMaterialLifecycle";
import { MaterialBriefPreview } from "./MaterialBriefPreview";
import {
  MaterialState,
  MaterialLifecycleFeedback,
} from "./MaterialProcessingRoute";

// Tailwind Plus: Application UI > Overlays > Modal Dialogs > Simple alert;
// Forms > Form Layouts > Stacked, 2026-09-13-083323, v4/react-light.jsx.
// MIA: deliberate review, current pre-dispatch checks, Cancel initial focus,
// bodyless fixed-effect actions; no atomic-version/activation/optimistic claim.
export default function MaterialApprovalRoute(props: MaterialRouteProps) {
  return <MaterialApprovalSurface {...props} mode="approval" />;
}
export function MaterialApprovalSurface({
  resource,
  links,
  unavailable,
  mode,
}: MaterialRouteProps & { mode: "approval" | "revoke" }) {
  const intl = useIntl();
  const navigate = useNavigate();
  if (resource.kind !== mode)
    throw new Error("Approval action requires admission.");
  const model = useMaterialLifecycle(
    resource.material,
    mode,
    unavailable,
    [],
    null,
    () => {
      void navigate(links.detail(resource.material.id));
    },
  );
  const material = model.material;
  if (material === null) return null;
  const descriptor =
    mode === "approval"
      ? messages.materialApprove
      : messages.materialRevokeHeading;
  const help =
    mode === "approval"
      ? messages.materialApproveHelp
      : messages.materialRevokeHelp;
  return (
    <>
      <MaterialState material={material} />
      <p className="mt-3 text-sm/6 text-gray-700">{intl.formatMessage(help)}</p>
      <MaterialLifecycleFeedback model={model} />
      {material.brief === null ? (
        <p>{intl.formatMessage(messages.materialBriefMissing)}</p>
      ) : (
        <MaterialBriefPreview
          brief={material.brief}
          label={intl.formatMessage(messages.materialSavedBrief)}
        />
      )}
      {model.eligible ? (
        <div className="mt-6 space-y-4">
          {mode === "approval" ? (
            <label className="flex min-h-6 gap-3 text-sm/6 text-gray-900">
              <input
                type="checkbox"
                className="size-6 shrink-0"
                checked={model.acknowledged}
                disabled={model.locked}
                onChange={(event) => model.setAck(event.target.checked)}
              />
              {intl.formatMessage(messages.materialReviewAck)}
            </label>
          ) : null}
          <button
            type="button"
            className={materialActionClass}
            disabled={
              model.locked ||
              (mode === "approval"
                ? !model.acknowledged || material.approved
                : !material.approved)
            }
            onClick={model.confirm}
          >
            {intl.formatMessage(descriptor)}
          </button>
        </div>
      ) : (
        <p>{intl.formatMessage(messages.materialBriefMissing)}</p>
      )}
      {/* Stacked blueprint action anatomy; route-specific access remains in its owner. */}
      {/* jscpd:ignore-start */}
      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          className={materialActionClass}
          disabled={model.refreshLocked}
          onClick={() => void model.reconcile()}
        >
          {intl.formatMessage(messages.invitationsRefresh)}
        </button>
        {/* jscpd:ignore-end */}
        <RouteDepartureLink
          to={links.brief(material.id)}
          className={materialActionClass}
        >
          {intl.formatMessage(messages.materialBriefHeading)}
        </RouteDepartureLink>
        {mode === "approval" && material.approved ? (
          <RouteDepartureLink
            to={links.revoke(material.id)}
            className={materialActionClass}
          >
            {intl.formatMessage(messages.materialRevokeHeading)}
          </RouteDepartureLink>
        ) : null}
        {mode === "revoke" && model.state.kind === "Save accepted" ? (
          <RouteDepartureLink
            to={links.detail(material.id)}
            className={materialActionClass}
          >
            {intl.formatMessage(messages.materialDetail)}
          </RouteDepartureLink>
        ) : null}
        <RouteDepartureLink to={links.parent} className={materialActionClass}>
          {intl.formatMessage(messages.preparationHub)}
        </RouteDepartureLink>
      </div>
      {/* Simple alert blueprint; distinct finalization/approval contracts must not be merged. */}
      {/* jscpd:ignore-start */}
      <Dialog
        open={model.state.kind === "Confirming"}
        onClose={model.cancel}
        className="relative z-50"
      >
        <DialogBackdrop className="fixed inset-0 bg-gray-500/75" />
        <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <DialogPanel className="relative overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left shadow-xl sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex size-12 shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:size-10">
                  <ExclamationTriangleIcon
                    aria-hidden="true"
                    className="size-6 text-red-600"
                  />
                </div>
                <div className="mt-3 min-w-0 text-center sm:mt-0 sm:ml-4 sm:text-left">
                  <DialogTitle
                    as="h2"
                    className="text-base font-semibold text-gray-900"
                  >
                    {intl.formatMessage(descriptor)}
                  </DialogTitle>
                  <DialogDescription className="mt-2 text-sm/6 text-gray-700">
                    {intl.formatMessage(help)}
                  </DialogDescription>
                  <p className="mt-2 wrap-anywhere">
                    <bdi>{material.name}</bdi>
                  </p>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-3 sm:mt-4 sm:flex-row-reverse">
                <form action={model.action}>
                  <button
                    type="submit"
                    disabled={model.pending}
                    className="inline-flex min-h-6 w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-red-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 sm:w-auto"
                  >
                    {intl.formatMessage(descriptor)}
                  </button>
                </form>
                <button
                  type="button"
                  data-autofocus
                  className={materialActionClass}
                  onClick={model.cancel}
                >
                  {intl.formatMessage(messages.materialCancel)}
                </button>
              </div>
            </DialogPanel>
          </div>
        </div>
      </Dialog>
      {/* jscpd:ignore-end */}
      <DiscardChangesDialog
        departure={model.departure}
        title={intl.formatMessage(descriptor)}
        description={intl.formatMessage(messages.materialLifecycleUnknown)}
      />
    </>
  );
}
