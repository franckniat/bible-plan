"use client"

import { BookOpen } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { useSyncExternalStore } from "react"

import { formatPassage, parsePassageSlug, type Locale } from "@workspace/core"
import { buttonVariants } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

import { readLastRead } from "@/components/reader/last-read"
import { Link } from "@/i18n/navigation"

const subscribe = () => () => {}

/** Opens the last passage read on this device, if any. */
export function ResumeReading() {
  const t = useTranslations("BibleIndex")
  const locale = useLocale() as Locale
  const slug = useSyncExternalStore(subscribe, readLastRead, () => "")
  const passage = slug ? parsePassageSlug(slug) : null
  if (!passage) return null

  return (
    <Link
      href={`/read/${slug}`}
      className={cn(buttonVariants({ size: "lg" }), "h-11 self-start sm:px-5")}
    >
      <BookOpen />
      {t("resume", { passage: formatPassage(passage, locale) })}
    </Link>
  )
}
