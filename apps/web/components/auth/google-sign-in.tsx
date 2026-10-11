"use client"

import { LoaderCircle } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { useTransition } from "react"

import { authClient } from "@workspace/auth/client"
import { Button } from "@workspace/ui/components/button"
import { FieldSeparator } from "@workspace/ui/components/field"

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-5">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.63h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.8Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.88-3c-1.07.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.28v3.1A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.29 14.29A7.2 7.2 0 0 1 4.91 12c0-.8.14-1.57.38-2.29v-3.1H1.28A12 12 0 0 0 0 12c0 1.94.46 3.77 1.28 5.39l4.01-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.34.61 4.59 1.8l3.44-3.44A11.97 11.97 0 0 0 12 0 12 12 0 0 0 1.28 6.61l4.01 3.1C6.23 6.88 8.88 4.77 12 4.77Z"
      />
    </svg>
  )
}

/** "Continue with Google", followed by an "or" separator before the form. */
export function GoogleSignIn({ redirectTo }: { redirectTo: string }) {
  const t = useTranslations("Auth.social")
  const locale = useLocale()
  const [pending, startTransition] = useTransition()

  function signInWithGoogle() {
    startTransition(async () => {
      // Redirects the browser to Google, then back to `redirectTo`.
      await authClient.signIn.social({
        provider: "google",
        callbackURL: redirectTo,
        errorCallbackURL: `/${locale}/sign-in?method=google`,
      })
    })
  }

  return (
    <div className="flex flex-col gap-5">
      <Button
        type="button"
        variant="outline"
        size="lg"
        disabled={pending}
        onClick={signInWithGoogle}
        className="h-11 w-full text-base"
      >
        {pending ? <LoaderCircle className="animate-spin" /> : <GoogleIcon />}
        {t("google")}
      </Button>
      <FieldSeparator className="*:data-[slot=field-separator-content]:bg-white dark:*:data-[slot=field-separator-content]:bg-neutral-900">
        {t("or")}
      </FieldSeparator>
    </div>
  )
}
