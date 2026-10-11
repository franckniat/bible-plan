"use client"

import { Mail, KeyRound } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { useState } from "react"

import { authClient } from "@workspace/auth/client"
import { Button } from "@workspace/ui/components/button"

import { EmailRequestForm } from "@/components/auth/email-request-form"
import { SignInForm } from "@/components/auth/sign-in-form"

/** Password sign-in, or a one-click sign-in link sent by email. */
export function SignInMethods({
  redirectTo,
  initialMethod = "password",
}: {
  redirectTo: string
  initialMethod?: "password" | "magicLink"
}) {
  const t = useTranslations("Auth.magicLink")
  const locale = useLocale()
  const [method, setMethod] = useState(initialMethod)

  return (
    <div className="flex flex-col gap-4">
      {method === "password" ? (
        <SignInForm redirectTo={redirectTo} />
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-brand-night/75 dark:text-neutral-100/75">
            {t("description")}
          </p>
          <EmailRequestForm
            submitLabel={t("submit")}
            submittingLabel={t("submitting")}
            sentMessage={t("sent")}
            request={(email) =>
              authClient.signIn.magicLink({
                email,
                callbackURL: redirectTo,
                errorCallbackURL: `/${locale}/sign-in?method=magic-link`,
              })
            }
          />
        </div>
      )}
      <Button
        type="button"
        variant="ghost"
        className="w-full"
        onClick={() =>
          setMethod((current) =>
            current === "password" ? "magicLink" : "password"
          )
        }
      >
        {method === "password" ? <Mail /> : <KeyRound />}
        {method === "password" ? t("switchToMagicLink") : t("switchToPassword")}
      </Button>
    </div>
  )
}
