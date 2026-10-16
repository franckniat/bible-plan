import { ChevronDown } from "lucide-react"
import type { Metadata } from "next"
import { hasLocale } from "next-intl"
import { getLocale, getTranslations } from "next-intl/server"

import {
  books,
  chaptersPassage,
  getBookName,
  getChapterCount,
  toPassageSlug,
  type Locale,
} from "@workspace/core"

import { ResumeReading } from "@/components/reader/resume-reading"
import { Link } from "@/i18n/navigation"
import { routing } from "@/i18n/routing"
import { requireUser } from "@/server/session"

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/read">): Promise<Metadata> {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) return {}
  const t = await getTranslations({ locale, namespace: "BibleIndex" })
  return { title: `${t("title")} · Bible Plan` }
}

const chapterHref = (book: (typeof books)[number]["id"], chapter: number) =>
  `/read/${toPassageSlug(chaptersPassage(book, chapter))}`

/** The Bible to read freely, outside any plan: books, then chapters. */
export default async function BibleIndexPage() {
  await requireUser()
  const t = await getTranslations("BibleIndex")
  const locale = (await getLocale()) as Locale

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-3xl font-semibold">{t("title")}</h1>
          <p className="text-brand-night/70 dark:text-neutral-100/70">
            {t("description")}
          </p>
        </div>
        <ResumeReading />
      </div>

      {(["old", "new"] as const).map((testament) => (
        <section
          key={testament}
          aria-labelledby={`${testament}-testament`}
          className="flex flex-col gap-3"
        >
          <h2
            id={`${testament}-testament`}
            className="font-heading text-xl font-semibold"
          >
            {t(`testament.${testament}`)}
          </h2>
          <ul className="grid items-start gap-2 sm:grid-cols-2">
            {books
              .filter((book) => book.testament === testament)
              .map((book) => {
                const name = getBookName(book.id, locale)
                const chapters = getChapterCount(book.id)
                const rowClassName =
                  "flex items-center justify-between gap-3 rounded-2xl px-4 py-3 outline-none focus-visible:ring-3 focus-visible:ring-ring/40"
                return (
                  <li
                    key={book.id}
                    className="rounded-2xl bg-white/85 ring-1 ring-brand-night/10 dark:bg-neutral-900/85 dark:ring-white/10"
                  >
                    {chapters === 1 ? (
                      // One chapter: the book opens directly.
                      <Link
                        href={chapterHref(book.id, 1)}
                        className={rowClassName}
                      >
                        <span className="font-medium">{name}</span>
                        <span className="text-sm text-brand-night/60 dark:text-neutral-100/60">
                          {t("chapters", { count: 1 })}
                        </span>
                      </Link>
                    ) : (
                      <details className="group">
                        <summary
                          className={`${rowClassName} cursor-pointer list-none [&::-webkit-details-marker]:hidden`}
                        >
                          <span className="font-medium">{name}</span>
                          <span className="flex items-center gap-2 text-sm text-brand-night/60 dark:text-neutral-100/60">
                            {t("chapters", { count: chapters })}
                            <ChevronDown
                              aria-hidden
                              className="size-4 transition-transform group-open:rotate-180"
                            />
                          </span>
                        </summary>
                        <ol className="grid grid-cols-6 gap-1.5 px-4 pb-4 sm:grid-cols-8">
                          {Array.from({ length: chapters }, (_, index) => (
                            <li key={index}>
                              <Link
                                href={chapterHref(book.id, index + 1)}
                                aria-label={t("chapter", {
                                  book: name,
                                  chapter: index + 1,
                                })}
                                className="flex h-9 items-center justify-center rounded-lg border border-brand-night/15 text-sm transition-colors hover:border-brand-night/40 hover:bg-brand-night/[0.04] dark:border-white/15 dark:hover:border-white/40 dark:hover:bg-white/5"
                              >
                                {index + 1}
                              </Link>
                            </li>
                          ))}
                        </ol>
                      </details>
                    )}
                  </li>
                )
              })}
          </ul>
        </section>
      ))}
    </div>
  )
}
