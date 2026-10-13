import { useActionState, useRef } from "react";
import {
  Dialog,
  DialogBackdrop,
  DialogDescription,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { useIntl } from "react-intl";
import { useNavigate } from "react-router";
import { useAnnouncer } from "../../platform/announcer/AnnouncementRegion";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import {
  documentedUploadContract,
  uploadAdvice,
  type MaterialFileId,
} from "../../platform/api/materials";
import { TechnicalErrorDisclosure } from "../../platform/api/TechnicalErrorDisclosure";
import { messages } from "../../platform/i18n/messages";
import { DiscardChangesDialog } from "../../platform/ui/DiscardChangesDialog";
import { useUnsavedInputGuard } from "../../platform/ui/routeDeparture";
import {
  materialActionClass,
  materialLabels,
  type MaterialRouteProps,
} from "./MaterialRouteProps";
import { useMaterialUploadQueue } from "./useMaterialUploadQueue";
import { MaterialUploadQueue } from "./MaterialUploadQueue";

// Tailwind Plus: Application UI > Forms > Form Layouts > Stacked; Data Display >
// Description Lists > Left-aligned with inline actions; Overlays > Modal Dialogs >
// Simple alert, 2026-09-13-083323, v4/react-light.jsx. MIA: native multi-picker,
// pre-picker documented limits (no drag/drop); persisted attachments only, wrapping
// metadata, exact-ID draft deletion; safe initial dialog focus, no preview/download.
export default function MaterialFilesRoute({
  resource,
  unavailable,
  links,
}: MaterialRouteProps) {
  const intl = useIntl();
  const navigate = useNavigate();
  const { announce } = useAnnouncer();
  const input = useRef<HTMLInputElement>(null);
  const persistedNodes = useRef(new Map<MaterialFileId, HTMLLIElement>());
  if (resource.kind !== "files")
    throw new Error("Files require admitted course-wide material.");
  const { state, queue } = useMaterialUploadQueue(
    resource.material,
    resource.files,
    unavailable,
  );
  const departure = useUnsavedInputGuard({
    dirty:
      state !== null &&
      (state.rows.length > 0 || state.deletion.kind !== "Idle"),
    clear: () => {
      if (input.current) input.current.value = "";
      queue.destroy();
    },
    stayTarget: input,
  });
  const [, deleteAction] = useActionState(async () => {
    const current = queue.getSnapshot();
    if (current?.deletion.kind !== "Remove chosen row") return;
    const chosenId = current.deletion.file.id;
    const position = current.files.findIndex((file) => file.id === chosenId);
    const next = current.files[position + 1] ?? current.files[position - 1];
    await queue.deleteChosen(() => {
      const target =
        next === undefined ? null : persistedNodes.current.get(next.id);
      if (target) target.focus();
      else input.current?.focus();
    });
  }, undefined);
  const [, finalizeAction] = useActionState(async () => {
    await queue.finalize((material) => {
      // Commit the definitive transition before leaving its announcement owner.
      // Direct processing entry remains silent; no URL/history handoff is used.
      const destination = links.processing(material.id);
      announce(
        intl.formatMessage(materialLabels[material.state]),
        "polite",
        () => {
          void navigate(destination);
        },
      );
    });
  }, undefined);
  if (state === null) return null;
  const contract = documentedUploadContract;
  const format = state.material.format;
  const frozen =
    state.queue === "Frozen elsewhere" ||
    state.material.state !== "draft" ||
    state.deletion.kind !== "Idle" ||
    state.read === "Reading" ||
    ["Prevalidating", "Confirming", "Submitting", "Outcome unknown"].includes(
      state.finalization,
    );
  const fileRemovalFrozen =
    state.read === "Reading" ||
    state.deletion.kind !== "Idle" ||
    !["draft", "failed"].includes(state.material.state) ||
    ["Prevalidating", "Confirming", "Submitting", "Outcome unknown"].includes(
      state.finalization,
    );
  const total =
    state.files.reduce((sum, file) => sum + file.size, 0) +
    state.rows
      .filter((row) => row.state.kind !== "Uploaded")
      .reduce((sum, row) => sum + row.size, 0);
  const advice = uploadAdvice(
    Math.max(0, ...state.rows.map((row) => row.size)),
    total,
    state.files.length +
      state.rows.filter((row) => row.state.kind !== "Uploaded").length,
  );
  const pending = state.rows.some(
    (row) => !["Uploaded", "Rejected"].includes(row.state.kind),
  );
  return (
    <>
      <h2 className="text-base/7 font-semibold text-gray-900 wrap-anywhere">
        <bdi>{state.material.name}</bdi>
      </h2>
      <p className="mt-2 text-sm/6 text-gray-700">
        {intl.formatMessage(materialLabels[state.material.state])} ·{" "}
        {intl.formatMessage(
          state.material.approved
            ? messages.materialApproved
            : messages.materialUnapproved,
        )}
      </p>
      <section
        aria-labelledby="upload-limits"
        className="mt-6 space-y-3 border-b border-gray-900/10 pb-12"
      >
        <h2
          id="upload-limits"
          className="text-base/7 font-semibold text-gray-900"
        >
          {intl.formatMessage(messages.materialLimits)}
        </h2>
        <p className="text-sm/6 text-gray-700">
          {intl.formatMessage(messages.materialLimitsCaveat)}
        </p>
        <p className="text-sm/6 text-gray-700">
          {intl.formatMessage(messages.materialByteLimits, {
            fileDefault: contract.fileBytes.default / 1048576,
            fileHard: contract.fileBytes.hard / 1048576,
            materialDefault: contract.materialBytes.default / 1048576,
            materialHard: contract.materialBytes.hard / 1048576,
            count: contract.files,
          })}
        </p>
        <p className="text-sm/6 text-gray-700">
          {intl.formatMessage(messages.materialPageLimits, {
            pageDefault: intl.formatNumber(contract.pages.default),
            pageHard: intl.formatNumber(contract.pages.hard),
            imageDefault: contract.imageMegapixels.default,
            imageHard: contract.imageMegapixels.hard,
            dimension: intl.formatNumber(contract.imageDimension),
          })}
        </p>
        <p className="text-sm/6 text-gray-700">
          {intl.formatMessage(messages.materialArchiveLimits, {
            entries: intl.formatNumber(contract.docx.entries),
            total: contract.docx.totalBytes / 1048576,
            entry: contract.docx.entryBytes / 1048576,
            ratio: contract.docx.ratio,
          })}
        </p>
        <p className="text-sm/6 text-gray-700">
          {intl.formatMessage(messages.materialFilenameHelp)}
        </p>
        <ul className="list-inside list-disc text-sm/6 text-gray-700 wrap-anywhere">
          {contract.formats.map((value) => (
            <li key={value}>
              {intl.formatMessage(materialLabels[value])} —{" "}
              {contract.accepted[value].media}
            </li>
          ))}
        </ul>
      </section>
      {frozen ? (
        <p className="mt-3 text-sm/6 text-gray-700">
          {intl.formatMessage(messages.materialFrozen)}
        </p>
      ) : null}
      <div className="mt-10 grid grid-cols-1 gap-x-6 gap-y-8">
        <div>
          <label
            htmlFor="material-picker"
            className="block text-sm/6 font-medium text-gray-900"
          >
            {intl.formatMessage(messages.materialPicker)}
          </label>
          <p id="material-picker-help" className="mt-2 text-sm/6 text-gray-700">
            {intl.formatMessage(messages.materialPickerHelp)}{" "}
            {intl.formatMessage(materialLabels[format])}
          </p>
          <input
            ref={input}
            id="material-picker"
            type="file"
            multiple
            disabled={frozen || format === "link"}
            accept={
              format === "link"
                ? ""
                : [
                    ...contract.accepted[format].extensions,
                    contract.accepted[format].media,
                  ].join(",")
            }
            aria-describedby="material-picker-help"
            className="mt-2 block w-full min-w-0 rounded-md bg-white px-3 py-2 text-sm/6 text-gray-900 outline-1 -outline-offset-1 outline-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600"
            onChange={(event) => {
              queue.select(Array.from(event.target.files ?? []));
              event.target.value = "";
            }}
          />
        </div>
      </div>
      {Object.values(advice).some(Boolean) ? (
        <p className="mt-3 text-sm/6 text-gray-700">
          {intl.formatMessage(messages.materialAdvice)}
        </p>
      ) : null}
      <section aria-labelledby="local-queue" className="mt-6">
        <h2
          id="local-queue"
          className="text-base/7 font-semibold text-gray-900"
        >
          {intl.formatMessage(messages.materialQueue)}
        </h2>
        <fieldset
          disabled={[
            "Prevalidating",
            "Confirming",
            "Submitting",
            "Outcome unknown",
          ].includes(state.finalization)}
        >
          <MaterialUploadQueue rows={state.rows} queue={queue} input={input} />
        </fieldset>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            className={materialActionClass}
            disabled={
              frozen ||
              state.queue === "Queue paused" ||
              !state.rows.some(
                (row) =>
                  row.state.kind === "Selected" || row.state.kind === "Queued",
              )
            }
            onClick={() => void queue.start()}
          >
            {intl.formatMessage(
              state.rows.some((row) => row.state.kind === "Selected")
                ? messages.materialQueueStart
                : messages.materialQueueContinue,
            )}
          </button>
          <button
            type="button"
            className={materialActionClass}
            disabled={
              state.read === "Reading" ||
              state.rows.some(
                (row) =>
                  row.state.kind === "Uploading" ||
                  row.state.kind === "Verifying",
              ) ||
              state.deletion.kind === "Submitting" ||
              ["Prevalidating", "Confirming", "Submitting"].includes(
                state.finalization,
              )
            }
            onClick={() => void queue.reconcile()}
          >
            {intl.formatMessage(messages.materialReconcile)}
          </button>
        </div>
      </section>
      <section aria-labelledby="persisted-files" className="mt-6">
        <h2
          id="persisted-files"
          className="text-base/7 font-semibold text-gray-900"
        >
          {intl.formatMessage(messages.materialReview)}
        </h2>
        <p className="mt-2 text-sm/6 text-gray-700">
          {intl.formatMessage(messages.invitationsLastChecked, {
            time: intl.formatTime(state.checkedAt),
          })}
        </p>
        <dl className="mt-6 divide-y divide-gray-100 border-t border-gray-100">
          <div className="py-6">
            <dt className="text-sm/6 font-medium text-gray-900">
              {intl.formatMessage(messages.materialFiles)}
            </dt>
            <dd className="mt-1 text-sm/6 text-gray-700">
              {state.files.length === 0 ? (
                <p>{intl.formatMessage(messages.materialNoFiles)}</p>
              ) : (
                <ul className="divide-y divide-gray-100 rounded-md border border-gray-200">
                  {state.files.map((file, index) => (
                    <li
                      key={file.id}
                      ref={(node) => {
                        if (node) persistedNodes.current.set(file.id, node);
                        else persistedNodes.current.delete(file.id);
                      }}
                      tabIndex={-1}
                      aria-labelledby={`persisted-file-${index}`}
                      className="flex flex-col justify-between gap-3 px-4 py-4 sm:flex-row"
                    >
                      <div className="min-w-0 flex-1">
                        <p
                          id={`persisted-file-${index}`}
                          className="font-medium text-gray-900 wrap-anywhere"
                        >
                          <bdi>{file.name}</bdi>
                        </p>
                        <p className="wrap-anywhere">
                          {file.mediaType} ·{" "}
                          {intl.formatMessage(messages.materialBytes, {
                            bytes: file.size,
                          })}{" "}
                          · {intl.formatMessage(materialLabels[file.state])}
                        </p>
                      </div>
                      {state.material.state === "draft" ||
                      state.material.state === "failed" ? (
                        <button
                          type="button"
                          aria-describedby={`persisted-file-${index}`}
                          className={materialActionClass}
                          disabled={
                            fileRemovalFrozen ||
                            state.rows.some(
                              (row) =>
                                row.state.kind === "Uploading" ||
                                row.state.kind === "Verifying",
                            )
                          }
                          onClick={() => queue.chooseRemoval(file.id)}
                        >
                          {intl.formatMessage(messages.materialRemove)}
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </dd>
          </div>
        </dl>
        {state.deletion.kind === "Submitting" ||
        state.deletion.kind === "Outcome unknown" ? (
          <p className="mt-3 text-sm/6 text-gray-700">
            {intl.formatMessage(
              state.deletion.kind === "Submitting"
                ? messages.materialDeleting
                : messages.materialDeleteUnknown,
            )}
          </p>
        ) : null}
        <button
          type="button"
          className={materialActionClass}
          disabled={
            pending ||
            state.read === "Reading" ||
            state.deletion.kind !== "Idle" ||
            [
              "Prevalidating",
              "Confirming",
              "Submitting",
              "Outcome unknown",
            ].includes(state.finalization) ||
            state.review.kind === "List accepted"
          }
          onClick={() => queue.accept()}
        >
          {intl.formatMessage(messages.materialAccept)}
        </button>
        {state.review.kind === "List accepted" ? (
          <p className="mt-3 text-sm/6 text-gray-700">
            {intl.formatMessage(messages.materialAccepted)}
          </p>
        ) : null}
      </section>
      <div className="mt-6 space-y-3">
        <button
          type="button"
          className={materialActionClass}
          disabled={!queue.canFinalize()}
          onClick={() => void queue.reviewFinalization()}
        >
          {intl.formatMessage(messages.materialFinalize)}
        </button>
        {state.finalization === "Changed" ? (
          <p>{intl.formatMessage(messages.materialChanged)}</p>
        ) : null}
        {state.finalization === "Prevalidating" ? (
          <p>{intl.formatMessage(messages.materialReconcile)}</p>
        ) : null}
        {state.finalization === "Submitting" ||
        state.finalization === "Outcome unknown" ? (
          <p>
            {intl.formatMessage(
              state.finalization === "Submitting"
                ? messages.materialLifecyclePending
                : messages.materialLifecycleUnknown,
            )}
          </p>
        ) : null}
        {state.finalization === "Submitting" ? (
          <button
            type="button"
            className={materialActionClass}
            onClick={() => queue.stopFinalizationWaiting()}
          >
            {intl.formatMessage(messages.invitationsStopWaiting)}
          </button>
        ) : null}
      </div>
      {state.deletion.kind === "Submitting" ? (
        <button
          type="button"
          className={materialActionClass}
          onClick={() => queue.stopRemovalWaiting()}
        >
          {intl.formatMessage(messages.invitationsStopWaiting)}
        </button>
      ) : null}
      {state.error === null ? null : (
        // Same localized error anatomy: minimal marker lives in MaterialCreateRoute.
        <>
          {state.error.kind !== "unknown" ? (
            <p className="mt-3 text-sm/6 text-gray-700">
              {intl.formatMessage(
                state.error.kind === "read"
                  ? messages.materialReadFailed
                  : messages.materialError,
              )}
            </p>
          ) : null}
          <TechnicalErrorDisclosure error={state.error.failure} />
        </>
      )}
      <Dialog
        open={
          state.deletion.kind === "Remove chosen row" ||
          state.finalization === "Confirming"
        }
        onClose={() => {
          queue.cancelRemoval();
          queue.cancelFinalization();
        }}
        className="relative z-50"
      >
        {/* Simple alert presentation: MaterialApprovalRoute and TutoringFinishRoute mark their blueprint copies; material finalization remains separate. */}
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
                    {intl.formatMessage(
                      state.finalization === "Confirming"
                        ? messages.materialFinalize
                        : messages.materialRemoveConfirm,
                    )}
                  </DialogTitle>
                  <DialogDescription className="mt-2 text-sm/6 text-gray-700">
                    {intl.formatMessage(
                      state.finalization === "Confirming"
                        ? messages.materialFinalizeHelp
                        : messages.materialRemoveHelp,
                    )}
                  </DialogDescription>
                  {state.deletion.kind === "Remove chosen row" ? (
                    <p className="mt-2 text-sm/6 text-gray-700 wrap-anywhere">
                      <bdi>{state.deletion.file.name}</bdi>
                    </p>
                  ) : null}
                  {state.finalization === "Confirming" ? (
                    <div className="mt-2 text-sm/6 wrap-anywhere">
                      <p>
                        <bdi>{state.material.name}</bdi>
                      </p>
                      <ul>
                        {state.files.map((file) => (
                          <li key={file.id}>
                            <bdi>{file.name}</bdi>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-3 sm:mt-4 sm:flex-row-reverse">
                <form
                  action={
                    state.finalization === "Confirming"
                      ? finalizeAction
                      : deleteAction
                  }
                >
                  <button
                    type="submit"
                    className="inline-flex min-h-6 w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-red-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 sm:w-auto"
                  >
                    {intl.formatMessage(
                      state.finalization === "Confirming"
                        ? messages.materialFinalize
                        : messages.materialRemove,
                    )}
                  </button>
                </form>
                <button
                  type="button"
                  data-autofocus
                  className={materialActionClass}
                  onClick={() => {
                    queue.cancelRemoval();
                    queue.cancelFinalization();
                  }}
                >
                  {intl.formatMessage(messages.materialCancel)}
                </button>
              </div>
            </DialogPanel>
          </div>
        </div>
      </Dialog>
      <DiscardChangesDialog
        departure={departure}
        title={intl.formatMessage(messages.materialQueue)}
        description={intl.formatMessage(messages.materialPickerHelp)}
      />
    </>
  );
}
