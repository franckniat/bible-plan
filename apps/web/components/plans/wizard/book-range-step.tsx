"use client"

import { useLocale, useTranslations } from "next-intl"

import {
  bookPassage,
  books,
  countVerses,
  getBook,
  getBookName,
  getChapterCount,
  type BookId,
  type Locale,
  type Passage,
} from "@workspace/core"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"

/** Every book from the first to the last, in the order of the Bible. */
export function bookRange(from: BookId, to: BookId): Passage[] {
  const [first, last] = [getBook(from).order, getBook(to).order].sort(
    (a, b) => a - b
  )
  return books
    .filter((book) => book.order >= first! && book.order <= last!)
    .map((book) => bookPassage(book.id))
}

/**
 * Step 2 of a plan by chapters per day: the book to start with and the book
 * to end with. Everything between them is read, in the order of the Bible.
 */
export function BookRangeStep({
  passages,
  onChange,
}: {
  passages: Passage[]
  onChange: (passages: Passage[]) => void
}) {
  const t = useTranslations("PlanWizard.range")
  const locale = useLocale() as Locale

  const from = passages[0]?.book ?? null
  const to = passages.at(-1)?.book ?? null
  const items = books.map((book) => ({
    value: book.id,
    label: getBookName(book.id, locale),
  }))

  function change(side: "from" | "to", chosen: BookId) {
    const start = side === "from" ? chosen : (from ?? chosen)
    const end = side === "to" ? chosen : (to ?? chosen)
    // A first book after the last one moves the last one along with it.
    onChange(
      getBook(start).order <= getBook(end).order
        ? bookRange(start, end)
        : bookRange(start, start)
    )
  }

  const chapters = passages.reduce(
    (total, passage) => total + getChapterCount(passage.book),
    0
  )

  const picker = (side: "from" | "to", value: BookId | null) => (
    <Field>
      <FieldLabel htmlFor={`range-${side}`}>{t(side)}</FieldLabel>
      <Select
        items={items}
        value={value}
        onValueChange={(chosen) => chosen && change(side, chosen as BookId)}
      >
        <SelectTrigger id={`range-${side}`} className="w-full">
          <SelectValue placeholder={t("placeholder")} />
        </SelectTrigger>
        <SelectContent>
          {(["old", "new"] as const).map((testament) => (
            <SelectGroup key={testament}>
              <SelectLabel>{t(`testaments.${testament}`)}</SelectLabel>
              {books
                .filter((book) => book.testament === testament)
                // After the first book for the last one: nothing earlier.
                .filter(
                  (book) =>
                    side === "from" ||
                    from === null ||
                    book.order >= getBook(from).order
                )
                .map((book) => (
                  <SelectItem key={book.id} value={book.id}>
                    {getBookName(book.id, locale)}
                  </SelectItem>
                ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
    </Field>
  )

  return (
    <FieldGroup>
      <div className="grid gap-5 sm:grid-cols-2">
        {picker("from", from)}
        {picker("to", to)}
      </div>
      {passages.length > 0 ? (
        <FieldDescription aria-live="polite">
          {t("summary", {
            books: passages.length,
            chapters,
            verses: countVerses(passages),
          })}
        </FieldDescription>
      ) : (
        <FieldDescription>{t("hint")}</FieldDescription>
      )}
    </FieldGroup>
  )
}
