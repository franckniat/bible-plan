import { config } from "@workspace/eslint-config/react-internal"
import globals from "globals"

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...config,
  // drizzle/ is written by drizzle-kit.
  { ignores: [".expo/**", "expo-env.d.ts", "drizzle/**"] },
  // React Native loads images and other assets with require().
  { rules: { "@typescript-eslint/no-require-imports": "off" } },
  // Only the repositories read and write the local database: every write
  // then goes through the outbox (src/repositories/README.md).
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/db/**", "src/repositories/**"],
    rules: {
      "no-restricted-imports": [
        "warn",
        {
          patterns: [
            {
              group: [
                "@/db/client",
                "@/db/schema",
                "drizzle-orm",
                "drizzle-orm/*",
              ],
              message: "Use a repository (src/repositories).",
            },
          ],
        },
      ],
    },
  },
  // Metro and Babel read their configs as CommonJS, in Node.
  {
    files: ["*.config.js"],
    languageOptions: { globals: globals.node, sourceType: "commonjs" },
  },
]
