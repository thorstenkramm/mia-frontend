import { useState } from "react";
import { useIntl } from "react-intl";
import { useAnnouncer } from "../announcer/AnnouncementRegion";
import { messages } from "../i18n/messages";
// DESIGN native selectable code primitive; trusted copy control, no model props.
export function MarkdownCode({
  source,
  language,
}: {
  source: string;
  language: string;
}) {
  const intl = useIntl();
  const { announce } = useAnnouncer();
  const [feedback, setFeedback] = useState<string | null>(null);
  const recognized = [
    "javascript",
    "typescript",
    "python",
    "go",
    "json",
    "text",
    "sql",
    "bash",
    "html",
    "css",
  ].includes(language)
    ? language
    : "";
  const copy = async () => {
    let result: string;
    try {
      if (!navigator.clipboard) throw new Error("clipboard-unavailable");
      await navigator.clipboard.writeText(source);
      result = intl.formatMessage(messages.markdownCopied);
    } catch {
      result = intl.formatMessage(messages.markdownCopyDenied);
    }
    setFeedback(result);
    announce(result);
  };
  return (
    <div>
      <p>
        {intl.formatMessage(messages.markdownCode)} {recognized}
      </p>
      <pre dir="ltr" className="whitespace-pre-wrap wrap-anywhere">
        <code>{source}</code>
      </pre>
      <button
        type="button"
        className="min-h-6 rounded-md px-3 py-2 text-indigo-600 focus-visible:outline-2 focus-visible:outline-indigo-600"
        onClick={() => void copy()}
      >
        {intl.formatMessage(messages.markdownCopy)}
      </button>
      {feedback === null ? null : <p>{feedback}</p>}
    </div>
  );
}
