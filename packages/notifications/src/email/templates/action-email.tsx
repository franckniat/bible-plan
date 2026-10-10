import { Button, Heading, Link, Text } from "@react-email/components"

import type { Locale } from "@workspace/core"

import { renderEmail, type RenderedEmail } from "../render"
import { getEmailTranslator } from "../translations"
import { EmailLayout, emailColors, fontSerif } from "./layout"

type ActionEmailKind = "verifyEmail" | "resetPassword"

/**
 * Email asking the recipient to follow a link (confirm the address, reset the
 * password): heading, explanation, button, expiry and a fallback link.
 */
async function renderActionEmail(
  kind: ActionEmailKind,
  locale: Locale,
  { name, url }: { name: string; url: string }
): Promise<RenderedEmail> {
  const t = await getEmailTranslator(locale)

  return renderEmail(
    t(`${kind}.subject`),
    <EmailLayout locale={locale} preview={t(`${kind}.preview`)} t={t}>
      <Heading
        as="h1"
        style={{ fontFamily: fontSerif, fontSize: "26px", margin: "0 0 12px" }}
      >
        {kind === "verifyEmail"
          ? t("verifyEmail.heading", { name })
          : t("resetPassword.heading")}
      </Heading>
      <Text
        style={{ fontSize: "16px", lineHeight: "24px", margin: "0 0 24px" }}
      >
        {t(`${kind}.body`)}
      </Text>
      <Button
        href={url}
        style={{
          backgroundColor: emailColors.night,
          borderRadius: "14px",
          color: "#ffffff",
          fontSize: "15px",
          fontWeight: 600,
          padding: "12px 22px",
        }}
      >
        {t(`${kind}.button`)}
      </Button>
      <Text
        style={{
          color: emailColors.muted,
          fontSize: "14px",
          margin: "24px 0 8px",
        }}
      >
        {t(`${kind}.expiry`)}
      </Text>
      <Text style={{ color: emailColors.muted, fontSize: "13px", margin: 0 }}>
        {t(`${kind}.fallback`)}{" "}
        <Link
          href={url}
          style={{ color: emailColors.night, wordBreak: "break-all" }}
        >
          {url}
        </Link>
      </Text>
    </EmailLayout>
  )
}

/** "Confirm your email address" email sent after signing up. */
export function renderVerifyEmail(
  locale: Locale,
  params: { name: string; url: string }
) {
  return renderActionEmail("verifyEmail", locale, params)
}

/** "Reset your password" email. */
export function renderResetPasswordEmail(
  locale: Locale,
  params: { name: string; url: string }
) {
  return renderActionEmail("resetPassword", locale, params)
}
