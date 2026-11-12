import { Download, Smartphone } from "lucide-react"
import { getTranslations } from "next-intl/server"

import { Badge } from "@workspace/ui/components/badge"
import { buttonVariants } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

import { betaGuideUrl, type MobileBeta } from "@/server/services/mobile-beta"

/**
 * The mobile app: its Android beta to download when one is published
 * (GitHub releases), else what is still to come, so the web app is not
 * mistaken for the whole plan.
 */
export async function ComingSoon({ beta }: { beta: MobileBeta | null }) {
  const t = await getTranslations("Landing.soon")

  return (
    <section
      id="mobile"
      aria-labelledby="soon-title"
      className="mx-auto max-w-6xl scroll-mt-24 px-6 pb-24"
    >
      <h2
        id="soon-title"
        className="mb-8 text-center font-heading text-2xl font-semibold tracking-tight text-balance sm:text-3xl"
      >
        {t(beta ? "betaTitle" : "title")}
      </h2>
      <div
        className={cn(
          "mx-auto flex max-w-xl flex-col gap-3 rounded-3xl p-6",
          beta
            ? "border border-brand-gold/50 bg-brand-gold/10"
            : "border border-dashed border-brand-night/20 dark:border-white/20"
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="flex size-10 items-center justify-center rounded-2xl bg-brand-night/[0.06] dark:bg-white/10">
            <Smartphone aria-hidden className="size-5" />
          </span>
          <Badge variant="secondary">
            {beta ? t("beta.badge") : t("badge")}
          </Badge>
        </div>
        <h3 className="font-heading text-lg font-semibold">
          {t(beta ? "beta.title" : "mobile.title")}
        </h3>
        <p className="text-sm leading-relaxed text-brand-night/70 dark:text-neutral-100/70">
          {t(beta ? "beta.description" : "mobile.description")}
        </p>
        {beta ? (
          <>
            <div className="mt-2 flex flex-col gap-3 sm:flex-row">
              <a
                href={beta.apkUrl}
                download
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "h-11 gap-2 px-6 text-base"
                )}
              >
                <Download aria-hidden className="size-4" />
                {t("beta.download")}
              </a>
              <a
                href={betaGuideUrl}
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "h-11 px-6 text-base"
                )}
              >
                {t("beta.install")}
              </a>
            </div>
            <p className="text-xs text-brand-night/60 dark:text-neutral-100/60">
              {t("beta.requirements", { version: beta.version })}{" "}
              <a
                href={beta.releaseUrl}
                className="underline underline-offset-4"
              >
                {t("beta.release")}
              </a>
            </p>
          </>
        ) : null}
      </div>
    </section>
  )
}
