import { Smartphone } from "lucide-react"
import { getTranslations } from "next-intl/server"

import { Badge } from "@workspace/ui/components/badge"

const upcoming = [{ key: "mobile", Icon: Smartphone }] as const

/** What is still to come, so the web app is not mistaken for the whole plan. */
export async function ComingSoon() {
  const t = await getTranslations("Landing.soon")

  return (
    <section
      aria-labelledby="soon-title"
      className="mx-auto max-w-6xl px-6 pb-24"
    >
      <h2
        id="soon-title"
        className="mb-8 text-center font-heading text-2xl font-semibold tracking-tight text-balance sm:text-3xl"
      >
        {t("title")}
      </h2>
      <ul className="mx-auto grid max-w-xl gap-4">
        {upcoming.map(({ key, Icon }) => (
          <li
            key={key}
            className="flex flex-col gap-3 rounded-3xl border border-dashed border-brand-night/20 p-6 dark:border-white/20"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="flex size-10 items-center justify-center rounded-2xl bg-brand-night/[0.06] dark:bg-white/10">
                <Icon aria-hidden className="size-5" />
              </span>
              <Badge variant="secondary">{t("badge")}</Badge>
            </div>
            <h3 className="font-heading text-lg font-semibold">
              {t(`${key}.title`)}
            </h3>
            <p className="text-sm leading-relaxed text-brand-night/70 dark:text-neutral-100/70">
              {t(`${key}.description`)}
            </p>
          </li>
        ))}
      </ul>
    </section>
  )
}
