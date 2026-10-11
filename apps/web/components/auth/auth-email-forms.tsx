"use client"

import { useLocale, useTranslations } from "next-intl"

import { authClient } from "@workspace/auth/client"

import { EmailRequestForm } from "@/components/auth/email-request-form"

/** Asks for a new email confirmation link. */
export function NewVerificationLinkForm() {
  const t = useTranslations("Auth")
  const locale = useLocale()

  return (
    <EmailRequestForm
      submitLabel={t("verifyEmail.resend")}
      submittingLabel={t("forgotPassword.submitting")}
      sentMessage={t("checkInbox.resent")}
      request={(email) =>
        authClient.sendVerificationEmail({
          email,
          callbackURL: `/${locale}/verify-email`,
        })
      }
    />
  )
}

/** Asks for a password reset link (same answer whether the account exists). */
export function ForgotPasswordForm() {
  const t = useTranslations("Auth.forgotPassword")
  const locale = useLocale()

  return (
    <EmailRequestForm
      submitLabel={t("submit")}
      submittingLabel={t("submitting")}
      sentMessage={t("sent")}
      request={(email) =>
        authClient.requestPasswordReset({
          email,
          redirectTo: `/${locale}/reset-password`,
        })
      }
    />
  )
}
