"use client"

import { useLocale, useTranslations } from "next-intl"
import { useId, useMemo, useState } from "react"

import {
  bookIds,
  chaptersPassage,
  coversWholeChapters,
  getBookName,
  getChapterCount,
  getVerseCount,
  parsePassageSlug,
  toPassageSlug,
  type BookId,
  type Locale,
} from "@workspace/core"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@workspace/ui/components/combobox"
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group"

type Scope = "chapter" | "chapters" | "verses"

type Selection = {
  book: BookId | null
  chapter: number
  /** Last chapter, for several chapters. */
  endChapter: number
  verseFrom: number
  verseTo: number
  scope: Scope
}

const emptySelection: Selection = {
  book: null,
  chapter: 1,
  endChapter: 1,
  verseFrom: 1,
  verseTo: 1,
  scope: "chapter",
}

function selectionOf(slug: string): Selection {
  const passage = parsePassageSlug(slug)
  if (!passage) return emptySelection
  const { book, start, end } = passage
  if (coversWholeChapters(passage)) {
    return {
      book,
      chapter: start.chapter,
      endChapter: end.chapter,
      verseFrom: 1,
      verseTo: getVerseCount(book, start.chapter),
      scope: start.chapter === end.chapter ? "chapter" : "chapters",
    }
  }
  if (start.chapter !== end.chapter) {
    return {
      book,
      chapter: start.chapter,
      endChapter: end.chapter,
      verseFrom: 1,
      verseTo: getVerseCount(book, start.chapter),
      scope: "chapters",
    }
  }
  return {
    book,
    chapter: start.chapter,
    endChapter: start.chapter,
    verseFrom: start.verse,
    verseTo: end.verse,
    scope: "verses",
  }
}

/** The slug of a selection, or "" while no book is chosen. */
function slugOf(selection: Selection): string {
  const { book, chapter, endChapter, verseFrom, verseTo, scope } = selection
  if (!book) return ""
  if (scope === "chapter") return toPassageSlug(chaptersPassage(book, chapter))
  if (scope === "chapters") {
    return toPassageSlug(chaptersPassage(book, chapter, endChapter))
  }
  return toPassageSlug({
    book,
    start: { chapter, verse: verseFrom },
    end: { chapter, verse: verseTo },
  })
}

/** Lowercase without diacritics, so "genese" finds "Genèse". */
function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
}

const numbers = (from: number, to: number) =>
  Array.from({ length: Math.max(0, to - from + 1) }, (_, i) => from + i)

type Option = { value: string; label: string }

