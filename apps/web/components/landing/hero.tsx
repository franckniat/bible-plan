import { getLocale, getTranslations } from "next-intl/server"

import { Badge } from "@workspace/ui/components/badge"
import { buttonVariants } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

import { PhoneFrame } from "@/components/landing/phone-frame"
import { landingImage } from "@/lib/landing-images"
import { Link } from "@/i18n/navigation"

/**
 * Opening section: the web app is open, so the first actions are to read and
 * to create an account; the waitlist stays one link away.
 */
export async function Hero() {
  const t = await getTranslations("Landing.hero")
  const locale = await getLocale()

  return (
    <section className="relative mx-auto grid max-w-6xl gap-12 px-6 pt-8 pb-20 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-16 lg:pt-16 lg:pb-28">
      <div className="flex flex-col gap-6">
        <Badge
          variant="outline"
          className="w-fit gap-2 border-brand-gold/50 bg-brand-gold/10 text-brand-night dark:text-brand-gold-soft"
        >
          {/* A live dot: the web app can be used now. */}
          <span aria-hidden className="size-1.5 rounded-full bg-green-500" />
          {t("eyebrow")}
        </Badge>
        <h1 className="font-heading text-4xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
          {t("title")}
        </h1>
        <p className="max-w-xl text-lg leading-relaxed text-pretty text-brand-night/75 dark:text-neutral-100/75">
          {t("subtitle")}
        </p>
        <figure className="max-w-xl border-l-2 border-brand-gold pl-4">
          <blockquote className="font-heading text-lg text-pretty italic">
            « {t("verse")} »
          </blockquote>
          <figcaption className="mt-1 text-sm text-brand-night/60 dark:text-neutral-100/60">
            {t("verseReference")}
          </figcaption>
        </figure>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/read"
              className={cn(
                buttonVariants({ size: "lg" }),
                "h-11 px-6 text-base"
              )}
            >
              {t("ctaRead")}
            </Link>
            <Link
              href="/sign-up"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "h-11 px-6 text-base"
              )}
            >
              {t("ctaSignUp")}
            </Link>
          </div>
          <a
            href="#waitlist"
            className="w-fit text-sm text-brand-night/70 underline underline-offset-4 hover:text-brand-night dark:text-neutral-100/70 dark:hover:text-neutral-100"
          >
            {t("waitlistLink")}
          </a>
        </div>
      </div>
      <div className="relative">
        <div
          aria-hidden
          className="absolute inset-x-4 top-1/2 h-3/4 -translate-y-1/2 rounded-full bg-brand-gold/25 blur-3xl dark:bg-brand-gold/15"
        />
        <PhoneFrame
          src={landingImage(locale, "reader")}
          alt={t("screenshotAlt")}
          priority
          className="relative lg:rotate-2"
        />
      </div>
    </section>
  )
}
