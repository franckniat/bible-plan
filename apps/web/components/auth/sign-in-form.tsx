"use client"

import { LoaderCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { useState, useTransition, type FormEvent } from "react"

import { authClient } from "@workspace/auth/client"
import { Button } from "@workspace/ui/components/button"
import { Field, FieldGroup, FieldLabel } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"

import { AuthNotice } from "@/components/auth/auth-card"
import { PasswordInput } from "@/components/auth/password-input"
import { ResendVerification } from "@/components/auth/resend-verification"
import { Link } from "@/i18n/navigation"
import { getAuthErrorKey, type AuthErrorKey } from "@/lib/auth-errors"

/** Email and password sign-in. */
export function SignInForm({ redirectTo }: { redirectTo: string }) {
  const t = useTranslations("Auth")
  const router = useRouter()
  const [error, setError] = useState<AuthErrorKey | null>(null)
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const email = String(form.get("email") ?? "").trim()
    const password = String(form.get("password") ?? "")
    setError(null)
    setUnverifiedEmail(null)

    startTransition(async () => {
      const { error } = await authClient.signIn.email({ email, password })
      if (error) {
        if (error.code === "EMAIL_NOT_VERIFIED") setUnverifiedEmail(email)
        else setError(getAuthErrorKey(error))
        return
      }
      router.replace(redirectTo)
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {error && <AuthNotice tone="error">{t(`errors.${error}`)}</AuthNotice>}
      {unverifiedEmail && (
        <div className="flex flex-col gap-3">
          <AuthNotice tone="error">{t("notVerified.message")}</AuthNotice>
          <ResendVerification
            email={unverifiedEmail}
            label={t("notVerified.resend")}
          />
        </div>
      )}
      <FieldGroup>
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
        <Field>
          <div className="flex items-center justify-between gap-2">
            <FieldLabel htmlFor="password">{t("fields.password")}</FieldLabel>
            <Link
              href="/forgot-password"
              className="text-sm underline-offset-4 hover:underline"
            >
              {t("signIn.forgotPassword")}
            </Link>
          </div>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="current-password"
            required
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
        {pending ? t("signIn.submitting") : t("signIn.submit")}
      </Button>
    </form>
  )
}
