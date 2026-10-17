"use client"

import { useSyncExternalStore, type ReactNode } from "react"

import { cn } from "@workspace/ui/lib/utils"

import { DayScene } from "@/components/reader/day-scene"
import { currentPeriod, periods, type Period } from "@/lib/day-period"

const minute = 60_000

function subscribe(onChange: () => void) {
  const timer = setInterval(onChange, minute)
  return () => clearInterval(timer)
}

/** `?scene=night` shows a moment of the day on demand (development only). */
function preview(): Period | null {
  if (process.env.NODE_ENV === "production") return null
  const scene = new URLSearchParams(window.location.search).get("scene")
  return periods.find((period) => period === scene) ?? null
}

/**
 * The frame of the verse of the day: the sky of the moment (morning, day or
 * night) behind the text. The moment is read where the person is, so the card
 * is plain until the browser knows it.
 */
export function VerseCard({
  timeZone,
  children,
}: {
  timeZone?: string | null
  children: ReactNode
}) {
  const period = useSyncExternalStore(
    subscribe,
    () => preview() ?? currentPeriod(timeZone),
    () => null
  )

  return (
    <section
      aria-labelledby="verse-of-the-day"
      data-period={period ?? undefined}
      className={cn(
        "group relative isolate flex min-h-44 flex-col justify-between gap-3 overflow-hidden rounded-3xl p-5 ring-1 transition-colors",
        // Narrow card: a band of sky above the text, for the sun or the moon.
        period && "pt-28 sm:pt-5",
        period === null &&
          "bg-brand-gold/15 text-brand-night ring-brand-gold/30 dark:text-neutral-100",
        period === "night"
          ? "text-brand-cream ring-white/15"
          : period && "text-brand-night ring-brand-night/10"
      )}
    >
      {period && (
        <div aria-hidden className="absolute inset-0 -z-10">
          <div className="size-full sm:hidden">
            <DayScene period={period} compact />
          </div>
          <div className="hidden size-full sm:block">
            <DayScene period={period} />
          </div>
        </div>
      )}
      {children}
    </section>
  )
}
