// Copies the Bible chapters of @workspace/bible-data to public/bible, so
// they are served as static files (and cached by the CDN), and packs each
// version into public/bible/<version>.json, the file the mobile app
// downloads (same format as apps/mobile/scripts/bible.mjs). Runs before
// `next dev` and `next build`; public/bible is not committed.
import { cp, readdir, readFile, rm, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const web = join(dirname(fileURLToPath(import.meta.url)), "..")
const source = join(web, "..", "..", "packages", "bible-data", "data")
const target = join(web, "public", "bible")

await rm(target, { recursive: true, force: true })
await cp(source, target, { recursive: true })
console.log("Bible chapters copied to public/bible")

/** { version, books: { <book>: [[[verse, text], …] per chapter] } } */
async function pack(version) {
  const folder = join(source, version)
  const books = {}
  const entries = await readdir(folder, { withFileTypes: true })
  for (const book of entries.filter((e) => e.isDirectory())) {
    const chapters = []
    for (const file of await readdir(join(folder, book.name))) {
      if (!file.endsWith(".json")) continue
      const chapter = JSON.parse(
        await readFile(join(folder, book.name, file), "utf8")
      )
      chapters[chapter.chapter - 1] = chapter.verses
    }
    books[book.name] = chapters
  }
  return JSON.stringify({ version, books })
}

const versions = (await readdir(source, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
for (const version of versions) {
  await writeFile(join(target, `${version}.json`), await pack(version))
}
console.log(`Packed for the app: ${versions.join(", ")}`)
