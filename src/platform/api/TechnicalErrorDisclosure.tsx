import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
} from "@headlessui/react";
import { MinusSmallIcon, PlusSmallIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { useIntl } from "react-intl";
import { useAnnouncer } from "../announcer/AnnouncementRegion";
import { messages } from "../i18n/messages";
import { UserText } from "../markdown/UserText";
import type { ApiFailure } from "./client";

type CopyFeedback =
  | { readonly kind: "idle" }
  | { readonly kind: "copied" }
  | { readonly kind: "failed" };

export function TechnicalErrorDisclosure({ error }: { error: ApiFailure }) {
  const intl = useIntl();
  const { announce } = useAnnouncer();
  const [copyFeedback, setCopyFeedback] = useState<CopyFeedback>({
    kind: "idle",
  });

  if (error.kind !== "http") {
    return null;
  }

  async function copyTechnicalDetails(body: string): Promise<void> {
    try {
      if (navigator.clipboard === undefined) {
        throw new Error("Clipboard API unavailable.");
      }
      await navigator.clipboard.writeText(body);
      setCopyFeedback({ kind: "copied" });
      announce(intl.formatMessage(messages.copySuccess));
    } catch {
      setCopyFeedback({ kind: "failed" });
      announce(intl.formatMessage(messages.copyFailure));
    }
  }

  return (
    <Disclosure as="div" className="mt-3 text-left text-sm text-gray-700">
      {/* Tailwind Plus: Marketing > Page Sections > FAQs > Centered accordion */}
      {/* Library version: 2026-09-13-083323. MIA uses one disclosure, retains its 28px icon row, and adds focus styling. */}
      <DisclosureButton className="group flex min-h-7 w-full items-start justify-between text-left font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
        <span>{intl.formatMessage(messages.technicalDetails)}</span>
        <span className="ml-6 flex h-7 items-center">
          <PlusSmallIcon
            aria-hidden="true"
            className="size-6 group-data-open:hidden"
          />
          <MinusSmallIcon
            aria-hidden="true"
            className="size-6 group-not-data-open:hidden"
          />
        </span>
      </DisclosureButton>
      <DisclosurePanel className="mt-2 pr-12">
        <p>
          {intl.formatMessage(messages.httpStatus, {
            status: error.disclosure.status,
          })}
        </p>
        <pre
          className="isolate mt-2 max-w-full whitespace-pre-wrap break-words font-mono text-xs [overflow-wrap:anywhere]"
          dir="ltr"
        >
          <UserText text={error.disclosure.body} />
        </pre>
        <p className="mt-3">{intl.formatMessage(messages.copyWarning)}</p>
        {/* Tailwind Plus: Application UI > Elements > Buttons > Secondary buttons */}
        {/* Library version: 2026-09-13-083323. MIA adds visible focus and clipboard-result handling. */}
        <button
          type="button"
          className="mt-3 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          onClick={() => void copyTechnicalDetails(error.disclosure.body)}
        >
          {intl.formatMessage(messages.copyTechnicalDetails)}
        </button>
        {copyFeedback.kind === "failed" ? (
          <p className="mt-2 font-medium">
            {intl.formatMessage(messages.copyManualFallback)}
          </p>
        ) : null}
      </DisclosurePanel>
    </Disclosure>
  );
}
