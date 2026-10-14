import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { Plugin } from "vite";

function readCatalog(path: string): Record<string, string> {
  const value: unknown = JSON.parse(readFileSync(path, "utf8"));
  if (typeof value !== "object" || value === null)
    throw new Error("Invalid message catalog.");
  const entries = Object.entries(value);
  if (
    !entries.every(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    )
  )
    throw new Error("Invalid message catalog entry.");
  return Object.fromEntries(entries);
}
// Public message strings have no unit-separator bytes. Joining a complete table
// removes repeated JSON entry punctuation without changing any ICU/message byte.
function packedStrings(values: readonly string[]): string {
  const separator = "\u001f";
  if (values.some((value) => value.includes(separator)))
    throw new Error("Catalog contains the packing separator.");
  return `${JSON.stringify(values.join(separator))}.split("\\x1f")`;
}

// Build-time compact value tables only: canonical catalogs remain complete.
// All strings survive; public keys are shared, switching stays synchronous.
export function messageCatalogModule(
  path: string,
  baseName: string | null,
): { readonly code: string } {
  const regional = readCatalog(path);
  const base = readCatalog(resolve(dirname(path), baseName ?? "en-US.json"));
  if (
    Object.keys(base).length !== Object.keys(regional).length ||
    Object.keys(base).some((key) => !(key in regional))
  )
    throw new Error("Regional catalog keys differ from the base catalog.");
  const keys = Object.keys(base).sort();
  const values = keys.map((key) => {
    const value = regional[key];
    if (value === undefined)
      throw new Error("Missing canonical catalog entry.");
    return value;
  });
  if (baseName === null)
    return {
      code: `import {catalogMessageIds as keys} from "../messages";\nconst values=${packedStrings(values)};\nexport default Object.fromEntries(keys.map((key,index)=>[key,values[index]]));`,
    };
  const overrides = values.flatMap((value, index) =>
    value === base[keys[index] ?? ""] ? [] : [[index, value] as const],
  );
  return {
    code: `import base from ${JSON.stringify(`./${baseName}`)};\nimport {catalogMessageIds as keys} from "../messages";\nconst indices=${JSON.stringify(overrides.map(([index]) => index))};\nconst values=${packedStrings(overrides.map(([, value]) => value))};\nexport default {...base,...Object.fromEntries(indices.map((index,position)=>[keys[index],values[position]]))};`,
  };
}

export function messageDescriptorModule(path: string): {
  readonly code: string;
} {
  // Bounded FFR-955 mitigation: pack public descriptors, not locale content.
  // Development keeps typed defineMessages; production reconstructs exactly
  // the same descriptors from triples, without repeated object property names.
  const source = readFileSync(path, "utf8");
  const catalog = readCatalog(resolve(dirname(path), "catalogs/en-US.json"));
  const entries = [...source.matchAll(/(\w+):\s*\{\s*id:\s*"([^"]+)"/gu)].map(
    (match) => [match[1], match[2], catalog[match[2] ?? ""]],
  );
  if (
    entries.length !== Object.keys(catalog).length ||
    entries.some((entry) => entry.some((value) => value === undefined))
  )
    throw new Error("Descriptor packing must preserve the complete catalog.");
  return {
    code: `import {defineMessages} from "react-intl";\nconst names=${packedStrings(entries.map((entry) => entry[0] ?? ""))};\nconst identities=${packedStrings(entries.map((entry) => entry[1] ?? ""))};\nconst defaults=${packedStrings(entries.map((entry) => entry[2] ?? ""))};\nexport const messages=defineMessages(Object.fromEntries(names.map((name,index)=>[name,{id:identities[index],defaultMessage:defaults[index]}])));\nexport const catalogMessageIds=Object.values(messages).map(message=>message.id).sort();`,
  };
}
export function compactMessageCatalogs(): Plugin {
  let root = "";
  return {
    name: "mia-message-catalogs",
    apply: "build",
    enforce: "post",
    configResolved(config) {
      root = config.root;
    },
    transform(_code, id) {
      if (id === resolve(root, "src/platform/i18n/messages.ts")) {
        return { ...messageDescriptorModule(id), map: null };
      }
      const pairs = [
        ["de-DE.json", null],
        ["fr-FR.json", null],
        ["es-ES.json", null],
        ["es-AR.json", "es-ES.json"],
        ["pt-PT.json", null],
        ["pt-BR.json", "pt-PT.json"],
      ] as const;
      const pair = pairs.find(
        ([regional]) =>
          id === resolve(root, "src/platform/i18n/catalogs", regional),
      );
      if (pair === undefined) return null;
      return { code: messageCatalogModule(id, pair[1]).code, map: null };
    },
  };
}

// The full catalog can itself fail to download. This tiny, canonical-derived
// subset remains in the entry so the selected language has a recovery screen.
export function bootstrapRecoveryCopy(
  root: string,
): Record<string, Record<string, string>> {
  const keys = [
    "route.unavailable",
    "route.loadFailed",
    "route.reload",
    "entry.invitation.preview.tryAgain",
    "entry.skipLink",
  ];
  return Object.fromEntries(
    ["en-US", "de-DE", "fr-FR", "pt-PT", "pt-BR", "es-ES", "es-AR"].map(
      (locale) => {
        const catalog = readCatalog(
          resolve(root, "src/platform/i18n/catalogs", `${locale}.json`),
        );
        return [
          locale,
          Object.fromEntries(
            keys.map((key) => {
              const text = catalog[key];
              if (text === undefined)
                throw new Error("Missing bootstrap recovery copy.");
              return [key, text];
            }),
          ),
        ];
      },
    ),
  );
}

export function localeRecoveryCopy(): Plugin {
  const id = "virtual:mia-locale-recovery";
  const resolved = `\0${id}`;
  let root = "";
  return {
    name: "mia-locale-recovery",
    configResolved(config) {
      root = config.root;
    },
    resolveId(source) {
      return source === id ? resolved : null;
    },
    load(source) {
      return source === resolved
        ? `export default ${JSON.stringify(bootstrapRecoveryCopy(root))};`
        : null;
    },
  };
}
