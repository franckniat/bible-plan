import { getTranslations } from "next-intl/server"
import type { ReactNode } from "react"

import { Badge } from "@workspace/ui/components/badge"

/** Opening section: the promise on the left, the waitlist form on the right. */
export async function Hero({
  counter,
  children,
}: {
  /** Social proof shown under the verse. */
  counter?: ReactNode
  /** The waitlist form. */
  children?: ReactNode
}) {
  const t = await getTranslations("Landing.hero")

  return (
    <section className="relative mx-auto grid max-w-6xl gap-12 px-6 pt-8 pb-20 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-16 lg:pt-16 lg:pb-28">
      <div className="flex flex-col gap-6">
        <Badge
          variant="outline"
          className="w-fit border-brand-gold/50 bg-brand-gold/10 text-brand-night dark:text-brand-gold-soft"
        >
          {t("eyebrow")}
        </Badge>
        <h1 className="font-heading text-4xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
          {t("title")}
        </h1>
        <p className="max-w-xl text-lg leading-relaxed text-pretty text-brand-night/75 dark:text-brand-cream/75">
          {t("subtitle")}
        </p>
        <figure className="max-w-xl border-l-2 border-brand-gold pl-4">
          <blockquote className="font-heading text-lg text-pretty italic">
            « {t("verse")} »
          </blockquote>
          <figcaption className="mt-1 text-sm text-brand-night/60 dark:text-brand-cream/60">
            {t("verseReference")}
          </figcaption>
        </figure>
        {counter}
      </div>
      {children}
    </section>
  )
}
