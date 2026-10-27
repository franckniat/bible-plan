import { fileURLToPath } from "node:url"

import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    // The "@/…" paths of tsconfig.json.
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    // Some tests import modules afresh (vi.resetModules) or start sql.js;
    // with Metro running too, the default 5 seconds made one fail for no
    // reason. Same limit as @workspace/core.
    testTimeout: 30_000,
  },
})
