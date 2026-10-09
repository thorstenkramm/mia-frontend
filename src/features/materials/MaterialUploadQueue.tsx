import { useRef, useState, type RefObject } from "react";
import { useIntl } from "react-intl";
import { TechnicalErrorDisclosure } from "../../platform/api/TechnicalErrorDisclosure";
import { messages } from "../../platform/i18n/messages";
import { materialActionClass, materialLabels } from "./MaterialRouteProps";
import type {
  MaterialUploadQueue as QueueOwner,
  UploadRow,
} from "./useMaterialUploadQueue";

// Tailwind Plus: Application UI > Lists > Stacked Lists > Narrow with actions;
// Navigation > Progress Bars > Progress bar, 2026-09-13-083323, v4/react-light.jsx.
// MIA: no avatars/truncation/workflow steps/static percentage; native progress
// uses measured byte values, indeterminate is text; actions wrap, stable rows.
export function MaterialUploadQueue({
  rows,
  queue,
  input,
}: {
  readonly rows: readonly UploadRow[];
  readonly queue: QueueOwner;
  readonly input: RefObject<HTMLInputElement | null>;
}) {
  const intl = useIntl();
  const nodes = useRef(new Map<number, HTMLLIElement>());
  const [risks, setRisks] = useState<ReadonlySet<number>>(new Set());
  const remove = (row: UploadRow, abandon = false) => {
    const position = rows.findIndex((candidate) => candidate.id === row.id);
    const fallback = rows[position + 1] ?? rows[position - 1];
    if (abandon) queue.abandon(row.id);
    else queue.remove(row.id);
    if (fallback === undefined) input.current?.focus();
    else nodes.current.get(fallback.id)?.focus();
  };
  return (
    <ul className="divide-y divide-gray-100">
      {rows.map((row) => {
        const state = row.state;
        const labelId = `local-file-${row.id}`;
        return (
          <li
            key={row.id}
            ref={(node) => {
              if (node === null) nodes.current.delete(row.id);
              else nodes.current.set(row.id, node);
            }}
            tabIndex={-1}
            aria-labelledby={labelId}
            className="flex flex-col justify-between gap-4 py-5 sm:flex-row sm:items-center"
          >
            <div className="min-w-0 flex-auto">
              <p
                id={labelId}
                className="text-sm/6 font-semibold text-gray-900 wrap-anywhere"
              >
                {intl.formatMessage(messages.materialRow, {
                  position: row.position,
                  name: "",
                })}
                <bdi>{row.name}</bdi>
              </p>
              <p
                id={`local-file-meta-${row.id}`}
                className="mt-1 text-sm/6 text-gray-700 wrap-anywhere"
              >
                {intl.formatMessage(messages.materialBytes, {
                  bytes: row.size,
                })}{" "}
                · {row.mediaType} ·{" "}
                {intl.formatMessage(materialLabels[state.kind])}
              </p>
              {state.kind === "Uploading" ? (
                state.total !== null && state.total > 0 ? (
                  <div className="mt-6">
                    <progress
                      aria-labelledby={labelId}
                      className="h-2 w-full overflow-hidden rounded-full bg-gray-200 accent-indigo-600"
                      value={state.loaded}
                      max={state.total}
                    />
                    <p className="mt-2 text-sm/6 text-gray-700">
                      {intl.formatMessage(messages.materialProgress, {
                        loaded: state.loaded,
                        total: state.total,
                      })}
                    </p>
                  </div>
                ) : (
                  <p className="mt-2 text-sm/6 text-gray-700">
                    {intl.formatMessage(messages.materialIndeterminate)}
                  </p>
                )
              ) : null}
              {state.kind === "Rejected" ? (
                <p
                  id={`local-file-error-${row.id}`}
                  className="mt-2 text-sm/6 text-red-700"
                >
                  {intl.formatMessage(
                    state.mismatch
                      ? messages.materialMismatch
                      : messages.materialError,
                  )}
                </p>
              ) : null}
              {"error" in state && state.error !== null ? (
                <TechnicalErrorDisclosure error={state.error} />
              ) : null}
              {state.kind === "Unknown abandonable" ? (
                <label className="mt-3 flex min-h-6 items-start gap-3 text-sm/6 text-gray-700">
                  <input
                    type="checkbox"
                    className="mt-1 size-4 accent-indigo-600"
                    checked={risks.has(row.id)}
                    onChange={(event) =>
                      setRisks((current) => {
                        const next = new Set(current);
                        if (event.target.checked) next.add(row.id);
                        else next.delete(row.id);
                        return next;
                      })
                    }
                  />
                  {intl.formatMessage(messages.materialDuplicateRisk)}
                </label>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-3" aria-describedby={labelId}>
              {state.kind === "Selected" ||
              state.kind === "Queued" ||
              state.kind === "Rejected" ||
              state.kind === "Uploaded" ? (
                <button
                  type="button"
                  aria-describedby={`${labelId} local-file-meta-${row.id}${state.kind === "Rejected" ? ` local-file-error-${row.id}` : ""}`}
                  className={materialActionClass}
                  onClick={() => remove(row)}
                >
                  {intl.formatMessage(messages.materialRemoveLocal)}
                </button>
              ) : null}
              {state.kind === "Uploading" || state.kind === "Verifying" ? (
                <button
                  type="button"
                  aria-describedby={`${labelId} local-file-meta-${row.id}`}
                  className={materialActionClass}
                  onClick={() => queue.stopWaiting()}
                >
                  {intl.formatMessage(messages.invitationsStopWaiting)}
                </button>
              ) : null}
              {state.kind === "Unknown abandonable" ? (
                <>
                  <button
                    type="button"
                    aria-describedby={`${labelId} local-file-meta-${row.id}`}
                    className={materialActionClass}
                    onClick={() => remove(row, true)}
                  >
                    {intl.formatMessage(messages.materialAbandon)}
                  </button>
                  <button
                    type="button"
                    aria-describedby={`${labelId} local-file-meta-${row.id}`}
                    className={materialActionClass}
                    disabled={!risks.has(row.id)}
                    onClick={() =>
                      queue.abandon(row.id, true, risks.has(row.id))
                    }
                  >
                    {intl.formatMessage(messages.materialNewUpload)}
                  </button>
                </>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
