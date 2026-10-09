import { builtinModules } from "node:module"

import { config as baseConfig } from "./base.js"

// Modules forbidden in pure packages: they must run on the server, in the
// browser and in the future React Native app, so no Node.js, framework,
// database or DOM code.
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

const forbiddenGlobals = [
  "window",
  "document",
  "navigator",
  "localStorage",
  "sessionStorage",
  "process",
  "Buffer",
]

/**
 * ESLint configuration for runtime-agnostic packages (e.g. @workspace/core).
 *
 * @param {string} packageName
 * @returns {import("eslint").Linter.Config[]}
 */
export function pureConfig(packageName) {
  return [
    ...baseConfig,
    {
      files: ["src/**/*.ts"],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            patterns: [
              {
                group: forbiddenModules,
                message: `${packageName} must stay pure (no Node.js, framework, database or DOM code).`,
              },
            ],
          },
        ],
        "no-restricted-globals": [
          "error",
          ...forbiddenGlobals.map((name) => ({
            name,
            message: `${packageName} must not depend on a runtime environment.`,
          })),
        ],
      },
    },
  ]
}
