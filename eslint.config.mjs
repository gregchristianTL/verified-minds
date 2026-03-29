import unusedImports from "eslint-plugin-unused-imports";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import tseslint from "typescript-eslint";
import nextPlugin from "@next/eslint-plugin-next";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import jsxA11yPlugin from "eslint-plugin-jsx-a11y";
import jsdocPlugin from "eslint-plugin-jsdoc";

const eslintConfig = [
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "public/**",
      "drizzle/**",
    ],
  },

  {
    plugins: {
      "@next/next": nextPlugin,
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
      "jsx-a11y": jsxA11yPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      "react/react-in-jsx-scope": "off",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      ...jsxA11yPlugin.flatConfigs.recommended.rules,
      "jsx-a11y/no-autofocus": "off",
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-alert": "warn",
      "no-debugger": "error",
      "prefer-const": "error",
      "no-var": "error",
      eqeqeq: ["error", "always", { null: "ignore" }],
      "no-throw-literal": "error",
      "max-lines": [
        "error",
        { max: 400, skipBlankLines: true, skipComments: true },
      ],
      "max-lines-per-function": [
        "error",
        { max: 150, skipBlankLines: true, skipComments: true },
      ],
    },
    settings: {
      react: {
        version: "detect",
      },
    },
  },

  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: ["**/*.ts", "**/*.tsx"],
  })),
  {
    files: ["**/*.ts", "**/*.tsx"],
    plugins: {
      "unused-imports": unusedImports,
      "simple-import-sort": simpleImportSort,
      jsdoc: jsdocPlugin,
    },
    rules: {
      "jsdoc/require-jsdoc": [
        "warn",
        {
          publicOnly: false,
          require: {
            FunctionDeclaration: true,
            FunctionExpression: true,
            ArrowFunctionExpression: true,
            ClassDeclaration: true,
            MethodDefinition: true,
          },
          contexts: [
            "TSInterfaceDeclaration",
            "TSTypeAliasDeclaration",
            "TSEnumDeclaration",
          ],
        },
      ],
      "jsdoc/require-param": "warn",
      "jsdoc/require-param-description": "warn",
      "jsdoc/require-returns": "warn",
      "jsdoc/require-returns-description": "warn",
      "jsdoc/check-param-names": "warn",
      "jsdoc/check-tag-names": ["warn", { typed: true }],
      "jsdoc/check-types": "warn",
      "jsdoc/no-types": "warn",
      "simple-import-sort/imports": "warn",
      "simple-import-sort/exports": "warn",
      "@typescript-eslint/no-unused-vars": "off",
      "unused-imports/no-unused-imports": "warn",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_|^err|^error|^e$",
        },
      ],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/ban-ts-comment": [
        "error",
        {
          "ts-expect-error": "allow-with-description",
          "ts-ignore": "allow-with-description",
          "ts-nocheck": true,
          "ts-check": false,
          minimumDescriptionLength: 10,
        },
      ],
      "@typescript-eslint/no-empty-function": "off",
      "@typescript-eslint/no-non-null-assertion": "warn",
      "@typescript-eslint/no-empty-interface": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-unused-expressions": "off",
      "no-unused-vars": "off",
    },
  },

  {
    files: ["scripts/**/*.ts", "*.config.ts", "*.config.mjs", "tests/**/*.ts"],
    rules: {
      "no-console": "off",
      "jsdoc/require-jsdoc": "off",
    },
  },
];

export default eslintConfig;
