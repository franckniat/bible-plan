import { builtinModules } from "node:module"

import { config } from "@workspace/eslint-config/base"

// @workspace/core must stay pure so it can run on the server, in the browser
// and in the future React Native app: no Node.js, framework, database or DOM.
const forbiddenModules = [
  ...builtinModules.filter((name) => !name.startsWith("_")),
  "node:*",
  "next",
  "next/*",
  "react",
  "react/*",
  "react-dom",
  "react-dom/*",
  "react-native",
  "@prisma/*",
  "@workspace/auth",
  "@workspace/auth/*",
  "@workspace/db",
  "@workspace/db/*",
  "@workspace/notifications",
  "@workspace/notifications/*",
  "@workspace/ui/*",
  "server-only",
  "client-only",
]

/** @type {import("eslint").Linter.Config} */
export default [
  ...config,
  {
    files: ["src/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: forbiddenModules,
              message:
                "@workspace/core must stay pure (no Node.js, framework, database or DOM code).",
            },
          ],
        },
      ],
      "no-restricted-globals": [
        "error",
        ...[
          "window",
          "document",
          "navigator",
          "localStorage",
          "sessionStorage",
          "process",
          "Buffer",
        ].map((name) => ({
          name,
          message: "@workspace/core must not depend on a runtime environment.",
        })),
      ],
    },
  },
]
