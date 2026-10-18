"use client"

import { Columns2 } from "lucide-react"
import { useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"

import { bibleVersions, type BibleVersionId } from "@workspace/bible-data"
import { cn } from "@workspace/ui/lib/utils"

import { useRememberedComparison } from "@/components/reader/use-remembered-comparison"
import { usePathname, useRouter } from "@/i18n/navigation"
import {
  defaultComparison,
  formatCompareParam,
  maxComparedVersions,
  toggleComparedVersion,
} from "@/lib/compare"

/**
 * Turns the parallel reading on or off, and picks the versions read next to
 * the main one (`compare` in the address, so the page can be shared).
 */
export function ParallelToggle({
  main,
  others,
}: {
  main: BibleVersionId
  /** The versions read next to the main one now (none: not in parallel). */
  others: BibleVersionId[]
}) {
  const { remembered, remember } = useRememberedComparison()
  const t = useTranslations("Reader.parallel")
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const active = others.length > 0

  function go(next: BibleVersionId[]) {
    const params = new URLSearchParams(searchParams)
    if (next.length === 0) params.delete("compare")
    else params.set("compare", formatCompareParam(next))
    const search = params.toString()
    router.replace(search ? `${pathname}?${search}` : pathname)
    // What was compared is where the next comparison starts.
    if (next.length > 0) remember([main, ...next])
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        aria-pressed={active}
        onClick={() =>
          go(active ? [] : defaultComparison(main, remembered).slice(1))
        }
        className={cn(
          "flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
          active
            ? "border-brand-night bg-brand-night text-brand-cream dark:border-brand-gold dark:bg-brand-gold dark:text-neutral-950"
            : "border-brand-night/15 hover:bg-brand-night/[0.04] dark:border-white/15 dark:hover:bg-white/5"
        )}
      >
        <Columns2 aria-hidden className="size-4" />
        {t("label")}
      </button>
      {active &&
        bibleVersions
          .filter((version) => version.id !== main)
          .map((version) => {
            const on = others.includes(version.id)
            return (
              <button
                key={version.id}
                type="button"
                aria-pressed={on}
                title={version.name}
                onClick={() => {
                  const next = toggleComparedVersion(
                    [main, ...others],
                    version.id
                  ).slice(1)
                  // The last other version stays: the toggle above turns it off.
                  if (next.length > 0) go(next)
                }}
                className={cn(
                  "h-8 rounded-full px-3 text-sm ring-1 outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  on
                    ? "bg-brand-gold/25 ring-brand-gold"
                    : "ring-brand-night/20 hover:bg-brand-gold/10 dark:ring-white/25"
                )}
              >
                {version.abbreviation}
              </button>
            )
          })}
      {active && others.length >= maxComparedVersions - 1 && (
        <span className="text-xs text-brand-night/60 dark:text-neutral-100/60">
          {t("limit", { max: maxComparedVersions })}
        </span>
      )}
    </div>
  )
}
