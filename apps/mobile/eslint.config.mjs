import { config } from "@workspace/eslint-config/react-internal"
import globals from "globals"

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...config,
  // drizzle/ is written by drizzle-kit.
  { ignores: [".expo/**", "expo-env.d.ts", "drizzle/**"] },
  // React Native loads images and other assets with require().
  { rules: { "@typescript-eslint/no-require-imports": "off" } },
  // Metro and Babel read their configs as CommonJS, in Node.
  {
    files: ["*.config.js"],
    languageOptions: { globals: globals.node, sourceType: "commonjs" },
  },
]
