import Markdown from "react-markdown";
import remarkMath from "remark-math";
import { useIntl } from "react-intl";
import { messages } from "../i18n/messages";
import { MarkdownCode } from "./MarkdownCode";
import { MarkdownMath } from "./MarkdownMath";
import { MarkdownTable } from "./MarkdownTable";
import {
  remarkTables,
  remarkContentPolicy,
  rehypeContentPolicy,
  safeHttps,
} from "./markdownPolicy";

// AD-6 public boundary. No consumer configuration, props spreading or HTML sink.
// Partial input is wholly escaped; terminal input reparses the entire source.
export function ModelMarkdown({
  text,
  context,
  partial = false,
}: {
  text: string;
  context: string;
  partial?: boolean;
}) {
  const intl = useIntl();
  if (partial)
    return (
      <div dir="auto" className="whitespace-pre-wrap wrap-anywhere">
        {text}
      </div>
    );
  return (
    <div dir="auto" className="min-w-0 space-y-3 text-sm/6 wrap-anywhere">
      <Markdown
        remarkPlugins={[remarkTables, remarkMath, [remarkContentPolicy, text]]}
        rehypePlugins={[rehypeContentPolicy]}
        urlTransform={(url) => safeHttps(url) ?? ""}
        components={{
          a: ({ children, href }) => {
            const destination = href === undefined ? null : safeHttps(href);
            if (destination === null) return <span>{children}</span>;
            return (
              <a
                href={destination}
                target="_blank"
                rel="noopener noreferrer"
                referrerPolicy="no-referrer"
                className="text-indigo-600 underline wrap-anywhere"
              >
                {children} —{" "}
                <bdi dir="ltr">
                  {new URL(destination).hostname} · {destination}
                </bdi>{" "}
                ({intl.formatMessage(messages.markdownExternal)})
              </a>
            );
          },
          p: ({ children, node }) => (
            <p>
              {node?.data?.tableFallback ? (
                <span>
                  {intl.formatMessage(messages.markdownTableFallback)}:{" "}
                </span>
              ) : null}
              {children}
            </p>
          ),
          pre: ({ node }) => (
            <MarkdownCode
              source={
                typeof node?.data?.source === "string" ? node.data.source : ""
              }
              language={
                typeof node?.data?.language === "string"
                  ? node.data.language
                  : ""
              }
            />
          ),
          span: ({ children, node }) =>
            node?.data?.miaMath === true ? (
              <MarkdownMath
                source={
                  typeof node.data.source === "string" ? node.data.source : ""
                }
                failed={node.data.failed === true}
              >
                {children}
              </MarkdownMath>
            ) : (
              <span>{children}</span>
            ),
          table: ({ children, node }) => (
            <MarkdownTable
              label={intl.formatMessage(messages.markdownTable, {
                context,
                sequence:
                  typeof node?.data?.tableSequence === "number"
                    ? node.data.tableSequence
                    : 1,
              })}
            >
              {children}
            </MarkdownTable>
          ),
          th: ({ children }) => <th scope="col">{children}</th>,
        }}
      >
        {text}
      </Markdown>
    </div>
  );
}
