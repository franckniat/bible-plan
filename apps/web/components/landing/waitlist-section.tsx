import { getTranslations } from "next-intl/server"
import type { ReactNode } from "react"

import { buttonVariants } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

import { BrandMark } from "@/components/brand/brand-mark"
import { Link } from "@/i18n/navigation"

/** The waitlist, in a section of its own: the invitation, then the form. */
export async function WaitlistSection({
  counter,
  children,
}: {
  /** Social proof shown under the invitation. */
  counter?: ReactNode
  /** The waitlist form. */
  children: ReactNode
}) {
  const t = await getTranslations("Landing.waitlist")

  return (
    <section
      id="waitlist"
      aria-labelledby="waitlist-title"
      className="scroll-mt-8 px-6 pb-20"
    >
      <div className="mx-auto grid max-w-6xl items-center gap-10 overflow-hidden rounded-[2rem] bg-brand-night px-6 py-12 text-brand-cream ring-1 ring-white/10 sm:px-12 sm:py-16 lg:grid-cols-[1fr_1.1fr] lg:gap-16 dark:bg-neutral-900">
        <div className="flex flex-col items-start gap-5">
          <BrandMark className="h-14" />
          <h2
            id="waitlist-title"
            className="font-heading text-3xl font-semibold tracking-tight text-balance sm:text-4xl"
          >
            {t("title")}
          </h2>
          <p className="max-w-lg text-lg text-pretty text-brand-cream/75">
            {t("description")}
          </p>
          {counter}
          <Link
            href="/read"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "h-11 border-white/30 bg-transparent px-6 text-base text-brand-cream hover:bg-white/10 hover:text-brand-cream"
            )}
          >
            {t("tryWeb")}
          </Link>
        </div>
        {/* The form is a light card: it sets its own text colour. */}
        <div className="text-brand-night dark:text-neutral-100">{children}</div>
      </div>
    </section>
  )
}