function NumberSelect({
  id,
  label,
  value,
  from,
  to,
  onChange,
}: {
  id: string
  label: string
  value: number
  from: number
  to: number
  onChange: (value: number) => void
}) {
  const options: Option[] = numbers(from, to).map((n) => ({
    value: String(n),
    label: String(n),
  }))
  return (
    <Select
      items={options}
      value={String(value)}
      onValueChange={(next) => next && onChange(Number(next))}
    >
      <SelectTrigger id={id} aria-label={label} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}

/**
 * Chooses a passage of the Bible: a book (searchable), a chapter, and either
 * the whole chapter, several chapters or some verses. Gives a passage slug
 * ("John.3.16-21"), or "" while no book is chosen.
 */
export function PassagePicker({
  value,
  onChange,
  id,
}: {
  value: string
  onChange: (slug: string) => void
  id?: string
}) {
  const t = useTranslations("PassagePicker")
  const locale = useLocale() as Locale
  const generatedId = useId()
  const baseId = id ?? generatedId
  const [selection, setSelection] = useState<Selection>(() =>
    selectionOf(value)
  )

  const books = useMemo(
    () => bookIds.map((book) => ({ book, name: getBookName(book, locale) })),
    [locale]
  )
  const current = books.find((item) => item.book === selection.book) ?? null

  function update(patch: Partial<Selection>) {
    const next = { ...selection, ...patch }
    const { book } = next
    if (book) {
      const chapters = getChapterCount(book)
      next.chapter = Math.min(Math.max(1, next.chapter), chapters)
      next.endChapter = Math.min(
        Math.max(next.chapter, next.endChapter),
        chapters
      )
      const verses = getVerseCount(book, next.chapter)
      next.verseFrom = Math.min(Math.max(1, next.verseFrom), verses)
      next.verseTo = Math.min(Math.max(next.verseFrom, next.verseTo), verses)
    }
    setSelection(next)
    onChange(slugOf(next))
  }

  const book = selection.book
  const chapterCount = book ? getChapterCount(book) : 0
  const verseCount = book ? getVerseCount(book, selection.chapter) : 0
  const scopes: { value: Scope; label: string }[] = [
    { value: "chapter", label: t("scope.chapter") },
    { value: "chapters", label: t("scope.chapters") },
    { value: "verses", label: t("scope.verses") },
  ]

  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor={`${baseId}-book`}>{t("book")}</FieldLabel>
        <Combobox
          items={books}
          value={current}
          onValueChange={(item) =>
            // Another book starts again at its first chapter.
            update({
              book: item?.book ?? null,
              chapter: 1,
              endChapter: 1,
              verseFrom: 1,
              verseTo: item ? getVerseCount(item.book, 1) : 1,
            })
          }
          itemToStringLabel={(item: (typeof books)[number]) => item.name}
          itemToStringValue={(item: (typeof books)[number]) => item.book}
          isItemEqualToValue={(a: (typeof books)[number], b) =>
            a.book === b.book
          }
          filter={(item: (typeof books)[number], query: string) =>
            normalize(item.name).includes(normalize(query.trim()))
          }
          autoHighlight
        >
          <ComboboxInput
            id={`${baseId}-book`}
            placeholder={t("bookPlaceholder")}
            showClear={current !== null}
            triggerLabel={t("showBooks")}
            clearLabel={t("clear")}
          />
          <ComboboxContent>
            <ComboboxEmpty>{t("noBook")}</ComboboxEmpty>
            <ComboboxList>
              {(item: (typeof books)[number]) => (
                <ComboboxItem key={item.book} value={item}>
                  {item.name}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      </Field>

      {book && (
        <>
          <Field>
            <FieldLabel>{t("scope.label")}</FieldLabel>
            <ToggleGroup
              variant="outline"
              value={[selection.scope]}
              onValueChange={(next) => {
                const scope = next[0] as Scope | undefined
                // A group of toggles lets the chosen one be unchecked: keep it.
                if (scope) update({ scope })
              }}
              aria-label={t("scope.label")}
            >
              {scopes.map((scope) => (
                <ToggleGroupItem key={scope.value} value={scope.value}>
                  {scope.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </Field>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Field>
              <FieldLabel htmlFor={`${baseId}-chapter`}>
                {selection.scope === "chapters"
                  ? t("fromChapter")
                  : t("chapter")}
              </FieldLabel>
              <NumberSelect
                id={`${baseId}-chapter`}
                label={t("chapter")}
                value={selection.chapter}
                from={1}
                to={chapterCount}
                onChange={(chapter) => update({ chapter })}
              />
            </Field>
            {selection.scope === "chapters" && (
              <Field>
                <FieldLabel htmlFor={`${baseId}-end-chapter`}>
                  {t("toChapter")}
                </FieldLabel>
                <NumberSelect
                  id={`${baseId}-end-chapter`}
                  label={t("toChapter")}
                  value={selection.endChapter}
                  from={selection.chapter}
                  to={chapterCount}
                  onChange={(endChapter) => update({ endChapter })}
                />
              </Field>
            )}
            {selection.scope === "verses" && (
              <>
                <Field>
                  <FieldLabel htmlFor={`${baseId}-from`}>
                    {t("fromVerse")}
                  </FieldLabel>
                  <NumberSelect
                    id={`${baseId}-from`}
                    label={t("fromVerse")}
                    value={selection.verseFrom}
                    from={1}
                    to={verseCount}
                    onChange={(verseFrom) => update({ verseFrom })}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={`${baseId}-to`}>
                    {t("toVerse")}
                  </FieldLabel>
                  <NumberSelect
                    id={`${baseId}-to`}
                    label={t("toVerse")}
                    value={selection.verseTo}
                    from={selection.verseFrom}
                    to={verseCount}
                    onChange={(verseTo) => update({ verseTo })}
                  />
                </Field>
              </>
            )}
          </div>
        </>
      )}
    </FieldGroup>
  )
}
