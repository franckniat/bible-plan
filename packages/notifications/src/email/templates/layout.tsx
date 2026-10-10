import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components"
import type { ReactNode } from "react"

import type { Locale } from "@workspace/core"

import type { EmailTranslator } from "../translations"

/** Brand colors (see packages/ui globals.css). */
export const emailColors = {
  night: "#10284a",
  gold: "#f2b441",
  cream: "#fbf6ea",
  muted: "#5b6577",
  border: "#e7dfcc",
}

const fontSans =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
export const fontSerif = "Georgia, 'Times New Roman', serif"

/** Shared frame of every Bible Plan email. */
export function EmailLayout({
  locale,
  preview,
  t,
  children,
}: {
  locale: Locale
  /** Inbox preview text. */
  preview: string
  t: EmailTranslator
  children: ReactNode
}) {
  return (
    <Html lang={locale}>
      <Head />
      <Preview>{preview}</Preview>
      <Body
        style={{
          backgroundColor: emailColors.cream,
          color: emailColors.night,
          fontFamily: fontSans,
          margin: 0,
          padding: "32px 12px",
        }}
      >
        <Container style={{ maxWidth: "560px", margin: "0 auto" }}>
          <Section style={{ padding: "0 8px 20px" }}>
            <Text
              style={{
                fontFamily: fontSerif,
                fontSize: "22px",
                fontWeight: 700,
                margin: 0,
              }}
            >
              <span style={{ color: emailColors.gold }}>✦</span> Bible Plan
            </Text>
            <Text
              style={{ color: emailColors.muted, fontSize: "13px", margin: 0 }}
            >
              {t("layout.tagline")}
            </Text>
          </Section>
          <Section
            style={{
              backgroundColor: "#ffffff",
              border: `1px solid ${emailColors.border}`,
              borderRadius: "20px",
              padding: "32px 28px",
            }}
          >
            {children}
          </Section>
          <Hr style={{ borderColor: emailColors.border, margin: "24px 0" }} />
          <Text
            style={{
              color: emailColors.muted,
              fontSize: "12px",
              lineHeight: "18px",
              padding: "0 8px",
            }}
          >
            {t("layout.footer")}
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
