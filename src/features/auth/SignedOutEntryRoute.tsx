import { ChevronDownIcon } from "@heroicons/react/16/solid";
import { useState } from "react";
import { useIntl } from "react-intl";
import {
  isLocale,
  localeDisplayName,
  locales,
} from "../../platform/i18n/locales";
import { messages } from "../../platform/i18n/messages";
import { useMiaI18n } from "../../platform/i18n/MiaIntlProvider";
import {
  setTextSize,
  textSizes,
  type TextSize,
} from "../../platform/prefs/preferences";

const textSizeMessage = {
  standard: messages.textSizeStandard,
  large: messages.textSizeLarge,
  "extra-large": messages.textSizeExtraLarge,
} satisfies Record<TextSize, (typeof messages)[keyof typeof messages]>;

export default function SignedOutEntryRoute({
  initialTextSize,
  logoutConfirmed = false,
}: {
  initialTextSize: TextSize;
  logoutConfirmed?: boolean;
}) {
  const intl = useIntl();
  const { locale, changeLocale } = useMiaI18n();
  const [textSize, setCurrentTextSize] = useState(initialTextSize);

  function changeTextSize(nextTextSize: TextSize): void {
    setTextSize(nextTextSize);
    setCurrentTextSize(nextTextSize);
  }

  return (
    <>
      <p className="text-center text-sm/6 text-gray-600">
        {intl.formatMessage(
          logoutConfirmed
            ? messages.logoutConfirmedIntroduction
            : messages.introduction,
        )}
      </p>
      <div className="mt-8 bg-white px-6 py-12 shadow-sm sm:rounded-lg sm:px-12">
        <div className="space-y-8">
          <div>
            {/* Tailwind Plus: Application UI > Forms > Select Menus > Simple native */}
            {/* Library version: 2026-09-13-083323. Options are the seven launch locales. */}
            <label
              htmlFor="interface-language"
              className="block text-sm/6 font-medium text-gray-900"
            >
              {intl.formatMessage(messages.languageLabel)}
            </label>
            <div className="mt-2 grid grid-cols-1">
              <select
                id="interface-language"
                name="interface-language"
                value={locale}
                onChange={(event) => {
                  if (isLocale(event.target.value)) {
                    changeLocale(event.target.value);
                  }
                }}
                className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-1.5 pr-8 pl-3 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-indigo-600 sm:text-sm/6"
              >
                {locales.map((availableLocale) => (
                  <option key={availableLocale} value={availableLocale}>
                    {localeDisplayName(availableLocale, locale)}
                  </option>
                ))}
              </select>
              <ChevronDownIcon
                aria-hidden="true"
                className="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end text-gray-500 sm:size-4"
              />
            </div>
          </div>
          {/* Tailwind Plus: Application UI > Forms > Radio Groups > Simple inline list */}
          {/* Library version: 2026-09-13-083323. MIA enlarges the blueprint radio to the required 24px target. */}
          <fieldset>
            <legend className="text-sm/6 font-semibold text-gray-900">
              {intl.formatMessage(messages.textSizeLegend)}
            </legend>
            <p id="text-size-help" className="mt-1 text-sm/6 text-gray-600">
              {intl.formatMessage(messages.textSizeHelp)}
            </p>
            <div className="mt-6 space-y-4 sm:flex sm:items-center sm:space-y-0 sm:space-x-8">
              {textSizes.map((availableTextSize) => (
                <div key={availableTextSize} className="flex items-center">
                  <input
                    checked={textSize === availableTextSize}
                    id={`text-size-${availableTextSize}`}
                    name="text-size"
                    type="radio"
                    value={availableTextSize}
                    aria-describedby="text-size-help"
                    onChange={() => changeTextSize(availableTextSize)}
                    className="relative size-6 appearance-none rounded-full border border-gray-300 bg-white before:absolute before:inset-1.5 before:rounded-full before:bg-white not-checked:before:hidden checked:border-indigo-600 checked:bg-indigo-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 forced-colors:appearance-auto forced-colors:before:hidden"
                  />
                  <label
                    htmlFor={`text-size-${availableTextSize}`}
                    className="ml-3 block text-sm/6 font-medium text-gray-900"
                  >
                    {intl.formatMessage(textSizeMessage[availableTextSize])}
                  </label>
                </div>
              ))}
            </div>
          </fieldset>
        </div>
      </div>
    </>
  );
}
