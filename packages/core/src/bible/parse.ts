import { locales, type Locale } from "../schemas/common"
import { books, type BookId } from "./books"
import {
  bookPassage,
  chaptersPassage,
  isValidPassage,
  type Passage,
} from "./passage"
import { isSingleChapterBook } from "./verse-counts"

/**
 * Other ways of writing book names, on top of the names and abbreviations of
 * books.ts. For numbered books (1 Samuel...), the number is added
 * automatically: "sam" also matches "1 Sam" and "2Sam".
 */
const aliases: Partial<Record<BookId, Partial<Record<Locale, string[]>>>> = {
  Gen: { fr: ["gen", "ge"], en: ["gn", "ge"] },
  Exod: { fr: ["exo", "exod"], en: ["ex", "exo"] },
  Lev: { fr: ["lev"], en: ["lv", "le"] },
  Num: { fr: ["nom", "nomb"], en: ["nm", "nu", "nb"] },
  Deut: { fr: ["deut"], en: ["dt", "de"] },
  Josh: { fr: ["josue"], en: ["jos", "jsh"] },
  Judg: { fr: ["jug"], en: ["jdg", "jg"] },
  Ruth: { fr: ["ru"], en: ["rth", "ru", "rt"] },
  "1Sam": { fr: ["sam"], en: ["sa", "sm", "s"] },
  "2Sam": { fr: ["sam"], en: ["sa", "sm", "s"] },
  "1Kgs": { fr: ["ro", "roi"], en: ["ki", "kin", "kgs", "k"] },
  "2Kgs": { fr: ["ro", "roi"], en: ["ki", "kin", "kgs", "k"] },
  "1Chr": { fr: ["chr", "chron"], en: ["ch", "chron"] },
  "2Chr": { fr: ["chr", "chron"], en: ["ch", "chron"] },
  Ezra: { fr: ["esdr"], en: ["ezr"] },
  Neh: { fr: ["neh"], en: ["ne"] },
  Esth: { fr: ["esth"], en: ["est", "es"] },
  Job: { en: ["jb"] },
  Ps: { fr: ["psaume", "psa", "pss"], en: ["psalm", "psa", "pss", "psm"] },
  Prov: { fr: ["prov"], en: ["pr", "prv", "pro"] },
  Eccl: {
    fr: ["eccl", "ecc", "qo", "qoh", "qohelet"],
    en: ["ec", "ecc", "qoh"],
  },
  Song: {
    fr: ["cant", "cantique", "cantiques"],
    en: ["sos", "songofsongs", "canticles", "ss"],
  },
  Isa: { fr: ["esa", "isaie", "is"], en: ["is"] },
  Jer: { fr: ["jer"], en: ["je", "jr"] },
  Lam: { fr: ["lam"], en: ["la", "lm"] },
  Ezek: { fr: ["ezech", "ezek"], en: ["ezk", "eze"] },
  Dan: { fr: ["dan"], en: ["dn", "da"] },
  Hos: { fr: ["ose"], en: ["ho"] },
  Joel: { en: ["jl"] },
  Amos: { en: ["am"] },
  Obad: { fr: ["abd"], en: ["ob", "oba"] },
  Jonah: { fr: ["jonas"], en: ["jon", "jnh"] },
  Mic: { fr: ["mich"], en: ["mi"] },
  Nah: { fr: ["nah"], en: ["na"] },
  Hab: { fr: ["hab"], en: ["hb"] },
  Zeph: { fr: ["soph"], en: ["zep", "zp"] },
  Hag: { fr: ["agg"], en: ["hg"] },
  Zech: { fr: ["zach"], en: ["zec", "zc"] },
  Mal: { fr: ["mal"], en: ["ml"] },
  Matt: { fr: ["mat", "matt"], en: ["mt", "mat"] },
  Mark: { fr: ["mr"], en: ["mk", "mr", "mrk"] },
  Luke: { fr: ["lu"], en: ["lk", "lu"] },
  John: { en: ["jn", "jhn", "joh"] },
  Acts: {
    fr: ["act", "actesdesapotres"],
    en: ["ac", "act", "actsoftheapostles"],
  },
  Rom: { fr: ["rom", "ro"], en: ["ro", "rm"] },
  "1Cor": { fr: ["cor"], en: ["co"] },
  "2Cor": { fr: ["cor"], en: ["co"] },
  Gal: { fr: ["gal"], en: ["ga"] },
  Eph: { fr: ["eph"], en: ["ep"] },
  Phil: { fr: ["phil"], en: ["php", "pp", "phi"] },
  Col: { en: ["cl"] },
  "1Thess": { fr: ["thess", "thes"], en: ["th", "thes"] },
  "2Thess": { fr: ["thess", "thes"], en: ["th", "thes"] },
  "1Tim": { fr: ["tim", "ti"], en: ["ti", "tm"] },
  "2Tim": { fr: ["tim", "ti"], en: ["ti", "tm"] },
  Titus: { fr: ["tit"], en: ["tit", "ti"] },
  Phlm: { fr: ["philem", "phlm"], en: ["phm", "philem", "pm"] },
  Heb: { fr: ["heb", "hebr"], en: ["he"] },
  Jas: { fr: ["jac", "jacq"], en: ["jm", "ja"] },
  "1Pet": { fr: ["pi", "pierre", "pet"], en: ["pe", "pt", "p"] },
  "2Pet": { fr: ["pi", "pierre", "pet"], en: ["pe", "pt", "p"] },
  "1John": { fr: ["jean"], en: ["jn", "jo", "joh", "jhn"] },
  "2John": { fr: ["jean"], en: ["jn", "jo", "joh", "jhn"] },
  "3John": { fr: ["jean"], en: ["jn", "jo", "joh", "jhn"] },
  Jude: { en: ["jud", "jd"] },
  Rev: {
    fr: ["apo", "apoc"],
    en: ["re", "rv", "revelations", "apocalypse", "apoc"],
  },
}

