import type { Metadata } from "next"

import { defaultLocale, locales, type Locale } from "@workspace/core"

/**
 * Public repository of the running code. The AGPL (section 13) requires
 * offering the source to network users: forks must point it to their own code.
 */
export const sourceCodeUrl = "https://github.com/franckniat/bible-plan"

/** Maintainer of the project, contact point for questions and data requests. */
export const maintainerUrl = "https://github.com/franckniat"

/** Full text of the license (AGPL-3.0-or-later) in the repository. */
export const licenseUrl = `${sourceCodeUrl}/blob/main/LICENSE`

/**
 * The public address of the site, for the links that must be absolute:
 * canonical addresses, the sitemap and the preview images of shared links.
 * `NEXT_PUBLIC_SITE_URL` first, then the production address Vercel gives, then
 * the one of the authentication, then the local server.
 */
export function getSiteUrl(): URL {
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL
  const candidate =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (vercel ? `https://${vercel}` : undefined) ||
    process.env.BETTER_AUTH_URL ||
    "http://localhost:3000"
  try {
    return new URL(candidate)
  } catch {
    return new URL("http://localhost:3000")
  }
}

/** The path of a page in a language ("/fr/privacy"); "/" is the landing. */
export function localizedPath(locale: Locale, path: string): string {
  return `/${locale}${path === "/" ? "" : path}`
}

/** The language tag Open Graph wants ("fr_FR"). */
export const openGraphLocales: Record<Locale, string> = {
  fr: "fr_FR",
  en: "en_US",
}

/**
 * Canonical address of a page and its twin in each other language, so that
 * search engines show the right one to each reader.
 */
export function pageAlternates(
  locale: Locale,
  path: string
): NonNullable<Metadata["alternates"]> {
  return {
    canonical: localizedPath(locale, path),
    languages: {
      ...Object.fromEntries(
        locales.map((other) => [other, localizedPath(other, path)])
      ),
      "x-default": localizedPath(defaultLocale, path),
    },
  }
}

/** What every page shares in Open Graph: the site, and its languages. */
export function baseOpenGraph(
  locale: Locale
): NonNullable<Metadata["openGraph"]> {
  return {
    type: "website",
    siteName: "Bible Plan",
    locale: openGraphLocales[locale],
    alternateLocale: locales
      .filter((other) => other !== locale)
      .map((other) => openGraphLocales[other]),
  }
}

/**
 * What a shared link of a page shows: its own title, description and address,
 * for Open Graph (Facebook, WhatsApp) and for X, which reads its own tags.
 * The preview image comes from the `opengraph-image` file nearest to the page.
 */
export function pageSocial(
  locale: Locale,
  path: string,
  { title, description }: { title: string; description?: string }
): Pick<Metadata, "openGraph" | "twitter"> {
  return {
    openGraph: {
      ...baseOpenGraph(locale),
      url: localizedPath(locale, path),
      title,
      description,
    },
    twitter: { card: "summary_large_image", title, description },
  }
}
