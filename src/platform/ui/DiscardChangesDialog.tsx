import {
  Dialog,
  DialogBackdrop,
  DialogDescription,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { useIntl } from "react-intl";
import { messages } from "../i18n/messages";
import type { UnsavedInputDeparture } from "./routeDeparture";

// Tailwind Plus: Application UI > Overlays > Modal Dialogs > Simple alert,
// v4/react-light.jsx, library 2026-09-13-083323. MIA deltas: localized
// FRONTEND-STATE-MACHINES.md §18 Stay/Discard copy that never names the unsaved
// value; Stay is the autofocused safe action and Escape/backdrop equal Stay;
// no enter/leave transition, so Stay can return focus to the input at once;
// visible focus rings; actions wrap for long translations.
export function DiscardChangesDialog({
  departure,
  title,
  description,
}: {
  readonly departure: UnsavedInputDeparture;
  readonly title: string;
  readonly description: string;
}) {
  const intl = useIntl();
  return (
    <Dialog
      open={departure.asking}
      onClose={departure.stay}
      className="relative z-60"
    >
      <DialogBackdrop className="fixed inset-0 bg-gray-500/75" />
      <div className="fixed inset-0 z-60 w-screen overflow-y-auto">
        <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <DialogPanel className="relative overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left break-words shadow-xl sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
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
                  {title}
                </DialogTitle>
                <DialogDescription
                  as="p"
                  className="mt-2 text-sm text-gray-500"
                >
                  {description}
                </DialogDescription>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-3 sm:mt-4 sm:flex-row-reverse">
              <button
                type="button"
                onClick={departure.discard}
                className="inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-red-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 sm:w-auto"
              >
                {intl.formatMessage(messages.unsavedDiscard)}
              </button>
              <button
                type="button"
                data-autofocus
                onClick={departure.stay}
                className="inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs inset-ring-1 inset-ring-gray-300 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 sm:w-auto"
              >
                {intl.formatMessage(messages.unsavedStay)}
              </button>
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}
