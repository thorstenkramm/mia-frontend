import type { Root as MdRoot, RootContent as MdContent } from "mdast";
import type { Root, Element, ElementContent, RootContent } from "hast";
import type { Plugin } from "unified";
import { gfmTable } from "micromark-extension-gfm-table";
import { gfmTableFromMarkdown } from "mdast-util-gfm-table";
import type {} from "remark-parse";
import rehypeKatex from "rehype-katex";
import { VFile } from "vfile";

declare module "hast" {
  interface ElementData {
    miaMath?: boolean;
    source?: string;
    failed?: boolean;
    display?: boolean;
    language?: unknown;
    tableSequence?: unknown;
    tableFallback?: boolean;
  }
}

// AD-6: table syntax only. No autolink, task/control, strike or raw-HTML plugin.
export const remarkTables: Plugin<[], MdRoot> = function () {
  const data = this.data();
  (data.micromarkExtensions ??= []).push(gfmTable());
  (data.fromMarkdownExtensions ??= []).push(gfmTableFromMarkdown());
};
export function safeHttps(source: string): string | null {
  const obfuscated = (text: string) =>
    /[\s\\]/u.test(text) ||
    [...text].some((point) => {
      const code = point.codePointAt(0) ?? 0;
      return code <= 31 || code === 127;
    });
  if (!/^https:\/\//iu.test(source) || obfuscated(source)) return null;
  try {
    const decoded = decodeURIComponent(source);
    if (obfuscated(decoded)) return null;
    const url = new URL(source);
    if (
      url.protocol !== "https:" ||
      url.username !== "" ||
      url.password !== "" ||
      url.hostname === ""
    )
      return null;
    return url.href;
  } catch {
    return null;
  }
}
function mdText(node: MdContent): string {
  if ("value" in node) return node.value;
  if ("children" in node) return node.children.map(mdText).join(" ");
  return "";
}
// Parsed math gets an owner-created wrapper. Input HTML is text before HAST exists;
// a fenced `math` language cannot stamp this provenance.
export const remarkContentPolicy: Plugin<[string], MdRoot> = function (source) {
  return (tree) => {
    const depths = new Set<number>();
    const collect = (nodes: readonly MdContent[]) => {
      for (const node of nodes) {
        if (node.type === "heading" && mdText(node).trim())
          depths.add(node.depth);
        if ("children" in node) collect(node.children);
      }
    };
    collect(tree.children);
    const ordered = [...depths].sort((a, b) => a - b);
    let table = 0;
    const clean = (nodes: readonly MdContent[]): MdContent[] =>
      nodes.map((node) => {
        if (node.type === "html") return { type: "text", value: node.value };
        if (node.type === "image")
          return { type: "text", value: `${node.alt ?? ""} (${node.url})` };
        if (node.type === "imageReference")
          return { type: "text", value: node.alt ?? "" };
        if (node.type === "heading") {
          const depth = 4 + ordered.indexOf(node.depth);
          if (!mdText(node).trim())
            return {
              type: "paragraph",
              children: [{ type: "text", value: mdText(node) }],
            };
          if (depth > 6)
            return {
              type: "paragraph",
              children: [
                {
                  type: "strong",
                  children: clean(node.children) as typeof node.children,
                },
              ],
            };
          return {
            ...node,
            depth: depth as 4 | 5 | 6,
            children: clean(node.children) as typeof node.children,
          };
        }
        if (node.type === "math" || node.type === "inlineMath") {
          const source = node.value;
          return {
            ...node,
            data: {
              hName: "span",
              hProperties: {
                dataMiaMath: source,
                dataMiaDisplay: node.type === "math",
              },
              hChildren: [
                {
                  type: "element",
                  tagName: "code",
                  properties: {
                    className: [
                      "language-math",
                      node.type === "math" ? "math-display" : "math-inline",
                    ],
                  },
                  children: [{ type: "text", value: source }],
                },
              ],
            },
          };
        }
        if (node.type === "code")
          return {
            ...node,
            data: {
              hProperties: {
                dataMiaCode: node.value,
                dataMiaLanguage: node.lang ?? "",
              },
            },
          };
        if (node.type === "table") {
          table++;
          const header = node.children[0];
          const width = header?.children.length ?? 0;
          if (
            width === 0 ||
            header?.children.some((cell) => !mdText(cell).trim()) ||
            node.children.some((row) => row.children.length !== width)
          ) {
            const start = node.position?.start.offset;
            const end = node.position?.end.offset;
            return {
              type: "paragraph",
              children: [
                {
                  type: "text",
                  value:
                    start === undefined || end === undefined
                      ? mdText(node)
                      : source.slice(start, end),
                },
              ],
              data: { hProperties: { dataMiaTableFallback: true } },
            };
          }
          return {
            ...node,
            data: { hProperties: { dataMiaTable: table } },
            children: clean(node.children) as typeof node.children,
          };
        }
        if ("children" in node)
          return { ...node, children: clean(node.children) } as MdContent;
        return node;
      });
    tree.children = clean(tree.children);
  };
};

const ordinary = new Set([
  "p",
  "h4",
  "h5",
  "h6",
  "strong",
  "em",
  "ul",
  "ol",
  "li",
  "blockquote",
  "br",
  "code",
  "pre",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "a",
]);
const mathTags = new Set([
  "math",
  "semantics",
  "mrow",
  "mi",
  "mn",
  "mo",
  "mtext",
  "mspace",
  "msup",
  "msub",
  "msubsup",
  "mfrac",
  "msqrt",
  "mroot",
  "munder",
  "mover",
  "munderover",
  "mtable",
  "mtr",
  "mtd",
  "menclose",
  "mpadded",
  "mstyle",
  "mmultiscripts",
  "mprescripts",
  "none",
]);
const mathProperties = new Set([
  "display",
  "mathvariant",
  "mathVariant",
  "stretchy",
  "fence",
  "separator",
  "accent",
  "accentunder",
  "largeop",
  "movablelimits",
  "columnalign",
  "rowalign",
  "columnspacing",
  "rowspacing",
  "linethickness",
  "notation",
  "width",
  "height",
  "depth",
  "lspace",
  "rspace",
  "minsize",
  "maxsize",
  "scriptlevel",
  "displaystyle",
]);
function textOf(node: RootContent): string {
  return node.type === "text" || node.type === "raw"
    ? node.value
    : node.type === "element"
      ? node.children.map(textOf).join("")
      : "";
}
function mathTree(node: RootContent): ElementContent[] {
  if (node.type === "text") return [{ type: "text", value: node.value }];
  if (node.type !== "element") return [];
  // Annotation contains raw TeX, not speech. Source is exposed separately.
  if (node.tagName === "annotation") return [];
  if (node.tagName === "span") return node.children.flatMap(mathTree);
  if (!mathTags.has(node.tagName))
    return [{ type: "text", value: textOf(node) }];
  const properties: Element["properties"] = {};
  for (const [key, value] of Object.entries(node.properties)) {
    if (
      mathProperties.has(key) &&
      (typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean") &&
      !/url|https?:|[<>]/iu.test(String(value))
    )
      properties[key] = value;
  }
  return [
    {
      type: "element",
      tagName: node.tagName,
      properties,
      children: node.children.flatMap(mathTree),
    },
  ];
}
function parsedMath(node: Element, source: string): Element {
  const display = node.properties.dataMiaDisplay === true;
  let failed =
    [...source].length > 4096 ||
    /\\(?:href|url|includegraphics|html\w*|def|gdef|edef|xdef|newcommand|renewcommand|let|global)\b/u.test(
      source,
    );
  let children: ElementContent[] = [];
  if (!failed) {
    const root: Root = { type: "root", children: node.children };
    const file = new VFile();
    const transform = rehypeKatex({
      output: "mathml",
      trust: false,
      strict: "error",
      maxExpand: 1000,
      maxSize: 20,
      macros: {},
    });
    transform(root, file);
    failed = file.messages.length > 0;
    if (!failed) children = root.children.flatMap(mathTree);
    // Error messages contain input. They never leave this owner or enter reporting.
    file.messages.length = 0;
  }
  return {
    type: "element",
    tagName: "span",
    properties: {},
    children,
    data: { miaMath: true, source, failed, display },
  };
}
// Rebuild fresh props after every plugin. Ordinary input has no MathML allowance.
export const rehypeContentPolicy: Plugin<[], Root> = function () {
  return (tree) => {
    const clean = (node: RootContent): ElementContent[] => {
      if (node.type === "text" || node.type === "raw")
        return [{ type: "text", value: node.value }];
      if (node.type !== "element") return [];
      if (
        node.tagName === "span" &&
        typeof node.properties.dataMiaMath === "string"
      )
        return [parsedMath(node, node.properties.dataMiaMath)];
      if (!ordinary.has(node.tagName))
        return [{ type: "text", value: textOf(node) }];
      const properties: Element["properties"] = {};
      const data: Element["data"] = {};
      if (node.tagName === "a") {
        const href =
          typeof node.properties.href === "string"
            ? safeHttps(node.properties.href)
            : null;
        if (href === null)
          return [
            {
              type: "text",
              value: `${textOf(node)} (${String(node.properties.href ?? "")})`,
            },
          ];
        properties.href = href;
      }
      if (
        node.tagName === "ol" &&
        typeof node.properties.start === "number" &&
        Number.isSafeInteger(node.properties.start) &&
        node.properties.start > 0
      )
        properties.start = node.properties.start;
      if (node.tagName === "th") properties.scope = "col";
      if (node.tagName === "table")
        data.tableSequence = node.properties.dataMiaTable;
      if (node.tagName === "p" && node.properties.dataMiaTableFallback === true)
        data.tableFallback = true;
      if (node.tagName === "pre") {
        const child = node.children[0];
        if (child?.type === "element") {
          data.source =
            typeof child.properties.dataMiaCode === "string"
              ? child.properties.dataMiaCode
              : textOf(child);
          data.language = child.properties.dataMiaLanguage;
        }
      }
      return [
        {
          type: "element",
          tagName: node.tagName,
          properties,
          data,
          children: node.children.flatMap(clean),
        },
      ];
    };
    tree.children = tree.children.flatMap(clean);
  };
};
