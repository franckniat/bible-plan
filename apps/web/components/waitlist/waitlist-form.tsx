"use client"

import { Check, Copy, LoaderCircle, MessageCircle } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react"

import { waitlistInterests } from "@workspace/core"
import { Button } from "@workspace/ui/components/button"
import { Checkbox } from "@workspace/ui/components/checkbox"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { cn } from "@workspace/ui/lib/utils"

import { CountryPicker } from "@/components/country-picker"
import { Link } from "@/i18n/navigation"
import {
  joinWaitlistAction,
  type WaitlistFormState,
} from "@/server/actions/waitlist"

const initialState: WaitlistFormState = { status: "idle" }

export function WaitlistForm({ className }: { className?: string }) {
  const t = useTranslations("WaitlistForm")
  const locale = useLocale()
  const [state, formAction, isPending] = useActionState(
    joinWaitlistAction,
    initialState
  )
  // When the form appeared, to reject submissions faster than a human.
  const startedAt = useRef(0)
  useEffect(() => {
    startedAt.current = Date.now()
  }, [])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    // Submitting manually keeps what the visitor typed if there is an error
    // (React resets forms submitted through the `action` prop).
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    formData.set("startedAt", String(startedAt.current))
    startTransition(() => formAction(formData))
  }

  const fieldErrors = state.status === "error" ? state.fieldErrors : {}
  const formError = state.status === "error" ? state.formError : undefined

  return (
    <div
      id="waitlist"
      className={cn(
        "scroll-mt-8 rounded-3xl bg-white/85 p-6 shadow-xl ring-1 shadow-brand-night/5 ring-brand-night/10 backdrop-blur sm:p-8 dark:bg-brand-night-soft/85 dark:ring-white/10",
        className
      )}
    >
      {state.status === "success" ? (
        <WaitlistSuccess locale={locale} />
      ) : (
        <form
          action={formAction}
          onSubmit={handleSubmit}
          noValidate
          className="flex flex-col gap-5"
        >
          <div>
            <h2 className="font-heading text-2xl font-semibold">
              {t("title")}
            </h2>
            <p className="mt-1 text-sm text-brand-night/70 dark:text-brand-cream/70">
              {t("description")}
            </p>
          </div>

          <Field
            label={t("email")}
            htmlFor="waitlist-email"
            error={fieldErrors.email && t(`errors.${fieldErrors.email}`)}
          >
            <Input
              id="waitlist-email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              placeholder={t("emailPlaceholder")}
              aria-invalid={fieldErrors.email ? true : undefined}
              aria-describedby={
                fieldErrors.email ? "waitlist-email-error" : undefined
              }
              className="h-10"
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label={t("firstName")}
              hint={t("optional")}
              htmlFor="waitlist-first-name"
              error={
                fieldErrors.firstName && t(`errors.${fieldErrors.firstName}`)
              }
            >
              <Input
                id="waitlist-first-name"
                name="firstName"
                autoComplete="given-name"
                maxLength={60}
                aria-invalid={fieldErrors.firstName ? true : undefined}
                aria-describedby={
                  fieldErrors.firstName
                    ? "waitlist-first-name-error"
                    : undefined
                }
                className="h-10"
              />
            </Field>
            <Field
              label={t("country")}
              hint={t("optional")}
              htmlFor="waitlist-country"
              error={fieldErrors.country && t(`errors.${fieldErrors.country}`)}
            >
              <CountryPicker
                id="waitlist-country"
                name="country"
                className="h-10"
              />
            </Field>
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium">
              {t("interests")}{" "}
              <span className="font-normal text-brand-night/50 dark:text-brand-cream/50">
                ({t("optional")})
              </span>
            </legend>
            <div className="flex flex-wrap gap-2">
              {waitlistInterests.map((interest) => (
                <label
                  key={interest}
                  className="cursor-pointer rounded-full px-3.5 py-1.5 text-sm ring-1 ring-brand-night/15 transition-colors select-none hover:bg-brand-gold/10 has-checked:bg-brand-night has-checked:text-brand-cream has-checked:ring-brand-night has-focus-visible:ring-3 has-focus-visible:ring-brand-gold dark:ring-white/20 dark:has-checked:bg-brand-gold dark:has-checked:text-brand-night dark:has-checked:ring-brand-gold"
                >
                  <input
                    type="checkbox"
                    name="interests"
                    value={interest}
                    className="sr-only"
                  />
                  {t(`interest.${interest}`)}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="flex flex-col gap-1.5">
            <label className="flex items-start gap-3 text-sm leading-snug">
              <Checkbox
                name="consent"
                className="mt-0.5"
                aria-invalid={fieldErrors.consent ? true : undefined}
                aria-describedby={
                  fieldErrors.consent ? "waitlist-consent-error" : undefined
                }
              />
              <span className="text-brand-night/80 dark:text-brand-cream/80">
                {t.rich("consent", {
                  link: (chunks) => (
                    <Link
                      href="/privacy"
                      className="font-medium underline underline-offset-2"
                    >
                      {chunks}
                    </Link>
                  ),
                })}
              </span>
            </label>
            {fieldErrors.consent && (
              <FieldError id="waitlist-consent-error">
                {t(`errors.${fieldErrors.consent}`)}
              </FieldError>
            )}
          </div>

          <input type="hidden" name="locale" value={locale} />
          {/* Honeypot: invisible to people, filled in by bots. */}
          <div
            aria-hidden
            className="absolute -left-[10000px] h-0 overflow-hidden"
          >
            <label>
              Website
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
              />
            </label>
          </div>

          {formError && (
            <p
              role="alert"
              className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
              {t(`errors.${formError}`)}
            </p>
          )}

          <Button
            type="submit"
            size="lg"
            disabled={isPending}
            className="h-11 w-full text-base"
          >
            {isPending && <LoaderCircle className="animate-spin" />}
            {isPending ? t("submitting") : t("submit")}
          </Button>
        </form>
      )}
    </div>
  )
}

function Field({
  label,
  hint,
  htmlFor,
  error,
  children,
}: {
  label: string
  hint?: string
  htmlFor: string
  error?: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={htmlFor}>
        {label}
        {hint && (
          <span className="font-normal text-brand-night/50 dark:text-brand-cream/50">
            ({hint})
          </span>
        )}
      </Label>
      {children}
      {error && <FieldError id={`${htmlFor}-error`}>{error}</FieldError>}
    </div>
  )
}

function FieldError({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className="text-sm text-destructive">
      {children}
    </p>
  )
}

function WaitlistSuccess({ locale }: { locale: string }) {
  const t = useTranslations("WaitlistForm")
  const [copied, setCopied] = useState(false)
  // Only rendered in the browser, after a successful signup.
  const url = `${window.location.origin}/${locale}`
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(
    t("shareMessage", { url })
  )}`

  async function copyLink() {
    await navigator.clipboard.writeText(url)
    setCopied(true)
  }

  return (
    <div role="status" className="flex flex-col items-start gap-4">
      <span className="flex size-12 items-center justify-center rounded-full bg-brand-gold/20 text-brand-night dark:text-brand-gold">
        <Check aria-hidden className="size-6" />
      </span>
      <h2 className="font-heading text-2xl font-semibold">
        {t("successTitle")}
      </h2>
      <p className="text-brand-night/75 dark:text-brand-cream/75">
        {t("successDescription")}
      </p>
      <div className="flex w-full flex-col gap-2 sm:flex-row">
        <Button
          size="lg"
          className="h-11 sm:flex-1"
          nativeButton={false}
          render={
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" />
          }
        >
          <MessageCircle />
          {t("shareWhatsApp")}
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="h-11 sm:flex-1"
          onClick={copyLink}
        >
          {copied ? <Check /> : <Copy />}
          {copied ? t("linkCopied") : t("copyLink")}
        </Button>
      </div>
    </div>
  )
}
