import { Search } from "lucide-react"
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
import { Input } from "@workspace/ui/components/input"

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
        <p className="text-brand-night/70 dark:text-neutral-100/70">
          {t("description")}
        </p>
      </div>

      <form
        role="search"
        method="get"
        className="flex flex-wrap items-end gap-3"
      >
        <div className="flex min-w-48 flex-1 flex-col gap-1.5">
          <label htmlFor="notes-q" className="text-sm font-medium">
            {t("search.label")}
          </label>
          <Input
            id="notes-q"
            name="q"
            type="search"
            defaultValue={q ?? ""}
            placeholder={t("search.placeholder")}
            className="h-10"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="notes-book" className="text-sm font-medium">
            {t("search.book")}
          </label>
          <select
            id="notes-book"
            name="book"
            defaultValue={book ?? ""}
            className="h-10 rounded-lg border border-input bg-transparent px-3"
          >
            <option value="">{t("search.allBooks")}</option>
            {books.filter(isBookId).map((id) => (
              <option key={id} value={id}>
                {getBookName(id, locale)}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" variant="outline" className="h-10">
          <Search />
          {t("search.submit")}
        </Button>
      </form>

      <NotesManager
        notes={views}
        newPassage={newPassage}
        filtered={Boolean(q || book)}
      />
    </div>
  )
}
