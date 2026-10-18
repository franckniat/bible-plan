import { Button, Heading, Link, Text } from "@react-email/components"

import type { Locale, ReminderKind } from "@workspace/core"

import { renderEmail, type RenderedEmail } from "../render"
import { getEmailTranslator } from "../translations"
import { EmailLayout, emailColors, fontSerif } from "./layout"

/**
 * Reminder to read, pray or meditate: a short invitation with a button to the
 * app, and a link to switch the reminder off in one click.
 */
export async function renderReminderEmail(
  kind: ReminderKind,
  locale: Locale,
  {
    name,
    url,
    unsubscribeUrl,
  }: {
    /** First name or name of the recipient. */
    name: string
    /** Where the button leads (the app, in the language of the recipient). */
    url: string
    /** One-click link that turns this reminder off. */
    unsubscribeUrl: string
  }
): Promise<RenderedEmail> {
  const t = await getEmailTranslator(locale)

  return renderEmail(
    t(`reminder.${kind}.subject`),
    <EmailLayout locale={locale} preview={t(`reminder.${kind}.preview`)} t={t}>
      <Heading
        as="h1"
        style={{ fontFamily: fontSerif, fontSize: "26px", margin: "0 0 12px" }}
      >
        {t(`reminder.${kind}.heading`, { name })}
      </Heading>
      <Text
        style={{ fontSize: "16px", lineHeight: "24px", margin: "0 0 24px" }}
      >
        {t(`reminder.${kind}.body`)}
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
        {t(`reminder.${kind}.button`)}
      </Button>
      <Text
        style={{
          color: emailColors.muted,
          fontSize: "13px",
          margin: "24px 0 0",
        }}
      >
        {t("reminder.unsubscribeText")}{" "}
        <Link
          href={unsubscribeUrl}
          style={{ color: emailColors.night, wordBreak: "break-all" }}
        >
          {t("reminder.unsubscribe")}
        </Link>
      </Text>
    </EmailLayout>
  )
}
