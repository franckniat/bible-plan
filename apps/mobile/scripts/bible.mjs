// Packs the Bible versions bundled with the app, one file each, from the
// chapters of @workspace/bible-data: assets/bible/<version>.bible (JSON, kept
// out of the JS bundle as an asset). Run before Metro (see package.json).
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"

const data = new URL("../../../packages/bible-data/data/", import.meta.url)
const out = new URL("../assets/bible/", import.meta.url)
const versions = ["lsg1910", "kjv"]

await mkdir(out, { recursive: true })
for (const version of versions) {
  const target = new URL(`${version}.bible`, out)
  const folder = new URL(`${version}/`, data)
  const books = {}
  // Book folders only (index.json holds the verse counts).
  const entries = await readdir(folder, { withFileTypes: true })
  for (const book of entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)) {
    const files = (await readdir(new URL(`${book}/`, folder))).filter((file) =>
      file.endsWith(".json")
    )
    const chapters = []
    for (const file of files) {
      const chapter = JSON.parse(
        await readFile(new URL(`${book}/${file}`, folder), "utf8")
      )
      chapters[chapter.chapter - 1] = chapter.verses
    }
    books[book] = chapters
  }
  const packed = JSON.stringify({ version, books })
  // Rewrite only when the text changed, so Metro keeps its cache.
  const previous = await readFile(target, "utf8").catch(() => null)
  if (previous !== packed) await writeFile(target, packed)
  const { size } = await stat(target)
  console.log(
    `${fileURLToPath(target)}: ${Object.keys(books).length} books, ${(size / 1e6).toFixed(1)} MB`
  )
}
