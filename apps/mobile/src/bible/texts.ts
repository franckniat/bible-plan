import type { BookId } from "@workspace/core"
import { z } from "zod"
import { Asset } from "expo-asset"

import { readAsset } from "./read-asset"

/**
 * The Bible versions bundled with the app, read offline (PLAN-MOBILE.md,
 * M12). Each is one file packed by scripts/bible.mjs from
 * @workspace/bible-data, loaded once into memory when first read.
 */
const bundled = {
  lsg1910: () => require("@/assets/bible/lsg1910.bible"),
  kjv: () => require("@/assets/bible/kjv.bible"),
} as const

export type BundledVersion = keyof typeof bundled

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

const loaded = new Map<BundledVersion, Promise<Packed>>()

function load(version: BundledVersion): Promise<Packed> {
  let packed = loaded.get(version)
  if (!packed) {
    packed = (async () => {
      const asset = await Asset.fromModule(bundled[version]()).downloadAsync()
      const text = await readAsset(asset.localUri ?? asset.uri)
      return packedSchema.parse(JSON.parse(text))
    })()
    // A failed load can be tried again later.
    packed.catch(() => loaded.delete(version))
    loaded.set(version, packed)
  }
  return packed
}

/** The verses of a chapter; empty when the version does not have it. */
export async function readChapter(
  version: BundledVersion,
  book: BookId,
  chapter: number
): Promise<Verse[]> {
  const { books } = await load(version)
  return (books[book]?.[chapter - 1] ?? []) as Verse[]
}