/** Lowercase, without accents, dots, apostrophes or spaces: "1 Rois." → "1rois". */
function toKey(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[\s.'’]/g, "")
}

/** Book lookup tables, one per language: key → book. */
function buildLookup(): Record<Locale, Map<string, BookId>> {
  const lookup = {} as Record<Locale, Map<string, BookId>>
  for (const locale of locales) {
    const keys = new Map<string, BookId>()
    const add = (key: string, id: BookId) => {
      const existing = keys.get(key)
      if (existing && existing !== id) {
        throw new Error(`Book key "${key}" (${locale}) is ambiguous`)
      }
      keys.set(key, id)
    }
    for (const book of books) {
      const { name, abbreviation } = book.names[locale]
      add(toKey(name), book.id)
      add(toKey(abbreviation), book.id)
      add(toKey(book.id), book.id)
      const number = /^\d/.test(book.id) ? book.id[0] : ""
      for (const alias of aliases[book.id]?.[locale] ?? []) {
        add(number + toKey(alias), book.id)
      }
    }
    lookup[locale] = keys
  }
  return lookup
}

const lookup = buildLookup()

/** "1re", "I", "First", "Deuxième"... → "1", "2", "3". */
const ordinals: [RegExp, string][] = [
  [/^(?:1re|1ere|1er|1st|i|first|premier|premiere)$/, "1"],
  [/^(?:2e|2eme|2nd|ii|second|seconde|deuxieme)$/, "2"],
  [/^(?:3e|3eme|3rd|iii|third|troisieme)$/, "3"],
]

/** Finds a book from its name or abbreviation, in any supported language. */
export function findBook(name: string, locale?: Locale): BookId | undefined {
  const words = name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim()
    .split(/\s+/)
  const ordinal = ordinals.find(([pattern]) => pattern.test(words[0] ?? ""))
  if (ordinal && words.length > 1) words[0] = ordinal[1]
  const key = toKey(words.join(""))

  const order = locale
    ? [locale, ...locales.filter((other) => other !== locale)]
    : locales
  for (const language of order) {
    const id = lookup[language].get(key)
    if (id) return id
  }
  return undefined
}

/** The numbers after a book name: "3:16", "1-3", "119:1-88", "1:1-2:3". */
function parseNumbers(book: BookId, text: string): Passage | null {
  const numbers = text
    .replace(/\s/g, "")
    .replace(/(\d)[.,](\d)/g, "$1:$2")
    .replace(/[‐-―−]/g, "-")
  const match = /^(\d+)(?::(\d+))?(?:-(\d+)(?::(\d+))?)?$/.exec(numbers)
  if (!match) return null
  const [, a, b, c, d] = match.map((value) =>
    value === undefined ? undefined : Number(value)
  )
  if (a === undefined) return null

  let passage: Passage
  if (b === undefined && d === undefined) {
    // "Jude 3" or "Jude 3-5" are verses; "Jude 1" alone is the whole book.
    passage =
      isSingleChapterBook(book) && !(a === 1 && c === undefined)
        ? {
            book,
            start: { chapter: 1, verse: a },
            end: { chapter: 1, verse: c ?? a },
          }
        : chaptersPassage(book, a, c ?? a)
  } else if (b !== undefined && d === undefined) {
    // "3:16" or "119:1-88"
    passage = {
      book,
      start: { chapter: a, verse: b },
      end: { chapter: a, verse: c ?? b },
    }
  } else if (b !== undefined && c !== undefined && d !== undefined) {
    // "1:1-2:3"
    passage = {
      book,
      start: { chapter: a, verse: b },
      end: { chapter: c, verse: d },
    }
  } else {
    return null
  }
  return isValidPassage(passage) ? passage : null
}

const segmentPattern =
  /^((?:[1-3](?:re|ere|er|st|eme|nd|rd|e)|i{1,3}|first|second|seconde|third|premier|premiere|deuxieme|troisieme)\s+|[1-3]\s*)?(\p{L}[\p{L}\s.'’]*?)\s*(\d[\d\s:.,‐-―−-]*)?$/u

/**
 * Parses references written in French or English: "Jn 3:16", "Genèse 1-3",
 * "Ps 119:1-88", "1 Co 13", "Gn 1:1-2:3", "Ruth" (whole book), several
 * separated by ";" ("Gn 1; 3" reuses the book). Book names are found in both
 * languages, `locale` first. Returns null when any part is invalid or does
 * not exist (e.g. "Jn 22").
 */
export function parseReference(
  input: string,
  options: { locale?: Locale } = {}
): Passage[] | null {
  const segments = input
    .split(";")
    .map((segment) => segment.trim())
    .filter(Boolean)
  if (segments.length === 0) return null

  const passages: Passage[] = []
  let previousBook: BookId | undefined
  for (const segment of segments) {
    let book: BookId | undefined
    let numbers: string | undefined

    if (/^\d[\d\s:.,‐-―−-]*$/.test(segment) && previousBook) {
      book = previousBook
      numbers = segment
    } else {
      const normalized = segment
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase()
      const match = segmentPattern.exec(normalized)
      if (!match) return null
      const [, prefix = "", name = "", rest] = match
      book = findBook(`${prefix.trim()} ${name}`.trim(), options.locale)
      numbers = rest
    }
    if (!book) return null

    const passage =
      numbers === undefined ? bookPassage(book) : parseNumbers(book, numbers)
    if (!passage) return null
    passages.push(passage)
    previousBook = book
  }
  return passages
}
