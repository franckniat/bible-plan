import { Heading, Text } from "@react-email/components"

import type { Locale } from "@workspace/core"

import { renderEmail, type RenderedEmail } from "../render"
import { getEmailTranslator } from "../translations"
import { EmailLayout, fontSerif } from "./layout"

/** Simple email used to check that sending works (see scripts/send-test-email). */
export async function renderTestEmail(locale: Locale): Promise<RenderedEmail> {
  const t = await getEmailTranslator(locale)

  return renderEmail(
    t("test.subject"),
    <EmailLayout locale={locale} preview={t("test.preview")} t={t}>
      <Heading
        as="h1"
        style={{ fontFamily: fontSerif, fontSize: "26px", margin: "0 0 12px" }}
      >
        {t("test.heading")}
      </Heading>
      <Text style={{ fontSize: "16px", lineHeight: "24px", margin: 0 }}>
        {t("test.body")}
      </Text>
    </EmailLayout>
  )
}
