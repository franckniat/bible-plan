import { ImageResponse } from "next/og"
import { hasLocale } from "next-intl"
import { getTranslations } from "next-intl/server"

import {
  ogColors,
  ogContentType,
  ogSize,
  OgBrand,
  OgFrame,
  publicImageDataUri,
  quote,
} from "@/lib/og"
import { routing } from "@/i18n/routing"

export const alt = "Bible Plan"
export const size = ogSize
export const contentType = ogContentType

/**
 * The preview of a link to the site (WhatsApp, Facebook, X…): the promise of
 * the landing page, the verse that goes with it, and the reader of the app.
 * One image per language.
 */
export default async function OpenGraphImage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const language = hasLocale(routing.locales, locale)
    ? locale
    : routing.defaultLocale
  const t = await getTranslations({ locale: language, namespace: "Landing" })
  const screenshot = await publicImageDataUri(
    `landing/v2/${language}-reader.jpg`
  )

  return new ImageResponse(
    (
      <OgFrame>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: 680,
          }}
        >
          <OgBrand />
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            <div
              style={{
                display: "flex",
                fontSize: 62,
                lineHeight: 1.08,
                fontWeight: 700,
                letterSpacing: -2,
              }}
            >
              {t("hero.title")}
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                borderLeft: `5px solid ${ogColors.gold}`,
                paddingLeft: 22,
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontSize: 27,
                  lineHeight: 1.3,
                  color: ogColors.goldSoft,
                }}
              >
                {quote(t("hero.verse"), language)}
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: 22,
                  color: "rgba(251,246,234,0.7)",
                }}
              >
                {t("hero.verseReference")}
              </div>
            </div>
          </div>
        </div>

        {screenshot && (
          <div
            style={{
              display: "flex",
              position: "absolute",
              top: 70,
              right: 70,
              width: 330,
              height: 700,
              borderRadius: 44,
              border: "10px solid #1d3b66",
              overflow: "hidden",
              boxShadow: "0 30px 80px rgba(0,0,0,0.5)",
              transform: "rotate(4deg)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- an image response, not a page */}
            <img
              src={screenshot}
              alt=""
              width={310}
              height={680}
              style={{ objectFit: "cover", objectPosition: "top" }}
            />
          </div>
        )}
      </OgFrame>
    ),
    size
  )
}
