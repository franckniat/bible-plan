import { Analytics } from "@vercel/analytics/next"
import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono, Lora } from "next/font/google"
import { notFound } from "next/navigation"
import { hasLocale, NextIntlClientProvider } from "next-intl"
import { getTranslations, setRequestLocale } from "next-intl/server"

import "@workspace/ui/globals.css"
import { cn } from "@workspace/ui/lib/utils"

import { ThemeProvider } from "@/components/theme-provider"
import { routing } from "@/i18n/routing"
import { baseOpenGraph, getSiteUrl } from "@/lib/site"

const loraHeading = Lora({ subsets: ["latin"], variable: "--font-heading" })

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" })

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export async function generateMetadata({
  params,
}: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) return {}

  const t = await getTranslations({ locale, namespace: "Metadata" })
  return {
    // Relative addresses below (canonical, images) are resolved against it.
    metadataBase: getSiteUrl(),
    title: t("title"),
    description: t("description"),
    applicationName: "Bible Plan",
    keywords: t("keywords")
      .split(",")
      .map((keyword) => keyword.trim()),
    // The preview image of every page comes from opengraph-image.tsx; pages
    // that have their own (a verse) override it.
    openGraph: {
      ...baseOpenGraph(locale),
      title: t("title"),
      description: t("description"),
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("description"),
    },
    // Installed on an iPhone home screen, the app opens without browser bars.
    appleWebApp: {
      capable: true,
      title: "Bible Plan",
      statusBarStyle: "default",
    },
  }
}

// The color of the browser bar and the status bar of the installed app.
export const viewport: Viewport = { themeColor: "#10284a" }

export default async function LocaleLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()

  // Enables static rendering of the pages below this layout.
  setRequestLocale(locale)

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={cn(
        "antialiased",
        fontMono.variable,
        "font-sans",
        geist.variable,
        loraHeading.variable
      )}
    >
      <body>
        <NextIntlClientProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </NextIntlClientProvider>
        {/* Visits counted by Vercel Web Analytics: no cookie, no personal data. */}
        <Analytics />
      </body>
    </html>
  )
}
