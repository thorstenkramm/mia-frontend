import { useId, useRef, useState, type RefObject } from "react";
import { useIntl, type MessageDescriptor } from "react-intl";
import type {
  MaterialBrief,
  BriefError,
} from "../../platform/api/materialBrief";
import { messages } from "../../platform/i18n/messages";
import { materialActionClass } from "./MaterialRouteProps";
import { briefErrorText } from "./materialBriefFeedback";

// Tailwind Plus: Application UI > Forms > Form Layouts > Stacked; Textareas >
// Simple, 2026-09-13-083323, v4/react-light.jsx. MIA: structured, controlled,
// memory-only version-1 fields; stable local row keys, bounded native disclosures,
// nullable values preserved, no restoration/JSON editor; linked error targets.
const textClass =
  "mt-2 block w-full min-w-0 rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6";
function FieldErrors({
  field,
  invalid,
}: {
  field: string;
  invalid: readonly BriefError[];
}) {
  const intl = useIntl();
  return (
    <p id={`brief-${field}-error`} className="mt-1 text-sm/6 text-red-600">
      {invalid
        .filter((error) => error.field === field)
        .map((error) => briefErrorText(intl, error))
        .join(" ")}
    </p>
  );
}
export function BriefField({
  field,
  label,
  value,
  change,
  invalid,
  points,
  control,
  required = true,
}: {
  field: string;
  label: MessageDescriptor;
  value: string;
  change: (value: string) => void;
  invalid: readonly BriefError[];
  points: number;
  control?: RefObject<HTMLTextAreaElement | null>;
  required?: boolean;
}) {
  const intl = useIntl();
  const error = invalid.some((error) => error.field === field);
  return (
    <div className="min-w-0">
      <label
        htmlFor={`brief-${field}`}
        className="block text-sm/6 font-medium text-gray-900"
      >
        {intl.formatMessage(label)}
      </label>
      <p id={`brief-${field}-help`} className="mt-1 text-sm/6 text-gray-600">
        {required ? intl.formatMessage(messages.materialRequired) : null}{" "}
        {intl.formatMessage(messages.materialFieldLimits, {
          points,
          bytes: points * 4,
        })}
      </p>
      <textarea
        ref={control}
        id={`brief-${field}`}
        dir="auto"
        autoComplete="off"
        aria-required={required}
        rows={3}
        className={textClass}
        value={value}
        onChange={(event) => change(event.target.value)}
        aria-invalid={error || undefined}
        aria-describedby={`brief-${field}-help${error ? ` brief-${field}-error` : ""}`}
      />
      <FieldErrors field={field} invalid={invalid} />
    </div>
  );
}
function BriefRows({
  field,
  label,
  values,
  change,
  invalid,
  cap,
  points,
}: {
  field: string;
  label: MessageDescriptor;
  values: readonly string[] | null;
  change: (value: string[] | null) => void;
  invalid: readonly BriefError[];
  cap: number;
  points: number;
}) {
  const intl = useIntl();
  const prefix = useId();
  const sequence = useRef(values?.length ?? 0);
  const [keys, setKeys] = useState(() =>
    (values ?? []).map((_, index) => `${prefix}-${index}`),
  );
  if (keys.length !== (values?.length ?? 0))
    setKeys(
      (values ?? []).map(
        (_, index) => keys[index] ?? `${prefix}-${++sequence.current}`,
      ),
    );
  const add = () => {
    setKeys([...keys, `${prefix}-${++sequence.current}`]);
    change([...(values ?? []), ""]);
  };
  return (
    <fieldset
      id={`brief-${field}`}
      tabIndex={-1}
      aria-invalid={invalid.some((error) => error.field === field) || undefined}
      aria-describedby={`brief-${field}-error`}
      className="space-y-4 border-b border-gray-900/10 pb-6"
    >
      <legend className="text-base/7 font-semibold text-gray-900">
        {intl.formatMessage(label)}
      </legend>
      {field === "subjects" ? (
        <p>{intl.formatMessage(messages.materialMinimumItems, { limit: 1 })}</p>
      ) : null}
      <FieldErrors field={field} invalid={invalid} />
      {values === null ? (
        <p>{intl.formatMessage(messages.materialAbsent)}</p>
      ) : null}
      {(values ?? []).map((value, index) => (
        <div key={keys[index]} className="space-y-2">
          <BriefField
            field={`${field}.${index}`}
            label={label}
            value={value}
            points={points}
            invalid={invalid}
            change={(next) =>
              change(
                (values ?? []).map((item, position) =>
                  position === index ? next : item,
                ),
              )
            }
          />
          <button
            type="button"
            className={materialActionClass}
            aria-describedby={`brief-${field}.${index}`}
            onClick={() => {
              const next = keys[index + 1] ?? keys[index - 1];
              setKeys(keys.filter((_, position) => position !== index));
              change(
                (values ?? []).filter((_, position) => position !== index),
              );
              requestAnimationFrame(() => {
                const position = keys
                  .filter((_, current) => current !== index)
                  .indexOf(next ?? "");
                if (position >= 0)
                  document
                    .getElementById(`brief-${field}.${position}`)
                    ?.focus();
                else document.getElementById(`brief-${field}-add`)?.focus();
              });
            }}
          >
            {intl.formatMessage(messages.materialRemove)}
          </button>
        </div>
      ))}
      <button
        id={`brief-${field}-add`}
        type="button"
        className={materialActionClass}
        disabled={(values?.length ?? 0) >= cap}
        onClick={add}
      >
        {intl.formatMessage(messages.materialAdd)} — {intl.formatMessage(label)}
      </button>
    </fieldset>
  );
}
export function MaterialBriefFields({
  brief,
  change,
  invalid,
  control,
}: {
  brief: MaterialBrief;
  change: (value: MaterialBrief) => void;
  invalid: readonly BriefError[];
  control: RefObject<HTMLTextAreaElement | null>;
}) {
  const intl = useIntl();
  const prefix = useId();
  const sequence = useRef(brief.sections?.length ?? 0);
  const [keys, setKeys] = useState(() =>
    (brief.sections ?? []).map((_, index) => `${prefix}-${index}`),
  );
  if (keys.length !== (brief.sections?.length ?? 0))
    setKeys(
      (brief.sections ?? []).map(
        (_, index) => keys[index] ?? `${prefix}-${++sequence.current}`,
      ),
    );
  const setSections = (sections: NonNullable<MaterialBrief["sections"]>) =>
    change({
      ...brief,
      sections: sections.map((section, index) => ({
        ...section,
        sequence: index + 1,
      })),
    });
  return (
    <div className="space-y-8">
      <BriefField
        field="summary"
        label={messages.materialSummary}
        value={brief.summary}
        points={4000}
        change={(summary) => change({ ...brief, summary })}
        invalid={invalid}
        control={control}
      />
      <BriefRows
        field="subjects"
        label={messages.materialSubjects}
        values={brief.subjects}
        cap={20}
        points={100}
        change={(subjects) => change({ ...brief, subjects: subjects ?? [] })}
        invalid={invalid}
      />
      <BriefRows
        field="learning_goals"
        label={messages.materialLearningGoals}
        values={brief.learning_goals}
        cap={30}
        points={300}
        change={(learning_goals) => change({ ...brief, learning_goals })}
        invalid={invalid}
      />
      <section
        id="brief-sections"
        tabIndex={-1}
        className="space-y-4 border-b border-gray-900/10 pb-6"
      >
        <h3 className="text-base/7 font-semibold text-gray-900">
          {intl.formatMessage(messages.materialSections)}
        </h3>
        <FieldErrors field="sections" invalid={invalid} />
        {brief.sections === null ? (
          <p>{intl.formatMessage(messages.materialAbsent)}</p>
        ) : null}
        {(brief.sections ?? []).map((section, index) => (
          <details key={keys[index]} className="space-y-4">
            <summary className="min-h-6 cursor-pointer py-2 wrap-anywhere">
              {intl.formatMessage(messages.materialSections)} {section.sequence}{" "}
              — <bdi>{section.title}</bdi>
            </summary>
            {(
              [
                ["label", messages.materialSectionLabel, 100],
                ["title", messages.materialSectionTitle, 200],
                ["description", messages.materialSectionDescription, 500],
              ] as const
            ).map(([field, label, points]) => (
              <BriefField
                key={field}
                field={`sections.${index}.${field}`}
                label={label}
                points={points}
                value={section[field] ?? ""}
                invalid={invalid}
                required={field !== "label"}
                change={(value) =>
                  setSections(
                    (brief.sections ?? []).map((item, position) =>
                      position === index
                        ? {
                            ...item,
                            [field]:
                              field === "label" && value === "" ? null : value,
                          }
                        : item,
                    ),
                  )
                }
              />
            ))}
            <BriefRows
              field={`sections.${index}.search_terms`}
              label={messages.materialSearchTerms}
              values={section.search_terms}
              cap={10}
              points={50}
              invalid={invalid}
              change={(search_terms) =>
                setSections(
                  (brief.sections ?? []).map((item, position) =>
                    position === index ? { ...item, search_terms } : item,
                  ),
                )
              }
            />
            <button
              type="button"
              className={materialActionClass}
              onClick={() => {
                setKeys(keys.filter((_, position) => position !== index));
                setSections(
                  (brief.sections ?? []).filter(
                    (_, position) => position !== index,
                  ),
                );
                requestAnimationFrame(() =>
                  document.getElementById("brief-sections-add")?.focus(),
                );
              }}
            >
              {intl.formatMessage(messages.materialRemove)} —{" "}
              {intl.formatMessage(messages.materialSections)} {section.sequence}
            </button>
          </details>
        ))}
        <button
          id="brief-sections-add"
          type="button"
          className={materialActionClass}
          disabled={(brief.sections?.length ?? 0) >= 500}
          onClick={() => {
            setKeys([...keys, `${prefix}-${++sequence.current}`]);
            setSections([
              ...(brief.sections ?? []),
              {
                sequence: 1,
                label: null,
                title: "",
                description: "",
                search_terms: null,
              },
            ]);
          }}
        >
          {intl.formatMessage(messages.materialAdd)} —{" "}
          {intl.formatMessage(messages.materialSections)}
        </button>
      </section>
      <BriefRows
        field="warnings"
        label={messages.materialWarnings}
        values={brief.warnings}
        cap={20}
        points={500}
        change={(warnings) => change({ ...brief, warnings })}
        invalid={invalid}
      />
      <BriefField
        field="educational_level"
        required={false}
        label={messages.materialLevel}
        value={brief.educational_level ?? ""}
        points={100}
        change={(value) =>
          change({ ...brief, educational_level: value === "" ? null : value })
        }
        invalid={invalid}
      />
    </div>
  );
}
