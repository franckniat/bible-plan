"use client"

import { LoaderCircle } from "lucide-react"
import { useTranslations } from "next-intl"
import { useActionState } from "react"

import { Button } from "@workspace/ui/components/button"
import { Checkbox } from "@workspace/ui/components/checkbox"

import { AuthNotice } from "@/components/auth/auth-card"
import { Link } from "@/i18n/navigation"
import {
  acceptTermsAction,
  type ConsentFormState,
} from "@/server/actions/account"

const initialState: ConsentFormState = { status: "idle" }

/** The explicit consent asked before the first use (and after a new version). */
export function ConsentForm() {
  const t = useTranslations("Consent")
  const [state, action, pending] = useActionState(
    acceptTermsAction,
    initialState
  )

  return (
    <form action={action} className="flex flex-col gap-5">
      {state.status === "error" && (
        <AuthNotice tone="error">{t(`errors.${state.code}`)}</AuthNotice>
      )}
      <label className="flex items-start gap-3 text-sm leading-snug">
        <Checkbox name="consent" className="mt-0.5" />
        <span className="text-brand-night/80 dark:text-neutral-100/80">
          {t.rich("label", {
            privacy: (chunks) => (
              <Link href="/privacy" target="_blank" className="underline">
                {chunks}
              </Link>
            ),
            terms: (chunks) => (
              <Link href="/terms" target="_blank" className="underline">
                {chunks}
              </Link>
            ),
          })}
        </span>
      </label>
      <Button type="submit" size="lg" disabled={pending} className="h-11">
        {pending && <LoaderCircle className="animate-spin" />}
        {t("submit")}
      </Button>
    </form>
  )
}
