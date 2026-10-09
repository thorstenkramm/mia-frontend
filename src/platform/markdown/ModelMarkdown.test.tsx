import { randomUUID } from "node:crypto";
import {
  mkdtempSync,
  mkdirSync,
  copyFileSync,
  readdirSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { render, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AnnouncementProvider } from "../announcer/AnnouncementRegion";
import { MiaIntlProvider } from "../i18n/MiaIntlProvider";
import { ModelMarkdown } from "./ModelMarkdown";
import { safeHttps } from "./markdownPolicy";

beforeEach(() =>
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  ),
);
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
function content(text: string, partial = false) {
  return (
    <AnnouncementProvider>
      <MiaIntlProvider initialLocale="en-US">
        <ModelMarkdown text={text} context="Summary" partial={partial} />
      </MiaIntlProvider>
    </AnnouncementProvider>
  );
}
const attackInputs = [
  '<svg onload="alert(1)"><a href="javascript:alert(1)">x</a></svg>',
  '<math><mtext><img src="https://example.test/image" onerror="alert(1)"></mtext></math>',
  '<form id="location"><input name="cookie" autofocus></form><style>body{display:none}</style>',
  "![x](https://example.test/image) [x](javascript:alert%281%29)",
  "[x](https://user:secret@example.test/x)",
  "[x](//example.test/x)",
  "[x](data:text/html,x)",
  "$\\href{https://example.test}{x}$",
  "$\\includegraphics{https://example.test/x}$",
  "$\\def\\x{\\x}\\x$",
  "```math\n\\htmlClass{unsafe}{x}\n```",
  '<math><mtext><table><mglyph><style><!--</style><img title="--><img src=x onerror=alert(1)>">',
  '<a id="attributes" name="__proto__" href="https://example.test">x</a>',
  "[x](JaVaScRiPt:alert%281%29) [x](blob:https://example.test/id)",
  "[x](file:///private/path) [x](http://example.test) [x](ｊavascript:alert%281%29)",
  "[x](javascript&#58;alert%281%29) [x](%6aavascript:alert%281%29)",
  "[x](https://example.test/%0Apath) [x](https://example.test/\\path)",
];
it("locked content retains semantic headings lists tables code and explicit isolated links", () => {
  const text = `# ${randomUUID()}\n\n### Deeper\n\n- One\n- Two\n\n| A | B |\n| --- | --- |\n| 1 | 2 |\n\n[Reference](https://EXAMPLE.test/path)\n\nhttps://example.test/not-autolinked\n\n\`\`\`python\nprint(1)\n\`\`\``;
  const { container } = render(content(text));
  const link = container.querySelector("a");
  expect(
    container.querySelectorAll("h4").length === 1 &&
      container.querySelectorAll("h5").length === 1 &&
      container.querySelectorAll("li").length === 2 &&
      container.querySelectorAll('th[scope="col"]').length === 2 &&
      container.querySelector("caption")?.textContent === "Summary — table 1" &&
      container.querySelector("code")?.textContent === "print(1)" &&
      container.querySelectorAll("a").length === 1 &&
      link?.getAttribute("href") === "https://example.test/path" &&
      link?.getAttribute("target") === "_blank" &&
      link?.getAttribute("rel") === "noopener noreferrer" &&
      link?.getAttribute("referrerpolicy") === "no-referrer" &&
      link.textContent?.includes("Opens in a new tab"),
  ).toBe(true);
});
it("every adversarial chunk boundary remains inert and terminal input uses the same locked policy", () => {
  const { container, rerender } = render(content(""));
  for (const input of attackInputs) {
    for (let index = 0; index <= input.length; index++) {
      rerender(content(input.slice(0, index), true));
      expect(
        container.querySelector(
          "img,svg,math,form,input,style,script,iframe,video,audio,[onclick],[onerror],[id],[name]",
        ) === null,
      ).toBe(true);
    }
    rerender(content(input));
    // Trusted code-copy controls may exist; model-defined controls never do.
    expect(
      container.querySelector(
        "img,svg,form,input,style,script,iframe,video,audio,[onclick],[onerror],[id],[name]",
      ) === null && container.querySelectorAll("a").length === 0,
    ).toBe(true);
  }
});
it("math provenance accepts native semantics but rejects malformed oversized resource and macro expressions", () => {
  const { container, rerender } = render(
    content("$x^2 + \\frac{1}{2}$\n\n$$\n\\sqrt{\\frac{a}{b}}\n$$"),
  );
  expect(
    container.querySelectorAll("math").length === 2 &&
      container.querySelector("mi")?.textContent === "x" &&
      container.querySelector("math [style],math [class],math [id],svg") ===
        null,
  ).toBe(true);
  for (const source of [
    "\\unknowncommand{x}",
    "\\frac{",
    "x".repeat(4097),
    "\\htmlStyle{color:red}{x}",
    "\\def\\x{\\x}\\x",
  ]) {
    rerender(content(`$${source}$`));
    expect(
      container.querySelector("math") === null &&
        container.textContent?.includes(source) &&
        container.textContent.includes("full source follows"),
    ).toBe(true);
  }
  rerender(content("<math><mi>x</mi></math>"));
  expect(container.querySelector("math") === null).toBe(true);
});
it("malformed table dimensions and empty headings do not fabricate semantics", () => {
  const { container } = render(content("| | B |\n| --- | --- |\n| A |\n\n#\n"));
  expect(
    container.querySelector("table,h4,h5,h6") === null &&
      container.textContent?.includes("Table shown as linear text"),
  ).toBe(true);
});
it("uneven tables retain linear input and deep headings do not skip native levels", () => {
  const { container, rerender } = render(
    content("| A | B |\n| --- | --- |\n| A |\n"),
  );
  expect(
    container.querySelector("table") === null &&
      container.textContent?.includes("Table shown as linear text"),
  ).toBe(true);
  rerender(content("# First\n\n## Second\n\n#### Third\n\n###### Fourth"));
  expect(
    container.querySelectorAll("h4,h5,h6").length === 3 &&
      container.querySelector("p strong")?.textContent === "Fourth",
  ).toBe(true);
});
it("HTTPS parser rejects credentials controls encoded obfuscation and non-absolute schemes", () => {
  for (const source of [
    " javascript:alert(1)",
    "https://user@example.test",
    "https://example.test/%0A",
    "https://example.test/\\path",
    "http://example.test",
    "//example.test",
    "https%3A%2F%2Fexample.test",
    "https://example.test/ path",
    "https://example.test/%ZZ",
    "https://example.test/\u0000",
  ])
    expect(safeHttps(source) === null).toBe(true);
  expect(
    safeHttps("HTTPS://EXAMPLE.test/path") === "https://example.test/path",
  ).toBe(true);
});
it("explicit code copy uses exact source and denial gives a selectable fallback", async () => {
  const source = randomUUID();
  let copied: string | null = null;
  vi.stubGlobal("navigator", {
    clipboard: {
      writeText: async (text: string) => {
        copied = text;
      },
    },
  });
  const { container } = render(content(`\`\`\`text\n${source}\n\`\`\``));
  const button = container.querySelector("button");
  if (button === null) throw new Error("Code copy control missing.");
  fireEvent.click(button);
  await vi.waitFor(() => expect(copied === source).toBe(true));
  vi.stubGlobal("navigator", {
    clipboard: {
      writeText: async () => {
        throw new Error("clipboard-denied");
      },
    },
  });
  fireEvent.click(button);
  await vi.waitFor(() =>
    expect(container.textContent?.includes("copy manually")).toBe(true),
  );
});
it("architecture rejects parser plugins and math imports outside the single owner", () => {
  const root = mkdtempSync(join(tmpdir(), "mia-markdown-architecture-"));
  const directories = (source: string, target: string) => {
    mkdirSync(target, { recursive: true });
    for (const entry of readdirSync(source, { withFileTypes: true }))
      if (entry.isDirectory())
        directories(join(source, entry.name), join(target, entry.name));
  };
  try {
    directories("src", join(root, "src"));
    mkdirSync(join(root, "test"));
    copyFileSync("package.json", join(root, "package.json"));
    copyFileSync("index.html", join(root, "index.html"));
    const check = () =>
      spawnSync(process.execPath, [resolve("scripts/check-architecture.mjs")], {
        cwd: root,
        encoding: "utf8",
      });
    expect(check().status === 0).toBe(true);
    for (const library of [
      "react-markdown",
      "remark-math",
      "rehype-katex",
      "katex",
      "micromark-extension-gfm-table",
      "mdast-util-gfm-table",
    ]) {
      writeFileSync(
        join(root, "src/features/foreign.ts"),
        `import value from "${library}";`,
      );
      expect(check().status === 1).toBe(true);
    }
    rmSync(join(root, "src/features/foreign.ts"));
    writeFileSync(
      join(root, "src/platform/markdown/owned.ts"),
      'import value from "react-markdown";',
    );
    expect(check().status === 0).toBe(true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
