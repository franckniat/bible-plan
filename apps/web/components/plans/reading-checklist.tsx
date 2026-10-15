"use client"

import { Check } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { startTransition, useOptimistic, useState } from "react"

import { formatPassage, type Locale, type Passage } from "@workspace/core"
import { cn } from "@workspace/ui/lib/utils"

import { setReadingProgressAction } from "@/server/actions/plans"

export type ChecklistReading = {
  id: string
  passage: Passage
  verses: number
  done: boolean
  /** Name of the track, for plans with several. */
  trackName?: string | null
}

/**
 * Readings to tick off. A tick shows at once and is saved in the
 * background; it is undone if saving fails.
 */
export function ReadingChecklist({
  readings,
  className,
}: {
  readings: ChecklistReading[]
  className?: string
}) {
  const t = useTranslations("Readings")
  const locale = useLocale() as Locale
  const [failed, setFailed] = useState(false)
  const [optimistic, setOptimistic] = useOptimistic(
    readings,
    (current, { id, done }: { id: string; done: boolean }) =>
      current.map((reading) =>
        reading.id === id ? { ...reading, done } : reading
      )
  )

  function toggle(id: string, done: boolean) {
    setFailed(false)
    startTransition(async () => {
      setOptimistic({ id, done })
      const { ok } = await setReadingProgressAction(id, done).catch(() => ({
        ok: false,
      }))
      if (!ok) setFailed(true)
    })
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <ul className="flex flex-col gap-2">
        {optimistic.map((reading) => {
          const label = formatPassage(reading.passage, locale)
          return (
            <li key={reading.id}>
              <label
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-2xl border px-3 py-2.5 transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/40",
                  reading.done
                    ? "border-brand-gold/50 bg-brand-gold/10"
                    : "border-brand-night/15 bg-white/60 hover:border-brand-night/30 dark:border-white/15 dark:bg-neutral-900/60 dark:hover:border-white/30"
                )}
              >
                <input
                  type="checkbox"
                  checked={reading.done}
                  onChange={(event) => toggle(reading.id, event.target.checked)}
                  aria-label={
                    reading.trackName
                      ? `${label} (${reading.trackName})`
                      : label
                  }
                  className="sr-only"
                />
                <span
                  aria-hidden
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                    reading.done
                      ? "border-brand-gold bg-brand-gold text-neutral-950"
                      : "border-brand-night/30 dark:border-white/30"
                  )}
                >
                  {reading.done && <Check className="size-4" strokeWidth={3} />}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  {reading.trackName && (
                    <span className="text-xs text-brand-night/60 dark:text-neutral-100/60">
                      {reading.trackName}
                    </span>
                  )}
                  <span
                    className={cn(
                      "font-medium",
                      reading.done &&
                        "text-brand-night/70 dark:text-neutral-100/70"
                    )}
                  >
                    {label}
                  </span>
                </span>
                <span className="shrink-0 text-xs text-brand-night/55 dark:text-neutral-100/55">
                  {t("verses", { verses: reading.verses })}
                </span>
              </label>
            </li>
          )
        })}
      </ul>
      {failed && (
        <p role="alert" className="text-sm text-destructive">
          {t("saveFailed")}
        </p>
      )}
    </div>
  )
}
