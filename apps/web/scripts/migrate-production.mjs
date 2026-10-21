// Applies the database migrations when a production deploy is built, so the
// schema always matches the code that goes live. Other builds (local, CI,
// Vercel previews) leave the database alone.
//
// It needs the direct (unpooled) Neon connection, DIRECT_URL, which Prisma
// migrations require. Without it the step is skipped with a warning rather than
// breaking the deploy; a migration that fails stops the build, so a schema
// that does not match is never put online.
import { spawnSync } from "node:child_process"
import { dirname, join } from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"

if (process.env.VERCEL_ENV !== "production") {
  console.log("Migrations: not a production deploy, skipped.")
  process.exit(0)
}

if (!process.env.DIRECT_URL) {
  console.warn(
    "Migrations: DIRECT_URL is not set, skipped. Add it to the Vercel " +
      "environment variables (the direct Neon URL, without -pooler) so " +
      "migrations are applied on deploy."
  )
  process.exit(0)
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..")
console.log("Migrations: applying them to the production database…")
const result = spawnSync("pnpm", ["--filter", "@workspace/db", "db:deploy"], {
  cwd: root,
  stdio: "inherit",
  shell: process.platform === "win32",
})
if (result.status !== 0) {
  console.error("Migrations failed: the deploy is stopped.")
  process.exit(result.status ?? 1)
}
