import { getLocale, getTranslations } from "next-intl/server"

import type { HeatmapCell, IsoDate } from "@workspace/core"
import { cn } from "@workspace/ui/lib/utils"

import { formatIsoDate } from "@/lib/dates"

const levelClass: Record<HeatmapCell["level"], string> = {
  0: "bg-brand-night/[0.07] dark:bg-white/10",
  1: "bg-brand-gold/30",
  2: "bg-brand-gold/55",
  3: "bg-brand-gold/80",
  4: "bg-brand-gold",
}

/**
 * The activity of the last weeks, a column per week from Monday to Sunday.
 * Each day says what was done in its title and for screen readers, since the
 * colour alone tells nothing to some people.
 */
export async function Heatmap({
  weeks,
  details,
}: {
  weeks: HeatmapCell[][]
  /** What each active day holds, for its label. */
  details: ReadonlyMap<IsoDate, string>
}) {
  const t = await getTranslations("Stats")
  const locale = await getLocale()

  return (
    <div className="overflow-x-auto pb-2">
      <ul
        aria-label={t("heatmap.label")}
        className="flex w-max gap-1"
      >
        {weeks.map((week) => (
          <li key={week[0]!.date}>
            <ul className="flex flex-col gap-1">
              {week.map((cell) => {
                const detail = details.get(cell.date)
                const label = `${formatIsoDate(cell.date, locale, { dateStyle: "long" })} · ${
                  detail ?? t("heatmap.nothing")
                }`
                return (
                  <li
                    key={cell.date}
                    title={cell.future ? undefined : label}
                    className={cn(
                      "size-3.5 rounded-sm sm:size-4",
                      cell.future ? "invisible" : levelClass[cell.level]
                    )}
                  >
                    {!cell.future && <span className="sr-only">{label}</span>}
                  </li>
                )
              })}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  )
}
