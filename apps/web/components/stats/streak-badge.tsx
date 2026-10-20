import { Flame } from "lucide-react"
import { getTranslations } from "next-intl/server"

import type { Streak } from "@workspace/core"
import { cn } from "@workspace/ui/lib/utils"

import { Link } from "@/i18n/navigation"

/** The current streak, with a nudge when today is still to do. */
export async function StreakBadge({ streak }: { streak: Streak }) {
  const t = await getTranslations("Stats")
  const alive = streak.current > 0

  return (
    <Link
      href="/stats"
      className={cn(
        "flex items-center gap-3 rounded-3xl p-4 ring-1 transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
        alive
          ? "bg-brand-gold/15 ring-brand-gold/30 hover:bg-brand-gold/25"
          : "bg-white/85 ring-brand-night/10 hover:bg-white dark:bg-neutral-900/85 dark:ring-white/10 dark:hover:bg-neutral-900"
      )}
    >
      <Flame
        aria-hidden
        className={cn("size-6", alive ? "text-brand-gold" : "text-brand-night/40 dark:text-neutral-100/40")}
      />
      <span className="flex flex-col">
        <span className="font-medium">
          {alive
            ? t("streak.days", { count: streak.current })
            : t("streak.none")}
        </span>
        <span className="text-sm text-brand-night/70 dark:text-neutral-100/70">
          {streak.activeToday
            ? t("streak.todayDone")
            : alive
              ? t("streak.keepGoing")
              : t("streak.start")}
        </span>
      </span>
    </Link>
  )
}
