import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    // The property tests (plans, catch-up) try hundreds of random cases and
    // take 3 to 4 seconds each on their own. With every package tested at
    // once, the default 5 seconds is too close: a slow machine made them fail
    // for no reason.
    testTimeout: 30_000,
  },
})
