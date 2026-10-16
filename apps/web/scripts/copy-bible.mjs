// Copies the Bible chapters of @workspace/bible-data to public/bible, so
// they are served as static files (and cached by the CDN). Runs before
// `next dev` and `next build`; public/bible is not committed.
import { cp, rm } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const web = join(dirname(fileURLToPath(import.meta.url)), "..")
const source = join(web, "..", "..", "packages", "bible-data", "data")
const target = join(web, "public", "bible")

await rm(target, { recursive: true, force: true })
await cp(source, target, { recursive: true })
console.log("Bible chapters copied to public/bible")
