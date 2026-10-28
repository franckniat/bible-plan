import type { BibleVersionId } from "@workspace/bible-data"
import type { BookId } from "@workspace/core"
import { z } from "zod"
import { Asset } from "expo-asset"

import { readAsset } from "./read-asset"
import { readVersionFile } from "./version-files"
import { isBundled, type BundledVersion } from "./versions"

/**
 * The Bible versions bundled with the app, read offline (PLAN-MOBILE.md,
 * M12). Each is one file packed by scripts/bible.mjs from
 * @workspace/bible-data, loaded once into memory when first read; a
 * downloaded version is the same file, kept with the app's documents.
 */
const bundled: Record<BundledVersion, () => number> = {
  lsg1910: () => require("@/assets/bible/lsg1910.bible"),
  kjv: () => require("@/assets/bible/kjv.bible"),
}

/** [verse number, text], in the version's own numbering. */
export type Verse = [number, string]

const packedSchema = z.object({
  version: z.string(),
  /** Chapters of each book, in order; each chapter its verses. */
  books: z.record(
    z.string(),
    z.array(z.array(z.tuple([z.int().min(1), z.string()])))
  ),
})

type Packed = z.infer<typeof packedSchema>

const loaded = new Map<BibleVersionId, Promise<Packed>>()

async function readText(version: BibleVersionId): Promise<string> {
  if (!isBundled(version)) return readVersionFile(version)
  const asset = await Asset.fromModule(bundled[version]()).downloadAsync()
  return readAsset(asset.localUri ?? asset.uri)
}

function load(version: BibleVersionId): Promise<Packed> {
  let packed = loaded.get(version)
  if (!packed) {
    packed = readText(version).then((text) => {
      const parsed = packedSchema.parse(JSON.parse(text))
      if (parsed.version !== version) throw new Error(`Not ${version}`)
      return parsed
    })
    // A failed load can be tried again later.
    packed.catch(() => loaded.delete(version))
    loaded.set(version, packed)
  }
  return packed
}

/** Reads a version's file afresh, failing when it is not whole. */
export async function checkVersion(version: BibleVersionId): Promise<void> {
  loaded.delete(version)
  await load(version)
}

/** The verses of a chapter; empty when the version does not have it. */
export async function readChapter(
  version: BibleVersionId,
  book: BookId,
  chapter: number
): Promise<Verse[]> {
  const { books } = await load(version)
  return (books[book]?.[chapter - 1] ?? []) as Verse[]
}
