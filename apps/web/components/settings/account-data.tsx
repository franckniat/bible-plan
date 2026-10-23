"use client"

import { Download, LoaderCircle, Trash2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { useActionState, useEffect } from "react"

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@workspace/ui/components/alert-dialog"
import { Button, buttonVariants } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { cn } from "@workspace/ui/lib/utils"

import {
  deleteAccountAction,
  type DeleteAccountState,
} from "@/server/actions/account"

const initialState: DeleteAccountState = { status: "idle" }

/** Download of the personal data and deletion of the account. */
export function AccountData({ locale }: { locale: string }) {
  const t = useTranslations("Settings.data")
  const [state, action, pending] = useActionState(
    deleteAccountAction,
    initialState
  )

  useEffect(() => {
    // A full page load also empties the router cache of signed-in pages.
    if (state.status === "deleted") window.location.replace(`/${locale}`)
  }, [state.status, locale])

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-sm text-brand-night/75 dark:text-neutral-100/75">
          {t("exportHint")}
        </p>
        <a
          href="/api/account/export"
          download
          className={cn(
            buttonVariants({ variant: "outline", size: "lg" }),
            "h-11 w-fit sm:px-5"
          )}
        >
          <Download />
          {t("export")}
        </a>
      </div>

      <div className="flex flex-col gap-2 border-t border-brand-night/10 pt-6 dark:border-white/10">
        <p className="text-sm text-brand-night/75 dark:text-neutral-100/75">
          {t("deleteHint")}
        </p>
        <AlertDialog>
          <AlertDialogTrigger
            render={
              <Button
                type="button"
                variant="destructive"
                size="lg"
                className="h-11 w-fit sm:px-5"
              >
                <Trash2 />
                {t("delete")}
              </Button>
            }
          />
          <AlertDialogContent>
            <form action={action} className="flex flex-col gap-4">
              <AlertDialogHeader>
                <AlertDialogTitle>{t("confirmTitle")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("confirmDescription")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="delete-email">{t("confirmLabel")}</Label>
                <Input
                  id="delete-email"
                  name="email"
                  type="email"
                  autoComplete="off"
                  required
                />
                {state.status === "error" && (
                  <p role="alert" className="text-sm text-destructive">
                    {t(`errors.${state.code}`)}
                  </p>
                )}
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                <Button type="submit" variant="destructive" disabled={pending}>
                  {pending && <LoaderCircle className="animate-spin" />}
                  {t("confirm")}
                </Button>
              </AlertDialogFooter>
            </form>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
