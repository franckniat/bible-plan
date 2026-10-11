"use client"

import { LoaderCircle, MailCheck } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { useState, useTransition, type FormEvent } from "react"

import { authClient } from "@workspace/auth/client"
import { Button } from "@workspace/ui/components/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"

import { AuthNotice } from "@/components/auth/auth-card"
import { PasswordInput } from "@/components/auth/password-input"
import { ResendVerification } from "@/components/auth/resend-verification"
import { Link } from "@/i18n/navigation"
import { getAuthErrorKey, type AuthErrorKey } from "@/lib/auth-errors"

/** Account creation; then asks to confirm the email address. */
export function SignUpForm() {
  const t = useTranslations("Auth")
  const locale = useLocale()
  const [error, setError] = useState<AuthErrorKey | null>(null)
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const name = String(form.get("name") ?? "").trim()
    const email = String(form.get("email") ?? "").trim()
    const password = String(form.get("password") ?? "")
    setError(null)

    startTransition(async () => {
      const { error } = await authClient.signUp.email({
        name,
        email,
        password,
        callbackURL: `/${locale}/verify-email`,
      })
      if (error) setError(getAuthErrorKey(error))
      else setRegisteredEmail(email)
    })
  }

  if (registeredEmail) {
    return (
      <div className="flex flex-col items-start gap-4">
        <span className="flex size-12 items-center justify-center rounded-full bg-brand-gold/20 text-brand-night dark:text-brand-gold">
          <MailCheck aria-hidden className="size-6" />
        </span>
        <h2 className="font-heading text-xl font-semibold">
          {t("checkInbox.title")}
        </h2>
        <p className="text-sm text-brand-night/75 dark:text-neutral-100/75">
          {t("checkInbox.description", { email: registeredEmail })}
        </p>
        <ResendVerification
          email={registeredEmail}
          label={t("checkInbox.resend")}
        />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {error && <AuthNotice tone="error">{t(`errors.${error}`)}</AuthNotice>}
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="name">{t("fields.name")}</FieldLabel>
          <Input
            id="name"
            name="name"
            autoComplete="given-name"
            required
            maxLength={60}
            placeholder={t("fields.namePlaceholder")}
            className="h-10"
          />
        </Field>
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
          <FieldLabel htmlFor="password">{t("fields.password")}</FieldLabel>
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
      </FieldGroup>
      <Button
        type="submit"
        size="lg"
        disabled={pending}
        className="h-11 w-full text-base"
      >
        {pending && <LoaderCircle className="animate-spin" />}
        {pending ? t("signUp.submitting") : t("signUp.submit")}
      </Button>
      <p className="text-xs text-brand-night/65 dark:text-neutral-100/65 [&_a]:underline [&_a]:underline-offset-2">
        {t.rich("signUp.legal", {
          terms: (chunks) => <Link href="/terms">{chunks}</Link>,
          privacy: (chunks) => <Link href="/privacy">{chunks}</Link>,
        })}
      </p>
    </form>
  )
}
