// Imports a public-domain Bible from eBible.org into data/<version>/.
//
//   pnpm --filter @workspace/bible-data import:ebible <version> [--from <zip>]
//
// <version> is lsg1910 or kjv. The "VPL" archive (one verse per line) is
// downloaded from eBible.org, or read from a local copy with --from. The
// text is only parsed as data: nothing from the archive is executed.
import { mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { unzipSync } from "fflate"

import { bookIds, type BookId } from "@workspace/core"

import { chapterPath, chapterSchema, type BibleChapter } from "../src/chapter"

/** eBible.org identifier of each version we import. */
const sources = {
  lsg1910: "fraLSG",
  kjv: "eng-kjv2006",
} as const

type VersionId = keyof typeof sources

/** Book codes of the VPL files, in canonical order (same as bookIds). */
const vplBooks = [
  "GEN",
  "EXO",
  "LEV",
  "NUM",
  "DEU",
  "JOS",
  "JDG",
  "RUT",
  "1SA",
  "2SA",
  "1KI",
  "2KI",
  "1CH",
  "2CH",
  "EZR",
  "NEH",
  "EST",
  "JOB",
  "PSA",
  "PRO",
  "ECC",
  "SOL",
  "ISA",
  "JER",
  "LAM",
  "EZE",
  "DAN",
  "HOS",
  "JOE",
  "AMO",
  "OBA",
  "JON",
  "MIC",
  "NAH",
  "HAB",
  "ZEP",
  "HAG",
  "ZEC",
  "MAL",
  "MAT",
  "MAR",
  "LUK",
  "JOH",
  "ACT",
  "ROM",
  "1CO",
  "2CO",
  "GAL",
  "EPH",
  "PHI",
  "COL",
  "1TH",
  "2TH",
  "1TI",
  "2TI",
  "TIT",
  "PHM",
  "HEB",
  "JAM",
  "1PE",
  "2PE",
  "1JO",
  "2JO",
  "3JO",
  "JUD",
  "REV",
] as const
const osisOf = new Map<string, BookId>(
  vplBooks.map((code, index) => [code, bookIds[index]!])
)

const dataFolder = join(dirname(fileURLToPath(import.meta.url)), "..", "data")

/** Same characters in a canonical form, single spaces, no edge spaces. */
function normalize(text: string): string {
  return text.normalize("NFC").replace(/\s+/g, " ").trim()
}

async function readArchive(version: VersionId, from?: string) {
  if (from) return new Uint8Array(await readFile(from))
  const url = `https://ebible.org/Scriptures/${sources[version]}_vpl.zip`
  console.log(`Downloading ${url}`)
  const response = await fetch(url)
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`)
  return new Uint8Array(await response.arrayBuffer())
}

/** Chapters of a VPL text: "GEN 1:1 Au commencement, Dieu créa…". */
function parseVpl(version: string, text: string): BibleChapter[] {
  const chapters = new Map<string, BibleChapter>()
  for (const [index, line] of text.split(/\r?\n/).entries()) {
    if (!line.trim()) continue
    const match = /^(\w{3}) (\d+):(\d+) (.+)$/.exec(line)
    const book = match && osisOf.get(match[1]!)
    if (!match || !book) {
      throw new Error(`Line ${index + 1} not understood: ${line.slice(0, 60)}`)
    }
    const chapter = Number(match[2])
    const key = `${book} ${chapter}`
    const entry = chapters.get(key) ?? { version, book, chapter, verses: [] }
    entry.verses.push([Number(match[3]), normalize(match[4]!)])
    chapters.set(key, entry)
  }
  return [...chapters.values()].map((chapter) => chapterSchema.parse(chapter))
}

/** One verse per line, so that text corrections give readable diffs. */
function toJson(chapter: BibleChapter): string {
  const verses = chapter.verses.map((verse) => `    ${JSON.stringify(verse)}`)
  return [
    "{",
    `  "version": ${JSON.stringify(chapter.version)},`,
    `  "book": ${JSON.stringify(chapter.book)},`,
    `  "chapter": ${chapter.chapter},`,
    `  "verses": [\n${verses.join(",\n")}\n  ]`,
    "}",
    "",
  ].join("\n")
}

async function main() {
  const [version, flag, from] = process.argv.slice(2)
  if (!version || !(version in sources) || (flag && flag !== "--from")) {
    throw new Error(
      "Usage: import:ebible <lsg1910|kjv> [--from <path to the _vpl.zip>]"
    )
  }
  const id = version as VersionId
  const files = unzipSync(await readArchive(id, from))
  const name = Object.keys(files).find((file) => file.endsWith("_vpl.txt"))
  if (!name) throw new Error("No _vpl.txt file in the archive")
  const chapters = parseVpl(id, new TextDecoder("utf-8").decode(files[name]))

  const books = new Set(chapters.map((chapter) => chapter.book))
  if (books.size !== bookIds.length) {
    throw new Error(`Expected ${bookIds.length} books, found ${books.size}`)
  }

  await rm(join(dataFolder, id), { recursive: true, force: true })
  for (const chapter of chapters) {
    const file = join(
      dataFolder,
      chapterPath(id, chapter.book, chapter.chapter)
    )
    await mkdir(dirname(file), { recursive: true })
    await writeFile(file, toJson(chapter))
  }

  // Verses per chapter of this version, to map the canon's numbering.
  const verseCounts = Object.fromEntries(
    bookIds.map((book) => [
      book,
      chapters
        .filter((chapter) => chapter.book === book)
        .sort((a, b) => a.chapter - b.chapter)
        .map((chapter) => chapter.verses.length),
    ])
  )
  await writeFile(
    join(dataFolder, id, "index.json"),
    JSON.stringify(
      {
        version: id,
        source: `https://ebible.org/find/details.php?id=${sources[id]}`,
        verseCounts,
      },
      null,
      2
    ) + "\n"
  )
  const verses = chapters.reduce(
    (total, chapter) => total + chapter.verses.length,
    0
  )
  console.log(
    `${id}: ${chapters.length} chapters, ${verses} verses written to data/${id}`
  )
}

await main()
