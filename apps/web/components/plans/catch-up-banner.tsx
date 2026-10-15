"use client"

import { CalendarClock, LoaderCircle } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState, useTransition } from "react"

import type { CatchUpStrategy } from "@workspace/core"
import { Button, buttonVariants } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

import { Link } from "@/i18n/navigation"
import { applyCatchUpAction } from "@/server/actions/plans"

type ActiveStrategy = Exclude<CatchUpStrategy, "FREE">

/** Error codes of the action, translated by "CatchUp.errors.<code>". */
type CatchUpFailure = Extract<
  Awaited<ReturnType<typeof applyCatchUpAction>>,
  { ok: false }
>["error"]

/**
 * Gentle notice of readings left waiting, with the ways to catch up.
 * `hints` tells what each strategy would change (computed by the page).
 */
export function CatchUpBanner({
  planId,
  lateReadings,
  strategy,
  hints = {},
  options = strategy === "FREE" ? [] : [strategy],
  planHref,
}: {
  planId: string
  lateReadings: number
  /** The strategy chosen for the plan, offered first. */
  strategy: CatchUpStrategy
  hints?: Partial<Record<ActiveStrategy, string>>
  /** Strategies offered as buttons. */
  options?: ActiveStrategy[]
  /** Link to the plan page (from Today). */
  planHref?: string
}) {
  const t = useTranslations("CatchUp")
  const [pending, startTransition] = useTransition()
  const [running, setRunning] = useState<ActiveStrategy | null>(null)
  const [error, setError] = useState<CatchUpFailure | null>(null)

  function apply(option: ActiveStrategy) {
    setError(null)
    setRunning(option)
    startTransition(async () => {
      const result = await applyCatchUpAction(planId, option).catch(() => ({
        ok: false as const,
        error: "unexpected" as const,
      }))
      if (!result.ok) setError(result.error)
      setRunning(null)
    })
  }

  return (
    <div
      role="status"
      className="flex flex-col gap-3 rounded-2xl bg-brand-gold/15 p-4 text-sm"
    >
      <p className="flex gap-2">
        <CalendarClock aria-hidden className="mt-0.5 size-4 shrink-0" />
        <span>
          {t("late", { count: lateReadings })}{" "}
          {strategy === "FREE" && t("free")}
        </span>
      </p>
      {(options.length > 0 || planHref) && (
        <div className="flex flex-wrap items-start gap-3">
          {options.map((option) => (
            <div key={option} className="flex flex-col gap-1">
              <Button
                variant={option === strategy ? "default" : "outline"}
                disabled={pending}
                onClick={() => apply(option)}
              >
                {running === option && (
                  <LoaderCircle className="animate-spin" />
                )}
                {t(option)}
              </Button>
              {hints[option] && (
                <span className="max-w-64 text-xs text-brand-night/65 dark:text-neutral-100/65">
                  {hints[option]}
                </span>
              )}
            </div>
          ))}
          {planHref && (
            <Link
              href={planHref}
              className={cn(buttonVariants({ variant: "ghost" }))}
            >
              {t("seePlan")}
            </Link>
          )}
        </div>
      )}
      {error && (
        <p role="alert" className="text-destructive">
          {t(`errors.${error}`)}
        </p>
      )}
    </div>
  )
}
