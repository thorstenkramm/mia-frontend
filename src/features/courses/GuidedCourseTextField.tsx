import clsx from "clsx";
import { useIntl } from "react-intl";
import type { RefObject } from "react";
import type { CourseTeachingField } from "../../platform/api/courses";
import { messages } from "../../platform/i18n/messages";
import { courseTeachingFields, courseTextCounts } from "./courseTeachingFields";

// Tailwind Plus: Application UI > Forms > Textareas > Simple; Input Groups >
// Input with label and help text / Input with validation error.
// Library 2026-09-13-083323, v4/react-light.jsx. MIA: controlled plain text;
// native example/preview details, associated counts/error; gray-500/red-600
// boundaries meet 3:1 unfocused contrast instead of blueprint gray/red-300.
export function GuidedCourseTextField({
  field,
  value,
  change,
  control,
  locked,
  invalid,
  error,
  language,
}: {
  readonly field: CourseTeachingField;
  readonly value: string;
  readonly change: (value: string) => void;
  readonly control: RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
  readonly locked: boolean;
  readonly invalid: boolean;
  readonly error: string | null;
  readonly language: string | null;
}) {
  const intl = useIntl();
  const descriptor = courseTeachingFields[field];
  const classes = clsx(
    "block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6",
    invalid ? "outline-red-600" : "outline-gray-500",
  );
  const props = {
    id: "teaching-field",
    name: "teaching-field",
    value,
    readOnly: locked,
    autoComplete: "off",
    "aria-invalid": invalid,
    "aria-describedby": invalid
      ? "teaching-help teaching-count teaching-error"
      : "teaching-help teaching-count",
    className: classes,
    dir: "auto" as const,
    onChange: (
      event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => change(event.target.value),
  };
  return (
    <>
      <label
        htmlFor="teaching-field"
        className="block text-sm/6 font-medium text-gray-900"
      >
        {intl.formatMessage(descriptor.label)}
      </label>
      <div className="mt-2">
        {field === "language" ? (
          <input
            {...props}
            type="text"
            ref={(node) => {
              control.current = node;
            }}
            dir="ltr"
          />
        ) : (
          <textarea
            {...props}
            rows={8}
            ref={(node) => {
              control.current = node;
            }}
          />
        )}
      </div>
      <p id="teaching-help" className="mt-2 text-sm/6 text-gray-700">
        {field === "language"
          ? intl.formatMessage(messages.preparationLanguageHelp)
          : intl.formatMessage(messages.preparationTextHelp, {
              points: descriptor.points,
              bytes: descriptor.bytes,
            })}
      </p>
      <p id="teaching-count" className="mt-2 text-sm/6 text-gray-700">
        {intl.formatMessage(
          messages.preparationCounts,
          courseTextCounts(value),
        )}
      </p>
      {invalid && error !== null ? (
        <p id="teaching-error" className="mt-2 text-sm/6 text-red-700">
          {error}
        </p>
      ) : null}
      {field === "learningGoals" || field === "instructions" ? (
        <p className="mt-3 text-sm/6 text-gray-700">
          {intl.formatMessage(messages.preparationPrivacy)}
        </p>
      ) : null}
      <details className="mt-4 text-sm/6 text-gray-700">
        <summary className="min-h-6 cursor-pointer rounded-md py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
          {intl.formatMessage(messages.preparationExample)}
        </summary>
        <p className="mt-2" dir="auto">
          {intl.formatMessage(descriptor.example)}
        </p>
      </details>
      <details className="mt-4 text-sm/6 text-gray-700">
        <summary className="min-h-6 cursor-pointer rounded-md py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
          {intl.formatMessage(messages.preparationPreview)}
        </summary>
        <pre
          className="mt-2 max-w-full font-sans whitespace-pre-wrap wrap-anywhere"
          dir="auto"
          lang={language ?? undefined}
        >
          {value}
        </pre>
      </details>
    </>
  );
}
