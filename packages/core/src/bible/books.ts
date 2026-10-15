import type { Locale } from "../schemas/common"

/** OSIS identifiers of the 66 books of the Protestant canon, in canonical order. */
export const bookIds = [
  "Gen",
  "Exod",
  "Lev",
  "Num",
  "Deut",
  "Josh",
  "Judg",
  "Ruth",
  "1Sam",
  "2Sam",
  "1Kgs",
  "2Kgs",
  "1Chr",
  "2Chr",
  "Ezra",
  "Neh",
  "Esth",
  "Job",
  "Ps",
  "Prov",
  "Eccl",
  "Song",
  "Isa",
  "Jer",
  "Lam",
  "Ezek",
  "Dan",
  "Hos",
  "Joel",
  "Amos",
  "Obad",
  "Jonah",
  "Mic",
  "Nah",
  "Hab",
  "Zeph",
  "Hag",
  "Zech",
  "Mal",
  "Matt",
  "Mark",
  "Luke",
  "John",
  "Acts",
  "Rom",
  "1Cor",
  "2Cor",
  "Gal",
  "Eph",
  "Phil",
  "Col",
  "1Thess",
  "2Thess",
  "1Tim",
  "2Tim",
  "Titus",
  "Phlm",
  "Heb",
  "Jas",
  "1Pet",
  "2Pet",
  "1John",
  "2John",
  "3John",
  "Jude",
  "Rev",
] as const

export type BookId = (typeof bookIds)[number]

export type Testament = "old" | "new"

/** Literary group of a book, used to build reading plans (e.g. one Gospel a day). */
export type BookGenre =
  | "law"
  | "history"
  | "poetry"
  | "majorProphets"
  | "minorProphets"
  | "gospels"
  | "paulineEpistles"
  | "generalEpistles"
  | "apocalyptic"

type BookNames = {
  /** Full name, e.g. "Genèse" / "Genesis". */
  name: string
  /** Usual abbreviation, e.g. "Gn" / "Gen". */
  abbreviation: string
}

export type Book = {
  id: BookId
  /** Position in the canon, 1 (Genesis) to 66 (Revelation). */
  order: number
  testament: Testament
  genre: BookGenre
  names: Record<Locale, BookNames>
}

type BookRow = [
  id: BookId,
  genre: BookGenre,
  fr: [name: string, abbreviation: string],
  en: [name: string, abbreviation: string],
]

