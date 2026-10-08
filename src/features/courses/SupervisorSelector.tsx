import { useId, type RefObject } from "react";
import { useIntl } from "react-intl";
import type {
  SupervisorCandidate,
  SupervisorCandidatePage,
} from "../../platform/api/administrationAccounts";
import { messages } from "../../platform/i18n/messages";
import {
  CourseEmpty,
  CoursePagination,
  courseActionClass,
} from "./CourseListRoute";

// Tailwind Plus: Application UI > Forms > Checkboxes > List with description;
// Navigation > Pagination > Simple card footer (CoursePagination).
// Library 2026-09-13-083323, v4/react-light.jsx. MIA: visible required legend,
// native controlled checkboxes, active registered candidates only, wrapped bdi
// labels and 24px label target; decorative check aria-hidden. Selection is not
// authoritative assignment eligibility. Selected labels remain in this form only.
// Accessibility delta (DESIGN colors / WCAG 1.4.11): enabled unchecked borders
// use inherited gray-500 rather than blueprint gray-300 for >=3:1 on white.
// Invalid selection exposes aria-invalid plus the corrective description on
// the native group and its controls; color is never the error's sole indication.
// Remove selection uses Elements > Buttons > Secondary buttons (px-3 py-2),
// with the shared visible focus ring and name association, including off-page selections.
export function SupervisorSelector({
  page,
  selected,
  busy,
  error,
  headingRef,
  choose,
  load,
}: {
  readonly page: SupervisorCandidatePage;
  readonly selected: readonly SupervisorCandidate[];
  readonly busy: boolean;
  readonly error: string | null;
  readonly headingRef: RefObject<HTMLLegendElement | null>;
  readonly choose: (candidate: SupervisorCandidate, checked: boolean) => void;
  readonly load: (offset: number) => void;
}) {
  const intl = useIntl();
  const id = useId();
  return (
    <fieldset
      disabled={busy}
      aria-invalid={error !== null || undefined}
      aria-describedby={`${id}-help${error === null ? "" : ` ${id}-error`}`}
    >
      <legend
        ref={headingRef}
        tabIndex={-1}
        className="text-sm/6 font-medium text-gray-900"
      >
        {intl.formatMessage(messages.coursesSupervisors)}
      </legend>
      <p id={`${id}-help`} className="mb-4 text-sm/6 text-gray-700">
        {intl.formatMessage(messages.coursesSupervisorHelp)}
      </p>
      {error ? (
        <p id={`${id}-error`} className="mb-4 text-sm/6 text-red-600">
          {error}
        </p>
      ) : null}
      <div className="space-y-5">
        {page.candidates.map((candidate) => (
          <div key={candidate.id} className="flex gap-3">
            <div className="flex h-6 shrink-0 items-center">
              <div className="group grid size-4 grid-cols-1">
                <input
                  id={`${id}-${candidate.id}`}
                  name="supervisors"
                  type="checkbox"
                  aria-invalid={error !== null || undefined}
                  aria-describedby={`${id}-help${error === null ? "" : ` ${id}-error`}`}
                  checked={selected.some(
                    (choice) => choice.id === candidate.id,
                  )}
                  onChange={(event) => choose(candidate, event.target.checked)}
                  className="col-start-1 row-start-1 appearance-none rounded-sm border border-gray-500 bg-white checked:border-indigo-600 checked:bg-indigo-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:border-gray-300 disabled:bg-gray-100 forced-colors:appearance-auto"
                />
                <svg
                  aria-hidden="true"
                  fill="none"
                  viewBox="0 0 14 14"
                  className="pointer-events-none col-start-1 row-start-1 size-3.5 self-center justify-self-center stroke-white"
                >
                  <path
                    d="M3 8L6 11L11 3.5"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="opacity-0 group-has-checked:opacity-100"
                  />
                </svg>
              </div>
            </div>
            <div className="min-w-0 text-sm/6">
              <label
                htmlFor={`${id}-${candidate.id}`}
                className="inline-block min-h-6 font-medium text-gray-900 wrap-anywhere"
              >
                <bdi>{candidate.username}</bdi>
              </label>
            </div>
          </div>
        ))}
      </div>
      {page.candidates.length === 0 ? (
        <CourseEmpty text={intl.formatMessage(messages.coursesNoCandidates)} />
      ) : null}
      <CoursePagination page={page} busy={busy} load={load} />
      {selected.length ? (
        <div className="mt-4 text-sm/6 text-gray-700">
          <p>{intl.formatMessage(messages.coursesSelected)}</p>
          <ul>
            {selected.map((candidate) => (
              <li
                key={candidate.id}
                className="flex flex-wrap items-center gap-3 wrap-anywhere"
              >
                <bdi id={`${id}-selected-${candidate.id}`}>
                  {candidate.username}
                </bdi>
                <button
                  type="button"
                  aria-describedby={`${id}-selected-${candidate.id}`}
                  onClick={() => choose(candidate, false)}
                  className={courseActionClass}
                >
                  {intl.formatMessage(messages.coursesRemoveSelection)}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </fieldset>
  );
}
