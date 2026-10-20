import { SearchIcon } from "lucide-react"
import type { Metadata } from "next"
import { hasLocale } from "next-intl"
import { getLocale, getTranslations } from "next-intl/server"

import {
  getBookName,
  isBookId,
  parsePassageSlug,
  type Locale,
} from "@workspace/core"
import { prisma } from "@workspace/db"
import { Button } from "@workspace/ui/components/button"
import { Field, FieldGroup, FieldLabel } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"

import {
  NotesManager,
  type NoteView,
} from "@/components/notes/notes-manager"
import { routing } from "@/i18n/routing"
import { listNoteBooks, listNotes } from "@/server/services/meditation"
import { requireUser } from "@/server/session"

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/notes">): Promise<Metadata> {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) return {}
  const t = await getTranslations({ locale, namespace: "Notes" })
  return { title: `${t("title")} · Bible Plan` }
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

/** Meditation notes: reflections on passages, found by book or by words. */
export default async function NotesPage({
  searchParams,
}: PageProps<"/[locale]/notes">) {
  const user = await requireUser()
  const query = await searchParams
  const t = await getTranslations("Notes")
  const locale = (await getLocale()) as Locale

  const q = first(query.q)?.slice(0, 100)
  const bookParam = first(query.book)
  const book = bookParam && isBookId(bookParam) ? bookParam : undefined
  const newParam = first(query.new)
  const newPassage = newParam && parsePassageSlug(newParam) ? newParam : null

  const [notes, books] = await Promise.all([
    listNotes(prisma, user.id, { book, query: q }),
    listNoteBooks(prisma, user.id),
  ])
  // "all" stands for no filter: a select cannot submit an empty choice.
  const bookItems = [
    { value: "all", label: t("search.allBooks") },
    ...books
      .filter(isBookId)
      .map((id) => ({ value: id, label: getBookName(id, locale) })),
  ]
  const formatDate = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeZone: user.timezone || "UTC",
  })
  const views: NoteView[] = notes.map((note) => ({
    id: note.id,
    passage: note.passage,
    keyVerse: note.keyVerse,
    reflection: note.reflection,
    application: note.application,
    updated: formatDate.format(note.updatedAt),
  }))

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl font-semibold">{t("title")}</h1>
        <p className="text-muted-foreground">
          {t("description")}
        </p>
      </div>

      <form role="search" method="get">
        <FieldGroup className="flex-row flex-wrap items-end gap-3">
          <Field className="min-w-48 flex-1">
            <FieldLabel htmlFor="notes-q">{t("search.label")}</FieldLabel>
            <Input
              id="notes-q"
              name="q"
              type="search"
              defaultValue={q ?? ""}
              placeholder={t("search.placeholder")}
            />
          </Field>
          <Field className="w-auto">
            <FieldLabel htmlFor="notes-book">{t("search.book")}</FieldLabel>
            <Select
              name="book"
              items={bookItems}
              defaultValue={book ?? "all"}
            >
              <SelectTrigger id="notes-book" className="min-w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {bookItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Button type="submit" variant="outline">
            <SearchIcon data-icon="inline-start" />
            {t("search.submit")}
          </Button>
        </FieldGroup>
      </form>

      <NotesManager
        notes={views}
        newPassage={newPassage}
        filtered={Boolean(q || book)}
      />
    </div>
  )
}
