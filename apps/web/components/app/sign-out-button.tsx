"use client"

import { LoaderCircle, LogOut } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { useTransition } from "react"

import { authClient } from "@workspace/auth/client"
import { Button } from "@workspace/ui/components/button"

/** Ends the session and goes back to the sign-in page. */
export function SignOutButton({ iconOnly = false }: { iconOnly?: boolean }) {
  const t = useTranslations("App.account")
  const locale = useLocale()
  const [pending, startTransition] = useTransition()

  function signOut() {
    startTransition(async () => {
      await authClient.signOut()
      // A full page load also empties the router cache of signed-in pages.
      window.location.replace(`/${locale}/sign-in`)
    })
  }

  const icon = pending ? <LoaderCircle className="animate-spin" /> : <LogOut />
  const label = pending ? t("signingOut") : t("signOut")

  return iconOnly ? (
    <Button
      type="button"
      variant="ghost"
      size="icon-lg"
      disabled={pending}
      onClick={signOut}
      aria-label={label}
      title={label}
    >
      {icon}
    </Button>
  ) : (
    <Button
      type="button"
      variant="ghost"
      disabled={pending}
      onClick={signOut}
      className="h-10 justify-start gap-3 px-3"
    >
      {icon}
      {label}
    </Button>
  )
}
