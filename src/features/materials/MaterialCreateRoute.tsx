import { useActionState, useRef, useState } from "react";
import { useIntl } from "react-intl";
import { useNavigate } from "react-router";
import clsx from "clsx";
import {
  createMaterial,
  documentedUploadContract,
  isHiddenMaterialFailure,
  type FileFormat,
  type MaterialCreateFields,
} from "../../platform/api/materials";
import type { EntryApiFailure } from "../../platform/api/entry";
import { TechnicalErrorDisclosure } from "../../platform/api/TechnicalErrorDisclosure";
import { useSessionActions } from "../../platform/data/EntryDataProvider";
import { messages } from "../../platform/i18n/messages";
import { AuthSubmitButton } from "../../platform/ui/AuthSubmitButton";
import { DiscardChangesDialog } from "../../platform/ui/DiscardChangesDialog";
import { useUnsavedInputGuard } from "../../platform/ui/routeDeparture";
import { useRouteActivity } from "../../platform/ui/useRouteActivity";
import { useAnnouncer } from "../../platform/announcer/AnnouncementRegion";
import {
  materialActionClass,
  materialLabels,
  type MaterialRouteProps,
} from "./MaterialRouteProps";

type Creation = {
  readonly kind:
    | "Clean"
    | "Dirty sensitive"
    | "Submitting"
    | "Outcome unknown"
    | "Server rejected";
  readonly error: EntryApiFailure | null;
};
// Tailwind Plus: Application UI > Forms > Form Layouts > Stacked; Input Groups >
// Input with label and help text / Input with validation error, 2026-09-13-083323,
// v4/react-light.jsx. MIA: name/kind/format only, native selects, gray-500/red-600
// boundaries, action submission, no profile placeholders or optimistic identity.
export default function MaterialCreateRoute({
  resource,
  courseId,
  links,
  unavailable,
}: MaterialRouteProps) {
  const intl = useIntl();
  const { announce, clear: clearAnnouncement } = useAnnouncer();
  const navigate = useNavigate();
  const { runAuthenticatedMutation } = useSessionActions();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<MaterialCreateFields["kind"]>("worksheet");
  const [format, setFormat] = useState<FileFormat>("pdf");
  const [validation, setValidation] = useState<"required" | "too-long" | null>(
    null,
  );
  const input = useRef<HTMLInputElement>(null);
  const { state, stateRef, mounted, update } = useRouteActivity<Creation>({
    kind: "Clean",
    error: null,
  });
  const departure = useUnsavedInputGuard({
    dirty:
      name !== "" ||
      state.kind === "Dirty sensitive" ||
      state.kind === "Submitting" ||
      state.kind === "Outcome unknown",
    clear: () => {
      clearAnnouncement();
      setName("");
      update({ kind: "Clean", error: null });
    },
    stayTarget: input,
  });
  function transition(next: Creation): void {
    const previous = stateRef.current.kind;
    update(next);
    if (previous === next.kind) return;
    if (next.kind === "Outcome unknown")
      announce(intl.formatMessage(messages.materialUnknownCreate), "urgent");
    else if (next.kind === "Server rejected")
      announce(intl.formatMessage(messages.materialError), "urgent");
  }
  const [, action] = useActionState(async () => {
    const submitting = () => stateRef.current.kind === "Submitting";
    if (
      stateRef.current.kind === "Submitting" ||
      stateRef.current.kind === "Outcome unknown"
    )
      return;
    const trimmed = name.trim();
    if (
      trimmed === "" ||
      [...trimmed].length > 200 ||
      new TextEncoder().encode(trimmed).length > 800
    ) {
      setValidation(trimmed === "" ? "required" : "too-long");
      input.current?.focus();
      return;
    }
    setValidation(null);
    clearAnnouncement();
    update({ kind: "Submitting", error: null });
    const result = await runAuthenticatedMutation(
      {
        send: (csrf) =>
          createMaterial(courseId, { name: trimmed, kind, format }, csrf),
      },
      () => mounted.current && stateRef.current.kind === "Submitting",
    );
    if (!mounted.current) return;
    if (
      (result.kind === "rejected" || result.kind === "unknown") &&
      isHiddenMaterialFailure(result.failure)
    ) {
      setName("");
      unavailable(result.failure);
      return;
    }
    if (!submitting()) return;
    if (result.kind === "completed") {
      setName("");
      update({ kind: "Clean", error: null });
      navigate(links.files(result.value.id), { replace: true });
    } else if (result.kind === "unknown")
      transition({ kind: "Outcome unknown", error: result.failure });
    else if (result.kind === "rejected" || result.kind === "not-sent")
      transition({ kind: "Server rejected", error: result.failure });
  }, undefined);
  if (resource.kind !== "create")
    throw new Error("Material creation requires course admission.");
  const frozen =
    state.kind === "Submitting" || state.kind === "Outcome unknown";
  return (
    <>
      <form action={action} noValidate autoComplete="off">
        <div className="space-y-12">
          <div className="border-b border-gray-900/10 pb-12">
            <h2 className="text-base/7 font-semibold text-gray-900">
              {intl.formatMessage(messages.materialCreate)}
            </h2>
            <div className="mt-10 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
              <div className="col-span-full">
                <label
                  htmlFor="material-name"
                  className="block text-sm/6 font-medium text-gray-900"
                >
                  {intl.formatMessage(messages.materialName)}
                </label>
                <input
                  ref={input}
                  id="material-name"
                  required
                  value={name}
                  disabled={frozen}
                  onChange={(event) => {
                    setName(event.target.value);
                    setValidation(null);
                    clearAnnouncement();
                    update({ kind: "Dirty sensitive", error: null });
                  }}
                  aria-invalid={validation !== null}
                  aria-describedby={
                    validation === null
                      ? "material-name-help"
                      : "material-name-help material-name-error"
                  }
                  className={clsx(
                    "mt-2 block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 focus:outline-2 focus:-outline-offset-2 sm:text-sm/6",
                    validation !== null
                      ? "outline-red-600 focus:outline-red-600"
                      : "outline-gray-500 focus:outline-indigo-600",
                  )}
                />
                <p
                  id="material-name-help"
                  className="mt-2 text-sm/6 text-gray-700"
                >
                  {intl.formatMessage(messages.materialNameHelp)}
                </p>
                {validation === null ? null : (
                  <p
                    id="material-name-error"
                    className="mt-2 text-sm/6 text-red-700"
                  >
                    {intl.formatMessage(
                      validation === "required"
                        ? messages.materialNameRequired
                        : messages.materialNameTooLong,
                    )}
                  </p>
                )}
              </div>
              <div className="sm:col-span-3">
                <label
                  htmlFor="material-kind"
                  className="block text-sm/6 font-medium text-gray-900"
                >
                  {intl.formatMessage(messages.materialKind)}
                </label>
                <select
                  id="material-kind"
                  disabled={frozen}
                  value={kind}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (
                      value === "text-book" ||
                      value === "exam" ||
                      value === "worksheet"
                    ) {
                      setKind(value);
                      update({ kind: "Dirty sensitive", error: null });
                    }
                  }}
                  className="mt-2 w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600"
                >
                  {(["text-book", "exam", "worksheet"] as const).map(
                    (value) => (
                      <option key={value} value={value}>
                        {intl.formatMessage(materialLabels[value])}
                      </option>
                    ),
                  )}
                </select>
              </div>
              <div className="sm:col-span-3">
                <label
                  htmlFor="material-format"
                  className="block text-sm/6 font-medium text-gray-900"
                >
                  {intl.formatMessage(messages.materialFormat)}
                </label>
                <select
                  id="material-format"
                  disabled={frozen}
                  value={format}
                  onChange={(event) => {
                    const value = documentedUploadContract.formats.find(
                      (candidate) => candidate === event.target.value,
                    );
                    if (value !== undefined) {
                      setFormat(value);
                      update({ kind: "Dirty sensitive", error: null });
                    }
                  }}
                  className="mt-2 w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600"
                >
                  {documentedUploadContract.formats.map((value) => (
                    <option key={value} value={value}>
                      {intl.formatMessage(materialLabels[value])}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <AuthSubmitButton
            label={intl.formatMessage(messages.materialCreate)}
            enabled={!frozen}
          />
        </div>
      </form>
      {state.kind === "Submitting" ? (
        <button
          type="button"
          className={materialActionClass}
          onClick={() => transition({ kind: "Outcome unknown", error: null })}
        >
          {intl.formatMessage(messages.invitationsStopWaiting)}
        </button>
      ) : null}
      {state.kind === "Outcome unknown" ? (
        <>
          <p className="mt-3 text-sm/6 text-gray-700">
            {intl.formatMessage(messages.materialUnknownCreate)}
          </p>
          <button
            type="button"
            className={materialActionClass}
            onClick={() => {
              clearAnnouncement();
              setName("");
              update({ kind: "Clean", error: null });
              navigate(links.list, { replace: true });
            }}
          >
            {intl.formatMessage(messages.materialAbandonCreate)}
          </button>
        </>
      ) : null}
      {state.error === null ? null : (
        <>
          {/* jscpd:ignore-start — repeated localized material error/disclosure anatomy;
              create and queue mutation lifecycles retain their separate owners. */}
          {state.kind === "Server rejected" ? (
            <p className="mt-3 text-sm/6 text-gray-700">
              {intl.formatMessage(messages.materialError)}
            </p>
          ) : null}
          <TechnicalErrorDisclosure error={state.error} />
          {/* jscpd:ignore-end */}
        </>
      )}
      <DiscardChangesDialog
        departure={departure}
        title={intl.formatMessage(messages.materialCreate)}
        description={intl.formatMessage(messages.materialPickerHelp)}
      />
    </>
  );
}
