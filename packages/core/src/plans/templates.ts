import { books, type Testament } from "../bible/books"
import { parseReference } from "../bible/parse"
import { bookPassage, type Passage } from "../bible/passage"
import type { IsoDate, Locale, Weekday } from "../schemas/common"
import type { PlanInput, PlanPace } from "./schema"

type Localized = Record<Locale, string>

/** One track of a template: what is read, in order, and its name if any. */
export type PlanTemplateTrack = {
  /** Shown next to the readings when the plan has several tracks. */
  name?: Localized
  passages: Passage[]
}

export type PlanTemplate = {
  /** Stable identifier, stored with the plans created from the template. */
  key: string
  title: Localized
  description: Localized
  tracks: PlanTemplateTrack[]
  /** Number of reading days at the intended pace. */
  days: number
}

/**
 * Passages from English references ("Gen 1-11; Job; Gen 12-50"). Template
 * data is written in code, so a typo must fail loudly.
 */
export function references(text: string): Passage[] {
  const passages = parseReference(text, { locale: "en" })
  if (!passages) throw new Error(`Invalid template reference: ${text}`)
  return passages
}

/** Whole books of a testament, or of the whole Bible, in canonical order. */
function wholeBooks(testament?: Testament): Passage[] {
  return books
    .filter((book) => !testament || book.testament === testament)
    .map((book) => bookPassage(book.id))
}

const bibleInAYear: PlanTemplate = {
  key: "bible-1-year",
  title: { fr: "La Bible en un an", en: "The Bible in a year" },
  description: {
    fr: "Toute la Bible, de la Genèse à l’Apocalypse, dans l’ordre des livres : environ 85 versets par jour pendant 365 jours.",
    en: "The whole Bible, from Genesis to Revelation, in book order: about 85 verses a day for 365 days.",
  },
  tracks: [{ passages: wholeBooks() }],
  days: 365,
}

const newTestament90Days: PlanTemplate = {
  key: "new-testament-90-days",
  title: {
    fr: "Le Nouveau Testament en 90 jours",
    en: "The New Testament in 90 days",
  },
  description: {
    fr: "De Matthieu à l’Apocalypse en trois mois, environ trois chapitres par jour.",
    en: "From Matthew to Revelation in three months, about three chapters a day.",
  },
  tracks: [{ passages: wholeBooks("new") }],
  days: 90,
}

const gospels30Days: PlanTemplate = {
  key: "gospels-30-days",
  title: { fr: "Les Évangiles en 30 jours", en: "The Gospels in 30 days" },
  description: {
    fr: "La vie de Jésus selon Matthieu, Marc, Luc et Jean, environ trois chapitres par jour pendant un mois.",
    en: "The life of Jesus according to Matthew, Mark, Luke and John, about three chapters a day for a month.",
  },
  tracks: [{ passages: references("Matt; Mark; Luke; John") }],
  days: 30,
}

const psalmsAndProverbs: PlanTemplate = {
  key: "psalms-proverbs-31-days",
  title: {
    fr: "Psaumes et Proverbes en un mois",
    en: "Psalms and Proverbs in a month",
  },
  description: {
    fr: "Chaque jour quelques psaumes et un chapitre des Proverbes : les 150 psaumes et les 31 chapitres des Proverbes en 31 jours.",
    en: "Every day a few psalms and one chapter of Proverbs: all 150 psalms and the 31 chapters of Proverbs in 31 days.",
  },
  tracks: [
    { name: { fr: "Psaumes", en: "Psalms" }, passages: references("Ps") },
    { name: { fr: "Proverbes", en: "Proverbs" }, passages: references("Prov") },
  ],
  days: 31,
}

/** Plans ready to adopt, in the order they are offered. */
export const planTemplates: readonly PlanTemplate[] = [
  bibleInAYear,
  newTestament90Days,
  gospels30Days,
  psalmsAndProverbs,
]

export function getPlanTemplate(key: string): PlanTemplate | undefined {
  return planTemplates.find((template) => template.key === key)
}

/**
 * Generator input to adopt a template. The start date and reading days are
 * chosen by the user; the pace defaults to the template's number of days.
 */
export function templatePlanInput(
  template: PlanTemplate,
  options: {
    startDate: IsoDate
    activeWeekdays?: Weekday[]
    pace?: PlanPace
  }
): PlanInput {
  return {
    tracks: template.tracks.map((track) => ({ passages: track.passages })),
    startDate: options.startDate,
    activeWeekdays: options.activeWeekdays,
    pace: options.pace ?? { mode: "days", days: template.days },
  }
}
