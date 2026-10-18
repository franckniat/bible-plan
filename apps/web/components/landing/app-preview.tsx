import { getLocale, getTranslations } from "next-intl/server"

import { PhoneFrame } from "@/components/landing/phone-frame"
import { landingImage } from "@/lib/landing-images"

// The reading screen with highlights is the one of the opening section.
const screens = ["today", "compare", "calendar"] as const

/** Screenshots of the web app, one phone per feature. */
export async function AppPreview() {
  const t = await getTranslations("Landing.preview")
  const locale = await getLocale()

  return (
    <section
      id="apercu"
      aria-labelledby="preview-title"
      className="mx-auto max-w-6xl scroll-mt-8 px-6 pb-24"
    >
      <div className="mx-auto mb-12 max-w-2xl text-center">
        <h2
          id="preview-title"
          className="font-heading text-3xl font-semibold tracking-tight text-balance sm:text-4xl"
        >
          {t("title")}
        </h2>
        <p className="mt-3 text-lg text-pretty text-brand-night/70 dark:text-neutral-100/70">
          {t("subtitle")}
        </p>
      </div>
      <ul className="grid gap-12 sm:grid-cols-3 sm:gap-8">
        {screens.map((screen) => (
          <li key={screen} className="flex flex-col items-center gap-6">
            <PhoneFrame
              src={landingImage(locale, screen)}
              alt={t(`${screen}.alt`)}
              className="max-w-[16rem]"
            />
            <div className="max-w-xs text-center">
              <h3 className="font-heading text-lg font-semibold">
                {t(`${screen}.title`)}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-brand-night/70 dark:text-neutral-100/70">
                {t(`${screen}.description`)}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
