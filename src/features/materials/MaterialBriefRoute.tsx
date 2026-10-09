import { useIntl } from "react-intl";
import { messages } from "../../platform/i18n/messages";
import { RouteDepartureLink } from "../../platform/ui/RouteDepartureLink";
import { DiscardChangesDialog } from "../../platform/ui/DiscardChangesDialog";
import { MaterialBriefFields } from "./MaterialBriefFields";
import { MaterialBriefPreview } from "./MaterialBriefPreview";
import {
  MaterialState,
  MaterialLifecycleFeedback,
} from "./MaterialProcessingRoute";
import {
  materialActionClass,
  type MaterialRouteProps,
} from "./MaterialRouteProps";
import { useMaterialLifecycle } from "./useMaterialLifecycle";

// Tailwind Plus: Application UI > Forms > Form Layouts > Stacked; Feedback >
// Alerts > With description, 2026-09-13-083323, v4/react-light.jsx. MIA: saved
// and unsaved previews distinct; returned truth only, revocation warning, one announcer.
export default function MaterialBriefRoute({
  resource,
  links,
  unavailable,
}: MaterialRouteProps) {
  const intl = useIntl();
  if (resource.kind !== "brief")
    throw new Error("Brief route requires admission.");
  const model = useMaterialLifecycle(resource.material, "brief", unavailable);
  const material = model.material;
  if (material === null) return null;
  return (
    <>
      <MaterialState material={material} />
      <MaterialLifecycleFeedback model={model} />
      {material.brief_source !== null ? (
        <p>
          {intl.formatMessage(
            material.brief_source === "generated"
              ? messages.materialGenerated
              : messages.materialCorrected,
          )}
        </p>
      ) : null}
      {material.brief_updated_at === null ? null : (
        <p>
          {intl.formatDate(material.brief_updated_at)} ·{" "}
          {intl.formatTime(material.brief_updated_at, {
            timeZoneName: "short",
          })}
        </p>
      )}
      {material.brief === null ? (
        <p>{intl.formatMessage(messages.materialBriefMissing)}</p>
      ) : (
        <MaterialBriefPreview
          brief={material.brief}
          label={intl.formatMessage(messages.materialSavedBrief)}
        />
      )}
      {model.eligible && model.draft !== null ? (
        <>
          <div className="mt-6 rounded-md bg-yellow-50 p-4">
            <div className="flex">
              <div className="min-w-0 text-sm/6 text-yellow-800">
                <p>{intl.formatMessage(messages.materialEditWarning)}</p>
              </div>
            </div>
          </div>
          <form
            action={model.action}
            autoComplete="off"
            className="mt-6 space-y-8"
          >
            <fieldset disabled={model.locked} className="space-y-8">
              <MaterialBriefFields
                brief={model.draft}
                change={model.change}
                invalid={model.invalid}
                control={model.control}
              />
              <button type="submit" className={materialActionClass}>
                {intl.formatMessage(messages.materialSaveBrief)}
              </button>
            </fieldset>
          </form>
          {model.dirty ? (
            <MaterialBriefPreview
              brief={model.draft}
              label={intl.formatMessage(messages.materialDraftPreview)}
            />
          ) : null}
          {model.dirty || model.state.kind === "Read differs" ? (
            <button
              type="button"
              disabled={
                model.pending ||
                model.state.kind === "Save submitting" ||
                model.state.kind === "Reconciling form" ||
                model.state.kind === "Save outcome unknown"
              }
              className={materialActionClass}
              onClick={model.useCurrent}
            >
              {intl.formatMessage(messages.preparationUseCurrent)}
            </button>
          ) : null}
        </>
      ) : null}
      {/* Shared blueprint anatomy is marked in MaterialApprovalRoute, not shared lifecycle logic. */}
      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          className={materialActionClass}
          disabled={model.refreshLocked}
          onClick={() => void model.reconcile()}
        >
          {intl.formatMessage(messages.invitationsRefresh)}
        </button>
        {!model.dirty && !model.locked && model.eligible ? (
          <RouteDepartureLink
            to={links.approval(material.id)}
            className={materialActionClass}
          >
            {intl.formatMessage(messages.materialApprovalHeading)}
          </RouteDepartureLink>
        ) : null}
        <RouteDepartureLink to={links.parent} className={materialActionClass}>
          {intl.formatMessage(messages.preparationHub)}
        </RouteDepartureLink>
      </div>
      <DiscardChangesDialog
        departure={model.departure}
        title={intl.formatMessage(messages.materialBriefHeading)}
        description={intl.formatMessage(messages.materialDraftPreview)}
      />
    </>
  );
}
