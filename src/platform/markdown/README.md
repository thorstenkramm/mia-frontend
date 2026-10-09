# Locked rich-content boundary

`ModelMarkdown` is the sole AD-6 public renderer. Consumers pass text, a trusted context label, and optional `partial`.
No consumer supplies parser options, plugins, HTML, element properties, or sanitizer exceptions.
`UserText` renders escaped, direction-isolated inline text.

## Policy

The parser enables only table syntax and local math. Raw HTML and image nodes become inert text before HAST conversion.
The final AST pass reconstructs ordinary content with an explicit tag/property allowlist. Heading ranks begin at h4;
deep headings become strong paragraphs. Valid tables retain column headers and a localized caption; malformed tables
become labelled linear text. Code stays selectable and wraps. Explicit code copy has single-owner concise feedback.

Only parsed absolute HTTPS links without credentials or obfuscation become interactive. Links expose the normalized
ASCII host, full destination and visible new-tab disclosure, with no opener or referrer. Nothing previews or fetches them.

Parsed math nodes alone stamp provenance for the locked KaTeX pipeline. Native generated MathML is reconstructed through
a separate semantic allowlist. Input MathML is never admitted. HTML/resource and macro commands, oversized expressions
and parse failures show full escaped source. Error bodies and generator messages never leave this owner. No fonts,
remote resources, HTML sink, user macros or generator styles are needed.

Partial input is completely escaped. Terminal input reparses the entire string through the same policy. This boundary
does not implement streams, authorization, provider calls, persistence or live announcements of protected text.

## Evidence

`ModelMarkdown.test.tsx` covers semantics, every attack-prefix boundary, isolated links, code copy, generated math and
architecture ownership. `e2e/markdownBoundary.spec.ts` exercises the boundary in an authorized material preview using
local protocol fakes. Supported-browser and assistive-technology manual acceptance remains a separate release obligation.