// French names and abbreviations follow the Louis Segond tradition
// (Protestant: « Ésaïe », « Ecclésiaste »); English ones follow the King
// James Version names and the SBL abbreviations.
const rows: BookRow[] = [
  ["Gen", "law", ["Genèse", "Gn"], ["Genesis", "Gen"]],
  ["Exod", "law", ["Exode", "Ex"], ["Exodus", "Exod"]],
  ["Lev", "law", ["Lévitique", "Lv"], ["Leviticus", "Lev"]],
  ["Num", "law", ["Nombres", "Nb"], ["Numbers", "Num"]],
  ["Deut", "law", ["Deutéronome", "Dt"], ["Deuteronomy", "Deut"]],
  ["Josh", "history", ["Josué", "Jos"], ["Joshua", "Josh"]],
  ["Judg", "history", ["Juges", "Jg"], ["Judges", "Judg"]],
  ["Ruth", "history", ["Ruth", "Rt"], ["Ruth", "Ruth"]],
  ["1Sam", "history", ["1 Samuel", "1 S"], ["1 Samuel", "1 Sam"]],
  ["2Sam", "history", ["2 Samuel", "2 S"], ["2 Samuel", "2 Sam"]],
  ["1Kgs", "history", ["1 Rois", "1 R"], ["1 Kings", "1 Kgs"]],
  ["2Kgs", "history", ["2 Rois", "2 R"], ["2 Kings", "2 Kgs"]],
  ["1Chr", "history", ["1 Chroniques", "1 Ch"], ["1 Chronicles", "1 Chr"]],
  ["2Chr", "history", ["2 Chroniques", "2 Ch"], ["2 Chronicles", "2 Chr"]],
  ["Ezra", "history", ["Esdras", "Esd"], ["Ezra", "Ezra"]],
  ["Neh", "history", ["Néhémie", "Né"], ["Nehemiah", "Neh"]],
  ["Esth", "history", ["Esther", "Est"], ["Esther", "Esth"]],
  ["Job", "poetry", ["Job", "Jb"], ["Job", "Job"]],
  ["Ps", "poetry", ["Psaumes", "Ps"], ["Psalms", "Ps"]],
  ["Prov", "poetry", ["Proverbes", "Pr"], ["Proverbs", "Prov"]],
  ["Eccl", "poetry", ["Ecclésiaste", "Ec"], ["Ecclesiastes", "Eccl"]],
  [
    "Song",
    "poetry",
    ["Cantique des cantiques", "Ct"],
    ["Song of Solomon", "Song"],
  ],
  ["Isa", "majorProphets", ["Ésaïe", "Es"], ["Isaiah", "Isa"]],
  ["Jer", "majorProphets", ["Jérémie", "Jr"], ["Jeremiah", "Jer"]],
  ["Lam", "majorProphets", ["Lamentations", "Lm"], ["Lamentations", "Lam"]],
  ["Ezek", "majorProphets", ["Ézéchiel", "Ez"], ["Ezekiel", "Ezek"]],
  ["Dan", "majorProphets", ["Daniel", "Dn"], ["Daniel", "Dan"]],
  ["Hos", "minorProphets", ["Osée", "Os"], ["Hosea", "Hos"]],
  ["Joel", "minorProphets", ["Joël", "Jl"], ["Joel", "Joel"]],
  ["Amos", "minorProphets", ["Amos", "Am"], ["Amos", "Amos"]],
  ["Obad", "minorProphets", ["Abdias", "Ab"], ["Obadiah", "Obad"]],
  ["Jonah", "minorProphets", ["Jonas", "Jon"], ["Jonah", "Jonah"]],
  ["Mic", "minorProphets", ["Michée", "Mi"], ["Micah", "Mic"]],
  ["Nah", "minorProphets", ["Nahum", "Na"], ["Nahum", "Nah"]],
  ["Hab", "minorProphets", ["Habacuc", "Ha"], ["Habakkuk", "Hab"]],
  ["Zeph", "minorProphets", ["Sophonie", "So"], ["Zephaniah", "Zeph"]],
  ["Hag", "minorProphets", ["Aggée", "Ag"], ["Haggai", "Hag"]],
  ["Zech", "minorProphets", ["Zacharie", "Za"], ["Zechariah", "Zech"]],
  ["Mal", "minorProphets", ["Malachie", "Ml"], ["Malachi", "Mal"]],
  ["Matt", "gospels", ["Matthieu", "Mt"], ["Matthew", "Matt"]],
  ["Mark", "gospels", ["Marc", "Mc"], ["Mark", "Mark"]],
  ["Luke", "gospels", ["Luc", "Lc"], ["Luke", "Luke"]],
  ["John", "gospels", ["Jean", "Jn"], ["John", "John"]],
  ["Acts", "history", ["Actes", "Ac"], ["Acts", "Acts"]],
  ["Rom", "paulineEpistles", ["Romains", "Rm"], ["Romans", "Rom"]],
  [
    "1Cor",
    "paulineEpistles",
    ["1 Corinthiens", "1 Co"],
    ["1 Corinthians", "1 Cor"],
  ],
  [
    "2Cor",
    "paulineEpistles",
    ["2 Corinthiens", "2 Co"],
    ["2 Corinthians", "2 Cor"],
  ],
  ["Gal", "paulineEpistles", ["Galates", "Ga"], ["Galatians", "Gal"]],
  ["Eph", "paulineEpistles", ["Éphésiens", "Ep"], ["Ephesians", "Eph"]],
  ["Phil", "paulineEpistles", ["Philippiens", "Ph"], ["Philippians", "Phil"]],
  ["Col", "paulineEpistles", ["Colossiens", "Col"], ["Colossians", "Col"]],
  [
    "1Thess",
    "paulineEpistles",
    ["1 Thessaloniciens", "1 Th"],
    ["1 Thessalonians", "1 Thess"],
  ],
  [
    "2Thess",
    "paulineEpistles",
    ["2 Thessaloniciens", "2 Th"],
    ["2 Thessalonians", "2 Thess"],
  ],
  ["1Tim", "paulineEpistles", ["1 Timothée", "1 Tm"], ["1 Timothy", "1 Tim"]],
  ["2Tim", "paulineEpistles", ["2 Timothée", "2 Tm"], ["2 Timothy", "2 Tim"]],
  ["Titus", "paulineEpistles", ["Tite", "Tt"], ["Titus", "Titus"]],
  ["Phlm", "paulineEpistles", ["Philémon", "Phm"], ["Philemon", "Phlm"]],
  ["Heb", "generalEpistles", ["Hébreux", "Hé"], ["Hebrews", "Heb"]],
  ["Jas", "generalEpistles", ["Jacques", "Jc"], ["James", "Jas"]],
  ["1Pet", "generalEpistles", ["1 Pierre", "1 P"], ["1 Peter", "1 Pet"]],
  ["2Pet", "generalEpistles", ["2 Pierre", "2 P"], ["2 Peter", "2 Pet"]],
  ["1John", "generalEpistles", ["1 Jean", "1 Jn"], ["1 John", "1 John"]],
  ["2John", "generalEpistles", ["2 Jean", "2 Jn"], ["2 John", "2 John"]],
  ["3John", "generalEpistles", ["3 Jean", "3 Jn"], ["3 John", "3 John"]],
  ["Jude", "generalEpistles", ["Jude", "Jud"], ["Jude", "Jude"]],
  ["Rev", "apocalyptic", ["Apocalypse", "Ap"], ["Revelation", "Rev"]],
]

/** The 66 books in canonical order. */
export const books: readonly Book[] = rows.map(
  ([id, genre, [frName, frAbbreviation], [enName, enAbbreviation]], index) => ({
    id,
    order: index + 1,
    // Matthew is the 40th book.
    testament: index < 39 ? "old" : "new",
    genre,
    names: {
      fr: { name: frName, abbreviation: frAbbreviation },
      en: { name: enName, abbreviation: enAbbreviation },
    },
  })
)

const booksById = new Map(books.map((book) => [book.id, book]))

export function isBookId(value: string): value is BookId {
  return booksById.has(value as BookId)
}

/** Metadata of a book. */
export function getBook(id: BookId): Book {
  const book = booksById.get(id)
  if (!book) throw new Error(`Unknown book: ${id}`)
  return book
}

/** Localized name of a book, full ("Genèse") or abbreviated ("Gn"). */
export function getBookName(
  id: BookId,
  locale: Locale,
  style: "long" | "short" = "long"
): string {
  const names = getBook(id).names[locale]
  return style === "long" ? names.name : names.abbreviation
}
