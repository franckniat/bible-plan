import { defineConfig } from "drizzle-kit"

// Migrations of the local database: `pnpm db:generate` after changing
// src/db/schema.ts writes them to drizzle/, bundled into the app.
export default defineConfig({
  dialect: "sqlite",
  driver: "expo",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
})
