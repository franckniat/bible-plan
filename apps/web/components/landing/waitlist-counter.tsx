import { Users } from "lucide-react"
import { getTranslations } from "next-intl/server"

import { cn } from "@workspace/ui/lib/utils"

/** Below this, the counter would discourage rather than reassure. */
const MIN_COUNT_TO_SHOW = 10

export async function WaitlistCounter({
  count,
  className = "text-brand-night/80 dark:text-neutral-100/80",
}: {
  count: number | null
  className?: string
}) {
  if (count === null || count < MIN_COUNT_TO_SHOW) return null

  const t = await getTranslations("Landing.hero")

  return (
    <p className={cn("flex items-center gap-2 text-sm font-medium", className)}>
      <Users aria-hidden className="size-4 text-brand-gold" />
      {t("counter", { count })}
    </p>
  )
}
