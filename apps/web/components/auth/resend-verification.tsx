"use client"

import { useLocale, useTranslations } from "next-intl"
import { useState, useTransition } from "react"

import { authClient } from "@workspace/auth/client"
import { Button } from "@workspace/ui/components/button"

import { getAuthErrorKey, type AuthErrorKey } from "@/lib/auth-errors"

/** Sends the confirmation email again for an unverified address. */
export function ResendVerification({
  email,
  label,
}: {
  email: string
  label: string
}) {
  const t = useTranslations("Auth")
  const locale = useLocale()
  const [status, setStatus] = useState<"idle" | "sent" | AuthErrorKey>("idle")
  const [pending, startTransition] = useTransition()

  function resend() {
    startTransition(async () => {
      const { error } = await authClient.sendVerificationEmail({
        email,
        callbackURL: `/${locale}/verify-email`,
      })
      setStatus(error ? getAuthErrorKey(error) : "sent")
    })
  }

  if (status === "sent") {
    return (
      <p role="status" className="text-sm">
        {t("checkInbox.resent")}
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="h-10"
        disabled={pending}
        onClick={resend}
      >
        {label}
      </Button>
      {status !== "idle" && (
        <p role="alert" className="text-sm text-destructive">
          {t(`errors.${status}`)}
        </p>
      )}
    </div>
  )
}
