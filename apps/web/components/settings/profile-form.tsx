"use client"

import { LoaderCircle, LocateFixed } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import {
  startTransition,
  useActionState,
  useEffect,
  useState,
  type FormEvent,
} from "react"

import {
  locales,
  maxNameLength,
  readingSpeeds,
  type Locale,
  type ReadingSpeed,
} from "@workspace/core"
import { Button } from "@workspace/ui/components/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"

import { AuthNotice } from "@/components/auth/auth-card"
import {
  choiceCardClassName,
  choiceInputClassName,
} from "@/components/choice-card"
import { TimeZonePicker } from "@/components/settings/time-zone-picker"
import { useRouter } from "@/i18n/navigation"
import {
  updateProfileAction,
  type ProfileFormState,
} from "@/server/actions/profile"

export type ProfileFormValues = {
  name: string
  email: string
  locale: Locale
  timezone: string | null
  readingWpm: number
}

const initialState: ProfileFormState = { status: "idle" }

export function ProfileForm({ values }: { values: ProfileFormValues }) {
  const t = useTranslations("Settings")
  const tLocale = useTranslations("LanguageSwitcher")
  const currentLocale = useLocale()
  const router = useRouter()
  const [state, formAction, pending] = useActionState(
    updateProfileAction,
    initialState
  )
  const [name, setName] = useState(values.name)
  const [timezone, setTimezone] = useState(values.timezone)

  // A new language shows the page again in that language.
  useEffect(() => {
    if (state.status === "success" && state.locale !== currentLocale) {
      router.replace("/settings", { locale: state.locale })
    }
  }, [state, currentLocale, router])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    // Submitting manually keeps the values if there is an error.
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    startTransition(() => formAction(formData))
  }

  const fieldErrors = state.status === "error" ? state.fieldErrors : {}
  const formError = state.status === "error" ? state.formError : undefined
  const error = (field: keyof typeof fieldErrors) => {
    const code = fieldErrors[field]
    return code ? <FieldError>{t(`errors.${code}`)}</FieldError> : null
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      <FieldGroup>
        <Field data-invalid={!!fieldErrors.name || undefined}>
          <FieldLabel htmlFor="name">{t("fields.name")}</FieldLabel>
          <Input
            id="name"
            name="name"
            autoComplete="name"
            required
            maxLength={maxNameLength}
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-invalid={!!fieldErrors.name || undefined}
            className="h-10"
          />
          {error("name")}
        </Field>

        <Field>
          <FieldLabel htmlFor="email">{t("fields.email")}</FieldLabel>
          <Input
            id="email"
            type="email"
            value={values.email}
            readOnly
            aria-describedby="email-hint"
            className="h-10 bg-transparent text-brand-night/70 dark:text-neutral-100/70"
          />
          <FieldDescription id="email-hint">
            {t("fields.emailHint")}
          </FieldDescription>
        </Field>

        <FieldSet>
          <FieldLegend variant="label">{t("fields.locale")}</FieldLegend>
          <div className="grid grid-cols-2 gap-3">
            {locales.map((locale) => (
              <label key={locale} lang={locale} className={choiceCardClassName}>
                <input
                  type="radio"
                  name="locale"
                  value={locale}
                  defaultChecked={locale === values.locale}
                  className={choiceInputClassName}
                />
                <span className="font-medium">
                  {tLocale("locale", { locale })}
                </span>
              </label>
            ))}
          </div>
          {error("locale")}
        </FieldSet>

        <Field data-invalid={!!fieldErrors.timezone || undefined}>
          <FieldLabel htmlFor="timezone">{t("fields.timezone")}</FieldLabel>
          <TimeZonePicker
            id="timezone"
            name="timezone"
            value={timezone}
            onValueChange={setTimezone}
            invalid={!!fieldErrors.timezone}
            describedBy="timezone-hint"
          />
          <FieldDescription id="timezone-hint">
            {t("fields.timezoneHint")}
          </FieldDescription>
          <div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone)
              }
            >
              <LocateFixed />
              {t("fields.detectTimezone")}
            </Button>
          </div>
          {error("timezone")}
        </Field>

        <FieldSet>
          <FieldLegend variant="label">{t("fields.readingSpeed")}</FieldLegend>
          <FieldDescription>{t("fields.readingSpeedHint")}</FieldDescription>
          <div className="flex flex-col gap-3">
            {(Object.keys(readingSpeeds) as ReadingSpeed[]).map((speed) => {
              const wpm = readingSpeeds[speed]
              return (
                <label key={speed} className={choiceCardClassName}>
                  <input
                    type="radio"
                    name="readingWpm"
                    value={wpm}
                    defaultChecked={wpm === values.readingWpm}
                    className={choiceInputClassName}
                  />
                  <span className="flex flex-col gap-0.5">
                    <span className="font-medium">
                      {t(`readingSpeeds.${speed}.label`)}
                    </span>
                    <span className="text-brand-night/65 dark:text-neutral-100/65">
                      {t(`readingSpeeds.${speed}.description`, { wpm })}
                    </span>
                  </span>
                </label>
              )
            })}
          </div>
          {error("readingWpm")}
        </FieldSet>
      </FieldGroup>

      {formError && (
        <AuthNotice tone="error">{t(`errors.${formError}`)}</AuthNotice>
      )}
      {state.status === "success" && (
        <AuthNotice tone="success">{t("saved")}</AuthNotice>
      )}
      <Button
        type="submit"
        size="lg"
        disabled={pending}
        className="h-11 w-full text-base sm:w-fit sm:px-6"
      >
        {pending && <LoaderCircle className="animate-spin" />}
        {pending ? t("saving") : t("save")}
      </Button>
    </form>
  )
}
