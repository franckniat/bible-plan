"use client"

import { Check, LoaderCircle } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState, useTransition } from "react"

import { Button, buttonVariants } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

import { Link } from "@/i18n/navigation"
import { setReadingProgressAction } from "@/server/actions/plans"

/** Marks the plan reading open in the reader as read (or not). */
export function ReadingDone({
  readingId,
  done: initiallyDone,
  planId,
  planTitle,
}: {
  readingId: string
  done: boolean
  planId: string
  planTitle: string
}) {
  const t = useTranslations("Reader.reading")
  const [done, setDone] = useState(initiallyDone)
  const [pending, startTransition] = useTransition()
  const [failed, setFailed] = useState(false)

  function toggle() {
    const next = !done
    setDone(next)
    setFailed(false)
    startTransition(async () => {
      const { ok } = await setReadingProgressAction(readingId, next).catch(
        () => ({ ok: false })
      )
      if (!ok) {
        setDone(!next)
        setFailed(true)
      }
    })
  }

  return (
    <div className="flex flex-col gap-3 rounded-3xl bg-white/85 p-5 ring-1 ring-brand-night/10 dark:bg-neutral-900/85 dark:ring-white/10">
      <p className="text-sm text-brand-night/70 dark:text-neutral-100/70">
        {t.rich("plan", {
          title: planTitle,
          link: (chunks) => (
            <Link
              href={`/plans/${planId}`}
              className="font-medium underline underline-offset-2"
            >
              {chunks}
            </Link>
          ),
        })}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          size="lg"
          variant={done ? "outline" : "default"}
          disabled={pending}
          onClick={toggle}
          aria-pressed={done}
          className="h-11 sm:px-5"
        >
          {pending ? <LoaderCircle className="animate-spin" /> : <Check />}
          {done ? t("done") : t("markDone")}
        </Button>
        {done && (
          <Link
            href="/today"
            className={cn(
              buttonVariants({ variant: "ghost", size: "lg" }),
              "h-11"
            )}
          >
            {t("backToToday")}
          </Link>
        )}
      </div>
      {failed && (
        <p role="alert" className="text-sm text-destructive">
          {t("failed")}
        </p>
      )}
    </div>
  )
}
