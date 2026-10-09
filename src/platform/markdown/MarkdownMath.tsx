import type { ReactNode } from "react";
import { useIntl } from "react-intl";
import { messages } from "../i18n/messages";
import { useContainedOverflow } from "./MarkdownTable";
// DESIGN native generated-only MathML primitive, selectable TeX, no remote assets.
export function MarkdownMath({
  children,
  source,
  failed,
}: {
  children: ReactNode;
  source: string;
  failed: boolean;
}) {
  const intl = useIntl();
  const { region, overflow } = useContainedOverflow<HTMLSpanElement>(children);
  return (
    <span
      ref={region}
      className="inline-block max-w-full overflow-x-auto align-middle wrap-anywhere"
      role={overflow ? "region" : undefined}
      aria-label={
        overflow ? intl.formatMessage(messages.markdownMathSource) : undefined
      }
      tabIndex={overflow ? 0 : undefined}
    >
      {failed ? (
        <span>{intl.formatMessage(messages.markdownMathFailed)} </span>
      ) : (
        children
      )}
      <span className="block">
        {intl.formatMessage(messages.markdownMathSource)}:{" "}
        <code dir="ltr" className="whitespace-pre-wrap wrap-anywhere">
          {source}
        </code>
      </span>
    </span>
  );
}
