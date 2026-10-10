import { useState, type RefObject } from "react";
import { useIntl } from "react-intl";
import { ChevronDownIcon } from "@heroicons/react/16/solid";
import { clsx } from "clsx";
import { messages } from "../../platform/i18n/messages";
import { locales, localeDisplayName } from "../../platform/i18n/locales";
import { useMiaI18n } from "../../platform/i18n/MiaIntlProvider";
import type { LocalFieldProblem } from "../../platform/ui/NewPasswordFields";
import {
  countryOptions,
  timeZoneOptions,
} from "../../platform/ui/accountProfileOptions";

// Tailwind Plus: Application UI > Forms > Form Layouts > Stacked; Input Groups >
// Input with label and help text / Input with validation error.
// Library 2026-09-13-083323, v4/react-light.jsx. MIA: required managed-student
// fields only, explicit blank choices, native selects, no supervisor defaults;
// gray-500/red-600 control outlines satisfy non-text contrast.
export function StudentUsername({
  inputRef,
  enabled,
  invalid,
  problem,
}: {
  readonly inputRef: RefObject<HTMLInputElement | null>;
  readonly enabled: boolean;
  readonly invalid: boolean;
  readonly problem: string | null;
}) {
  const intl = useIntl();
  return (
    <div>
      <label
        htmlFor="student-username"
        className="block text-sm/6 font-medium text-gray-900"
      >
        {intl.formatMessage(messages.loginUsername)}
      </label>
      <div className="mt-2">
        <input
          ref={inputRef}
          id="student-username"
          name="username"
          type="text"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          required
          readOnly={!enabled}
          aria-disabled={!enabled}
          aria-invalid={invalid}
          aria-describedby={clsx(
            "student-username-help student-status",
            problem !== null && "student-username-error",
          )}
          className={clsx(
            "block w-full rounded-md bg-white px-3 py-1.5 text-base outline-1 -outline-offset-1 focus:outline-2 focus:-outline-offset-2 sm:text-sm/6",
            invalid
              ? "text-red-900 outline-red-600 focus:outline-red-600"
              : "text-gray-900 outline-gray-500 focus:outline-indigo-600",
          )}
        />
      </div>
      <p id="student-username-help" className="mt-2 text-sm/6 text-gray-600">
        {intl.formatMessage(messages.invitationUsernameHelp)}
      </p>
      {problem === null ? null : (
        <p id="student-username-error" className="mt-2 text-sm text-red-600">
          {problem}
        </p>
      )}
    </div>
  );
}
export function StudentProfileFields({
  enabled,
  problems,
}: {
  readonly enabled: boolean;
  readonly problems: readonly LocalFieldProblem[];
}) {
  const intl = useIntl();
  const { locale } = useMiaI18n();
  const [zones] = useState(timeZoneOptions);
  const fields = [
    {
      id: "language",
      label: messages.invitationLanguageLabel,
      options: locales.map((code) => ({
        code,
        name: localeDisplayName(code, locale),
      })),
    },
    {
      id: "country",
      label: messages.invitationCountryLabel,
      options: countryOptions(intl.locale),
    },
    {
      id: "time_zone",
      label: messages.invitationTimeZoneLabel,
      options: zones.zones.map((code) => ({ code, name: code })),
    },
  ];
  return (
    <>
      {fields.map(({ id, label, options }) => {
        const problem =
          problems.find((entry) => entry.target === `student-${id}`)?.label ??
          null;
        const invalid = problem !== null;
        return (
          <div key={id}>
            <label
              htmlFor={`student-${id}`}
              className="block text-sm/6 font-medium text-gray-900"
            >
              {intl.formatMessage(label)}
            </label>
            <div className="mt-2 grid grid-cols-1">
              <select
                id={`student-${id}`}
                name={id}
                defaultValue=""
                required
                disabled={!enabled}
                {...(id === "country" ? { autoComplete: "off" } : {})}
                aria-invalid={invalid}
                aria-describedby={invalid ? `student-${id}-error` : undefined}
                className={clsx(
                  "col-start-1 row-start-1 w-full min-w-0 appearance-none rounded-md bg-white py-1.5 pr-8 pl-3 text-base outline-1 -outline-offset-1 focus:outline-2 focus:-outline-offset-2 sm:text-sm/6",
                  invalid
                    ? "text-red-900 outline-red-600 focus:outline-red-600"
                    : "text-gray-900 outline-gray-500 focus:outline-indigo-600",
                )}
              >
                <option value="">
                  {intl.formatMessage(messages.studentChoose)}
                </option>
                {options.map(({ code, name }) => (
                  <option key={code} value={code}>
                    {name}
                  </option>
                ))}
              </select>
              <ChevronDownIcon
                aria-hidden="true"
                className="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end text-gray-500 sm:size-4"
              />
            </div>
            {problem === null ? null : (
              <p
                id={`student-${id}-error`}
                className="mt-2 text-sm text-red-600"
              >
                {problem}
              </p>
            )}
          </div>
        );
      })}
    </>
  );
}
