"use client"

import { Moon, Sun, Sunrise, type LucideIcon } from "lucide-react"
import { useSyncExternalStore, type CSSProperties, type ReactNode } from "react"

import { currentPeriod, periods, type Period } from "@workspace/core"
import { cn } from "@workspace/ui/lib/utils"

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

/** The look of each moment: its sky, its light and its sun or moon. */
const looks: Record<
  Period,
  { icon: LucideIcon; sky: string; halo: string; body: string }
> = {
  morning: {
    icon: Sunrise,
    sky: "bg-[linear-gradient(135deg,#fff3dc_0%,#fbd6ac_55%,#f3b49b_100%)] text-brand-night ring-brand-night/10",
    halo: "bg-[#ffb85c]/70",
    body: "bg-[linear-gradient(180deg,#ffd98a,#ff9f5a)]",
  },
  day: {
    icon: Sun,
    sky: "bg-[linear-gradient(135deg,#eef7fe_0%,#cfe8fa_55%,#abd6f5_100%)] text-brand-night ring-brand-night/10",
    halo: "bg-[#fff1a8]",
    body: "bg-[linear-gradient(180deg,#fff3ad,#ffd23f)]",
  },
  night: {
    icon: Moon,
    sky: "bg-[linear-gradient(135deg,#0b1a33_0%,#10284a_55%,#22407a_100%)] text-brand-cream ring-white/15",
    halo: "bg-[#f4ebd0]/25",
    // A crescent: only the inner shadow of the disc is drawn.
    body: "-rotate-12 shadow-[inset_-9px_-6px_0_0_#f4ebd0]",
  },
}

/** A few stars, as dots around the text of the card. */
const stars: CSSProperties = {
  backgroundImage: [
    [8, 10, 1],
    [24, 6, 1.2],
    [41, 13, 1],
    [57, 7, 1.4],
    [71, 15, 1],
    [84, 94, 1.2],
    [52, 93, 1],
    [36, 90, 1.4],
  ]
    .map(
      ([x, y, r]) =>
        `radial-gradient(circle at ${x}% ${y}%, rgb(244 235 208 / 0.75) 0 ${r}px, transparent ${r! + 0.5}px)`
    )
    .join(","),
}

/**
 * The frame of the verse of the day: the sky of the moment (morning, day or
 * night) behind the text. The moment is read where the person is, so the card
 * is plain until the browser knows it.
 */
export function VerseCard({
  title,
  timeZone,
  children,
}: {
  title: string
  timeZone?: string | null
  children: ReactNode
}) {
  const period = useSyncExternalStore(
    subscribe,
    () => preview() ?? currentPeriod(timeZone),
    () => null
  )
  const look = period ? looks[period] : null
  const Icon = look?.icon

  return (
    <section
      aria-labelledby="verse-of-the-day"
      data-period={period ?? undefined}
      className={cn(
        "group relative isolate flex flex-col gap-5 overflow-hidden rounded-3xl p-6 ring-1 transition-colors sm:p-8",
        look?.sky ??
          "bg-brand-gold/15 text-brand-night ring-brand-gold/30 dark:text-neutral-100"
      )}
    >
      {look && (
        <div aria-hidden className="absolute inset-0 -z-10">
          {period === "night" && (
            <div className="absolute inset-0" style={stars} />
          )}
          <div
            className={cn(
              "absolute -top-20 -right-16 size-64 rounded-full blur-3xl",
              look.halo
            )}
          />
          <div
            className={cn(
              "absolute top-5 right-6 size-10 rounded-full sm:top-7 sm:right-8",
              look.body
            )}
          />
        </div>
      )}
      <h2
        id="verse-of-the-day"
        className="flex items-center gap-2 text-xs font-semibold tracking-[0.14em] uppercase opacity-70"
      >
        {Icon && <Icon aria-hidden className="size-4" />}
        {title}
      </h2>
      {children}
    </section>
  )
}
