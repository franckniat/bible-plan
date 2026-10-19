// Fetches, from the YouVersion Platform API, what the app needs to know about
// the translations of src/remote-versions.ts: the notice to show with them and
// how they number their verses. Only facts are kept (no text), in
// data/youversion.json.
//
//   pnpm --filter @workspace/bible-data import:youversion
//
// The key is read from YOUVERSION_API_KEY (apps/web/.env.local is loaded by the
// package script). A translation the key cannot read yet (its licence is not
// accepted in the YouVersion Platform portal, or the platform does not offer
// it) is skipped with a message, and joins the registry the next time this runs
// after that is fixed.
import { readFile, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { bookIds } from "@workspace/core"

import {
  isPublicDomainNotice,
  remoteVersionConfigs,
  type RemoteVersionIndex,
} from "../src/remote-versions"
import { bookOfUsfm } from "../src/youversion"

const key = process.env.YOUVERSION_API_KEY
if (!key) {
  console.error("YOUVERSION_API_KEY is not set (see apps/web/.env.example).")
  process.exit(1)
}

const output = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "data",
  "youversion.json"
)

async function get(path: string): Promise<{ status: number; body: unknown }> {
  const response = await fetch(`https://api.youversion.com/v1${path}`, {
    headers: { "X-YVP-App-Key": key!, Accept: "application/json" },
  })
  const body: unknown = await response.json().catch(() => null)
  return { status: response.status, body }
}

type Metadata = { copyright?: string | null }
type Index = {
  books: { id: string; chapters: { verses: unknown[] }[] }[]
}

// The translations YouVersion offers under its open licence (public domain and
// Creative Commons): free to hand out, whatever their notice says or omits.
type Licenses = { data: { name: string; bible_ids?: number[] }[] }
const licenses = await get("/licenses")
const open = new Set(
  (licenses.body as Licenses | null)?.data
    ?.filter((licence) => licence.name === "Public Domain and Creative Commons")
    .flatMap((licence) => licence.bible_ids ?? []) ?? []
)

const result: Record<string, RemoteVersionIndex> = {}
for (const config of remoteVersionConfigs) {
  const metadata = await get(`/bibles/${config.youVersionId}`)
  if (metadata.status !== 200) {
    const why =
      metadata.status === 403
        ? "licence not accepted for this key"
        : `HTTP ${metadata.status}`
    console.log(`- ${config.id} (${config.name}): skipped, ${why}`)
    continue
  }
  const index = await get(`/bibles/${config.youVersionId}/index`)
  if (index.status !== 200 || !index.body) {
    console.log(
      `- ${config.id}: skipped, no usable index (HTTP ${index.status})`
    )
    continue
  }

  const verseCounts: Record<string, number[]> = {}
  for (const book of (index.body as Index).books) {
    const id = bookOfUsfm(book.id)
    if (id) verseCounts[id] = book.chapters.map((c) => c.verses.length)
  }
  // The whole Bible, in the canon's books: anything less is not usable.
  const missing = bookIds.filter((book) => !verseCounts[book])
  if (missing.length > 0) {
    console.log(`- ${config.id}: skipped, books missing (${missing.length})`)
    continue
  }

  const copyright = (metadata.body as Metadata).copyright?.trim() || null
  const publicDomain =
    open.has(config.youVersionId) || isPublicDomainNotice(copyright ?? "")
  result[config.id] = { copyright, publicDomain, verseCounts }
  console.log(
    `- ${config.id} (${config.name}): ok, ${publicDomain ? "public domain" : "UNDER COPYRIGHT"} (${copyright ?? "no notice"})`
  )
}

// Keep the file stable: configured order, then written as it is.
const previous = await readFile(output, "utf8").catch(() => "")
const next = JSON.stringify(result, null, 2) + "\n"
if (previous !== next) await writeFile(output, next)
console.log(
  `${Object.keys(result).length} translation(s) in data/youversion.json`
)
