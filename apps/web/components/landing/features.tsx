import { BellRing, CalendarRange, HandHeart, Users } from "lucide-react"
import { getTranslations } from "next-intl/server"

const features = [
  { key: "plans", Icon: CalendarRange },
  { key: "reminders", Icon: BellRing },
  { key: "prayer", Icon: HandHeart },
  { key: "groups", Icon: Users },
] as const

export async function Features() {
  const t = await getTranslations("Landing.features")

  return (
    <section
      aria-labelledby="features-title"
      className="mx-auto max-w-6xl px-6 pb-24"
    >
      <div className="mx-auto mb-12 max-w-2xl text-center">
        <h2
          id="features-title"
          className="font-heading text-3xl font-semibold tracking-tight text-balance sm:text-4xl"
        >
          {t("title")}
        </h2>
        <p className="mt-3 text-lg text-pretty text-brand-night/70 dark:text-neutral-100/70">
          {t("subtitle")}
        </p>
      </div>
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {features.map(({ key, Icon }) => (
          <li
            key={key}
            className="flex flex-col gap-4 rounded-3xl bg-white/70 p-6 ring-1 ring-brand-night/10 dark:bg-neutral-900/70 dark:ring-white/10"
          >
            <span className="flex size-11 items-center justify-center rounded-2xl bg-brand-gold/20 text-brand-night dark:text-brand-gold">
              <Icon aria-hidden className="size-5" />
            </span>
            <h3 className="font-heading text-xl font-semibold">
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
