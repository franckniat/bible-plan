"use client"

import { ArrowDown, ArrowUp, Plus, X } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { useState, type FormEvent } from "react"

import {
  bookPassage,
  books,
  chaptersPassage,
  countVerses,
  coversWholeChapters,
  formatPassage,
  getBook,
  getBookName,
  getChapterCount,
  parseReference,
  type BookId,
  type Locale,
  type Passage,
} from "@workspace/core"
import { Button } from "@workspace/ui/components/button"
import {
  FieldError,
  FieldLegend,
  FieldSet,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { cn } from "@workspace/ui/lib/utils"

const presets = {
  bible: () => books.map((book) => bookPassage(book.id)),
  oldTestament: () =>
    books
      .filter((book) => book.testament === "old")
      .map((book) => bookPassage(book.id)),
  newTestament: () =>
    books
      .filter((book) => book.testament === "new")
      .map((book) => bookPassage(book.id)),
  gospels: () =>
    books
      .filter((book) => book.genre === "gospels")
      .map((book) => bookPassage(book.id)),
  psalms: () => [bookPassage("Ps")],
  proverbs: () => [bookPassage("Prov")],
} satisfies Record<string, () => Passage[]>

type Preset = keyof typeof presets

const chipClassName =
  "rounded-full border px-3 py-1.5 text-sm transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
const chipStateClassName = (active: boolean) =>
  active
    ? "border-brand-night bg-brand-night text-brand-cream dark:border-brand-gold dark:bg-brand-gold dark:text-neutral-950"
    : "border-brand-night/15 bg-white/60 hover:border-brand-night/40 dark:border-white/15 dark:bg-neutral-900/60 dark:hover:border-white/40"

const sameList = (a: Passage[], b: Passage[]) =>
  a.length === b.length &&
  a.every(
    (passage, index) => JSON.stringify(passage) === JSON.stringify(b[index])
  )

/** Inserts a whole book before the first passage of a later book. */
function insertBook(passages: Passage[], book: BookId): Passage[] {
  const order = getBook(book).order
  const index = passages.findIndex(
    (passage) => getBook(passage.book).order > order
  )
  const next = [...passages]
  next.splice(index === -1 ? next.length : index, 0, bookPassage(book))
  return next
}

/** Step 2: the books and passages to read, in order. */
export function SelectionStep({
  passages,
  onChange,
  free,
}: {
  passages: Passage[]
  onChange: (passages: Passage[]) => void
  /** Free selection: reorder the list and change chapter ranges. */
  free: boolean
}) {
  const t = useTranslations("PlanWizard.selection")
  const locale = useLocale() as Locale
  const [reference, setReference] = useState("")
  const [referenceError, setReferenceError] = useState(false)

  const selectedBooks = new Set(passages.map((passage) => passage.book))
  const verses = countVerses(passages)
  const chapters = passages.reduce(
    (total, { start, end }) => total + end.chapter - start.chapter + 1,
    0
  )

  function toggleBook(book: BookId) {
    onChange(
      selectedBooks.has(book)
        ? passages.filter((passage) => passage.book !== book)
        : insertBook(passages, book)
    )
  }

  function addReference(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = parseReference(reference, { locale })
    if (!parsed) {
      setReferenceError(true)
      return
    }
    onChange([...passages, ...parsed])
    setReference("")
    setReferenceError(false)
  }

  function move(index: number, offset: -1 | 1) {
    const next = [...passages]
    const [item] = next.splice(index, 1)
    next.splice(index + offset, 0, item!)
    onChange(next)
  }

  function setChapters(index: number, from: number, to: number) {
    const passage = passages[index]!
    const next = [...passages]
    next[index] = chaptersPassage(
      passage.book,
      Math.min(from, to),
      Math.max(from, to)
    )
    onChange(next)
  }

  return (
    <div className="flex flex-col gap-8">
      <FieldSet>
        <FieldLegend>{t("presets")}</FieldLegend>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(presets) as Preset[]).map((preset) => {
            const active = sameList(passages, presets[preset]())
            return (
              <button
                key={preset}
                type="button"
                aria-pressed={active}
                onClick={() => onChange(presets[preset]())}
                className={cn(chipClassName, chipStateClassName(active))}
              >
                {t(`preset.${preset}`)}
              </button>
            )
          })}
        </div>
      </FieldSet>

      <FieldSet>
        <FieldLegend>{t("books")}</FieldLegend>
        {(["old", "new"] as const).map((testament) => (
          <div key={testament} className="flex flex-col gap-2">
            <p className="text-sm text-brand-night/60 dark:text-neutral-100/60">
              {t(`testament.${testament}`)}
            </p>
            <div className="flex flex-wrap gap-2">
              {books
                .filter((book) => book.testament === testament)
                .map((book) => {
                  const active = selectedBooks.has(book.id)
                  return (
                    <button
                      key={book.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => toggleBook(book.id)}
                      className={cn(chipClassName, chipStateClassName(active))}
                    >
                      {getBookName(book.id, locale)}
                    </button>
                  )
                })}
            </div>
          </div>
        ))}
      </FieldSet>

      <form onSubmit={addReference} noValidate className="flex flex-col gap-2">
        <label htmlFor="reference" className="text-sm font-medium">
          {t("reference.label")}
        </label>
        <div className="flex gap-2">
          <Input
            id="reference"
            value={reference}
            onChange={(event) => {
              setReference(event.target.value)
              setReferenceError(false)
            }}
            placeholder={t("reference.placeholder")}
            aria-invalid={referenceError || undefined}
            aria-describedby={referenceError ? "reference-error" : undefined}
            className="h-10"
          />
          <Button
            type="submit"
            variant="outline"
            className="h-10"
            disabled={!reference.trim()}
          >
            <Plus />
            {t("reference.add")}
          </Button>
        </div>
        {referenceError && (
          <FieldError id="reference-error">{t("reference.invalid")}</FieldError>
        )}
      </form>

      <section
        aria-labelledby="selection-title"
        className="flex flex-col gap-3"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2
            id="selection-title"
            className="font-heading text-lg font-semibold"
          >
            {t("list.title")}
          </h2>
          {passages.length > 0 && (
            <p className="text-sm text-brand-night/60 dark:text-neutral-100/60">
              {t("list.summary", { chapters, verses })}
            </p>
          )}
        </div>
        {passages.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-brand-night/20 p-4 text-sm text-brand-night/60 dark:border-white/20 dark:text-neutral-100/60">
            {t("list.empty")}
          </p>
        ) : (
          <ol className="flex flex-col gap-2">
            {passages.map((passage, index) => {
              const label = formatPassage(passage, locale)
              const chapterCount = getChapterCount(passage.book)
              const editable =
                free && chapterCount > 1 && coversWholeChapters(passage)
              return (
                <li
                  key={`${index}-${label}`}
                  className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl bg-white/70 px-3 py-2 ring-1 ring-brand-night/10 dark:bg-neutral-900/70 dark:ring-white/10"
                >
                  <span className="min-w-0 flex-1 font-medium">{label}</span>
                  {editable && (
                    <span className="flex items-center gap-1.5 text-sm">
                      {(["from", "to"] as const).map((bound) => (
                        <select
                          key={bound}
                          aria-label={t(`list.${bound}`, { passage: label })}
                          value={
                            bound === "from"
                              ? passage.start.chapter
                              : passage.end.chapter
                          }
                          onChange={(event) => {
                            const value = Number(event.target.value)
                            if (bound === "from")
                              setChapters(index, value, passage.end.chapter)
                            else
                              setChapters(index, passage.start.chapter, value)
                          }}
                          className="h-8 rounded-lg border border-brand-night/15 bg-transparent px-1.5 dark:border-white/15"
                        >
                          {Array.from(
                            { length: chapterCount },
                            (_, chapter) => (
                              <option key={chapter + 1} value={chapter + 1}>
                                {chapter + 1}
                              </option>
                            )
                          )}
                        </select>
                      ))}
                    </span>
                  )}
                  <span className="flex items-center">
                    {free && (
                      <>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={index === 0}
                          onClick={() => move(index, -1)}
                          aria-label={t("list.moveUp", { passage: label })}
                        >
                          <ArrowUp />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={index === passages.length - 1}
                          onClick={() => move(index, 1)}
                          aria-label={t("list.moveDown", { passage: label })}
                        >
                          <ArrowDown />
                        </Button>
                      </>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        onChange(passages.filter((_, other) => other !== index))
                      }
                      aria-label={t("list.remove", { passage: label })}
                    >
                      <X />
                    </Button>
                  </span>
                </li>
              )
            })}
          </ol>
        )}
      </section>
    </div>
  )
}
