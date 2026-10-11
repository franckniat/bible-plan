"use client"

import { LoaderCircle } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState, useTransition, type FormEvent } from "react"

import { Button } from "@workspace/ui/components/button"
import { Field, FieldLabel } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"

import { AuthNotice } from "@/components/auth/auth-card"
import { getAuthErrorKey, type AuthErrorKey } from "@/lib/auth-errors"

type AuthResult = { error: { code?: string; status?: number } | null }

/**
 * Single email field that triggers an auth email (new verification link,
 * password reset link) and then shows a confirmation message.
 */
export function EmailRequestForm({
  submitLabel,
  submittingLabel,
  sentMessage,
  request,
}: {
  submitLabel: string
  submittingLabel: string
  sentMessage: string
  request: (email: string) => Promise<AuthResult>
}) {
  const t = useTranslations("Auth")
  const [status, setStatus] = useState<"idle" | "sent" | AuthErrorKey>("idle")
  const [pending, startTransition] = useTransition()

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const email = String(new FormData(event.currentTarget).get("email") ?? "")
    startTransition(async () => {
      const { error } = await request(email.trim())
      setStatus(error ? getAuthErrorKey(error) : "sent")
    })
  }

  if (status === "sent") {
    return <AuthNotice tone="success">{sentMessage}</AuthNotice>
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {status !== "idle" && (
        <AuthNotice tone="error">{t(`errors.${status}`)}</AuthNotice>
      )}
      <Field>
        <FieldLabel htmlFor="email">{t("fields.email")}</FieldLabel>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          placeholder={t("fields.emailPlaceholder")}
          className="h-10"
        />
      </Field>
      <Button
        type="submit"
        size="lg"
        disabled={pending}
        className="h-11 w-full text-base"
      >
        {pending && <LoaderCircle className="animate-spin" />}
        {pending ? submittingLabel : submitLabel}
      </Button>
    </form>
  )
}
