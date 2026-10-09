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
      code: `import {catalogMessageIds as keys} from "../messages";\nconst values=${JSON.stringify(values)};\nexport default Object.fromEntries(keys.map((key,index)=>[key,values[index]]));`,
    };
  const overrides = values.flatMap((value, index) =>
    value === base[keys[index] ?? ""] ? [] : [[index, value] as const],
  );
  return {
    code: `import base from ${JSON.stringify(`./${baseName}`)};\nimport {catalogMessageIds as keys} from "../messages";\nexport default {...base,...Object.fromEntries(${JSON.stringify(overrides)}.map(([index,value])=>[keys[index],value]))};`,
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
    code: `import {defineMessages} from "react-intl";\nexport const messages=defineMessages(Object.fromEntries(${JSON.stringify(entries)}.map(([name,id,defaultMessage])=>[name,{id,defaultMessage}])));\nexport const catalogMessageIds=Object.values(messages).map(message=>message.id).sort();`,
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
