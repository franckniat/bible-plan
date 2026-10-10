import { getTranslations } from "next-intl/server"

import { buttonVariants } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

import { BrandMark } from "@/components/brand/brand-mark"

export async function ClosingCall() {
  const t = await getTranslations("Landing.closing")

  return (
    <section className="px-6 pb-20">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-5 overflow-hidden rounded-[2rem] bg-brand-night px-6 py-14 text-center text-brand-cream ring-1 ring-white/10 sm:px-12 dark:bg-neutral-900">
        <BrandMark className="h-14" />
        <h2 className="font-heading text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          {t("title")}
        </h2>
        <p className="max-w-lg text-lg text-pretty text-brand-cream/75">
          {t("description")}
        </p>
        <a
          href="#waitlist"
          className={cn(
            buttonVariants({ size: "lg" }),
            "h-11 bg-brand-gold px-6 text-base text-brand-night hover:bg-brand-gold-soft"
          )}
        >
          {t("cta")}
        </a>
      </div>
    </section>
  )
}
