"use client"

import { LoaderCircle } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState, useTransition, type FormEvent } from "react"

import { authClient } from "@workspace/auth/client"
import { Button, buttonVariants } from "@workspace/ui/components/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"

import { AuthNotice } from "@/components/auth/auth-card"
import { PasswordInput } from "@/components/auth/password-input"
import { Link } from "@/i18n/navigation"
import { getAuthErrorKey, type AuthErrorKey } from "@/lib/auth-errors"

/** Sets a new password with the token received by email. */
export function ResetPasswordForm({ token }: { token: string }) {
  const t = useTranslations("Auth")
  const [error, setError] = useState<AuthErrorKey | "mismatch" | null>(null)
  const [done, setDone] = useState(false)
  const [pending, startTransition] = useTransition()

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const newPassword = String(form.get("password") ?? "")
    if (newPassword !== String(form.get("confirmPassword") ?? "")) {
      setError("mismatch")
      return
    }
    setError(null)
    startTransition(async () => {
      const { error } = await authClient.resetPassword({ newPassword, token })
      if (error) setError(getAuthErrorKey(error))
      else setDone(true)
    })
  }

  if (done) {
    return (
      <div className="flex flex-col gap-4">
        <AuthNotice tone="success">{t("resetPassword.success")}</AuthNotice>
        <Link
          href="/sign-in"
          className={buttonVariants({ size: "lg", className: "h-11 w-full" })}
        >
          {t("resetPassword.signIn")}
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {error && (
        <AuthNotice tone="error">
          {error === "mismatch"
            ? t("resetPassword.mismatch")
            : t(`errors.${error}`)}
        </AuthNotice>
      )}
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="password">
            {t("resetPassword.newPassword")}
          </FieldLabel>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="new-password"
            required
            minLength={8}
            aria-describedby="password-hint"
            className="h-10"
          />
          <FieldDescription id="password-hint">
            {t("fields.passwordHint")}
          </FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="confirmPassword">
            {t("resetPassword.confirmPassword")}
          </FieldLabel>
          <PasswordInput
            id="confirmPassword"
            name="confirmPassword"
            autoComplete="new-password"
            required
            minLength={8}
            className="h-10"
          />
        </Field>
      </FieldGroup>
      <Button
        type="submit"
        size="lg"
        disabled={pending}
        className="h-11 w-full text-base"
      >
        {pending && <LoaderCircle className="animate-spin" />}
        {pending ? t("resetPassword.submitting") : t("resetPassword.submit")}
      </Button>
    </form>
  )
}
