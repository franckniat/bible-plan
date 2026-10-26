import { config } from "@workspace/eslint-config/react-internal"

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...config,
  { ignores: [".expo/**", "expo-env.d.ts"] },
  // React Native loads images and other assets with require().
  { rules: { "@typescript-eslint/no-require-imports": "off" } },
]
