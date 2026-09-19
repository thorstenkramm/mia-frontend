import js from "@eslint/js";
import importPlugin from "eslint-plugin-import";
import reactPlugin from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

const sourceFiles = ["src/**/*.{ts,tsx}"];

export default tseslint.config(
  {
    ignores: ["dist/", "node_modules/", "playwright-report/", "test-results/"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["scripts/**/*.{mjs,ts}"],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: sourceFiles,
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      import: importPlugin,
      react: reactPlugin,
      "react-hooks": reactHooks,
    },
    settings: {
      react: { version: "detect" },
    },
    rules: {
      "import/no-restricted-paths": [
        "error",
        {
          zones: [
            { target: "./src/platform", from: "./src/app" },
            { target: "./src/platform", from: "./src/features" },
            { target: "./src/features", from: "./src/app" },
          ],
        },
      ],
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@tanstack/react-query",
              message: "TanStack Query is owned by platform/data.",
            },
          ],
          patterns: [
            {
              group: ["@tanstack/react-query/*"],
              message: "TanStack Query is owned by platform/data.",
            },
          ],
        },
      ],
      "no-restricted-globals": [
        "error",
        {
          name: "localStorage",
          message: "Browser storage is owned by platform/prefs.",
        },
        {
          name: "sessionStorage",
          message: "Browser storage is owned by platform/prefs.",
        },
      ],
      "no-restricted-properties": [
        "error",
        {
          object: "window",
          property: "localStorage",
          message: "Browser storage is owned by platform/prefs.",
        },
        {
          object: "window",
          property: "sessionStorage",
          message: "Browser storage is owned by platform/prefs.",
        },
        {
          object: "globalThis",
          property: "localStorage",
          message: "Browser storage is owned by platform/prefs.",
        },
        {
          object: "globalThis",
          property: "sessionStorage",
          message: "Browser storage is owned by platform/prefs.",
        },
        {
          property: "innerHTML",
          message: "HTML string sinks are forbidden.",
        },
        {
          property: "outerHTML",
          message: "HTML string sinks are forbidden.",
        },
        {
          property: "insertAdjacentHTML",
          message: "HTML string sinks are forbidden.",
        },
      ],
      "react/no-danger": "error",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
  {
    files: ["src/platform/data/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": "off",
    },
  },
  {
    files: ["src/platform/prefs/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-globals": "off",
      "no-restricted-properties": "off",
    },
  },
  {
    files: sourceFiles,
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXAttribute[name.name='aria-live']",
          message: "Live regions are owned by platform/announcer.",
        },
        {
          selector:
            "JSXAttribute[name.name='role'][value.value=/^(alert|log|status)$/]",
          message: "Live-region roles are owned by platform/announcer.",
        },
        {
          selector:
            "JSXAttribute[name.name='role'] > JSXExpressionContainer > Literal[value=/^(alert|log|status)$/]",
          message: "Live-region roles are owned by platform/announcer.",
        },
      ],
    },
  },
  {
    files: ["src/platform/announcer/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": "off",
    },
  },
);
