import { Users } from "lucide-react"
import { getTranslations } from "next-intl/server"

/** Below this, the counter would discourage rather than reassure. */
const MIN_COUNT_TO_SHOW = 10

export async function WaitlistCounter({ count }: { count: number | null }) {
  if (count === null || count < MIN_COUNT_TO_SHOW) return null

  const t = await getTranslations("Landing.hero")

  return (
    <p className="flex items-center gap-2 text-sm font-medium text-brand-night/80 dark:text-neutral-100/80">
      <Users aria-hidden className="size-4 text-brand-gold" />
      {t("counter", { count })}
    </p>
  )
}
