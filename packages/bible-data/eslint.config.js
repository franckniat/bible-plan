import { pureConfig } from "@workspace/eslint-config/pure"

// src/ runs everywhere (web, mobile); scripts/ are Node.js tools.
/** @type {import("eslint").Linter.Config[]} */
export default pureConfig("@workspace/bible-data")
