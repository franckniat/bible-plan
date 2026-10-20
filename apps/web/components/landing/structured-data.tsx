import { getTranslations } from "next-intl/server"

import type { Locale } from "@workspace/core"

import { getSiteUrl, localizedPath } from "@/lib/site"

/**
 * What search engines read about the site as data: the website, and the app
 * (free, in two languages). Written as JSON-LD.
 */
export async function StructuredData({ locale }: { locale: Locale }) {
  const t = await getTranslations({ locale, namespace: "Metadata" })
  const site = getSiteUrl()
  const url = new URL(localizedPath(locale, "/"), site).toString()

  const data = [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "Bible Plan",
      url,
      inLanguage: locale,
      description: t("description"),
    },
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "Bible Plan",
      url,
      description: t("description"),
      applicationCategory: "LifestyleApplication",
      operatingSystem: "Web",
      inLanguage: ["fr", "en"],
      offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
      image: new URL(`${localizedPath(locale, "")}/opengraph-image`, site).toString(),
    },
  ]

  return (
    <script
      type="application/ld+json"
      // "<" is escaped so that no text can close the script tag.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  )
}
