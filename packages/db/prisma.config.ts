import "dotenv/config"
import { defineConfig } from "prisma/config"

// The Prisma CLI (migrate, studio, introspection) uses the direct, unpooled
// Neon connection; the application uses the pooled DATABASE_URL at runtime.
// DIRECT_URL is read optionally so `prisma generate` works without a database
// (e.g. in CI); commands that need a connection fail with an explicit error.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DIRECT_URL,
  },
})
