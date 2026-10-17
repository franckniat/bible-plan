"use client"

import { Bell, Check } from "lucide-react"
import { useTranslations } from "next-intl"
import { useId, useState, useTransition } from "react"

import type { Weekday } from "@workspace/core"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"

import { Link } from "@/i18n/navigation"
import {
  saveReminderAction,
  type ReminderActionError,
} from "@/server/actions/reminders"

/**
 * Offered right after a plan is created: a reading reminder on the days of
 * the plan, in one step (the time), without leaving the page.
 */
export function SuggestReminder({
  weekdays,
  timeZone,
}: {
  /** The days the plan has readings. */
  weekdays: Weekday[]
  timeZone: string
}) {
  const t = useTranslations("Reminders.suggest")
  const errors = useTranslations("Reminders.errors")
  const timeId = useId()
  const [time, setTime] = useState("07:00")
  const [state, setState] = useState<
    "idle" | "saved" | "dismissed" | ReminderActionError
  >("idle")
  const [pending, startTransition] = useTransition()

  if (state === "dismissed") return null

  if (state === "saved") {
    return (
      <p
        role="status"
        className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-2xl bg-brand-gold/15 px-4 py-3 text-sm"
      >
        <Check aria-hidden className="size-4" />
        {t("saved", { time })}
        <Link href="/settings/reminders" className="font-medium underline">
          {t("manage")}
        </Link>
      </p>
    )
  }

  const failed = state !== "idle"

  return (
    <section
      aria-labelledby="suggest-reminder"
      className="flex flex-col gap-4 rounded-3xl bg-white/85 p-5 ring-1 ring-brand-night/10 dark:bg-neutral-900/85 dark:ring-white/10"
    >
      <div className="flex flex-col gap-1">
        <h2
          id="suggest-reminder"
          className="flex items-center gap-2 font-heading text-lg font-semibold"
        >
          <Bell aria-hidden className="size-5 text-brand-gold" />
          {t("title")}
        </h2>
        <p className="text-sm text-brand-night/70 dark:text-neutral-100/70">
          {t("description")}
        </p>
      </div>
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault()
          startTransition(async () => {
            const result = await saveReminderAction(null, {
              kind: "READING",
              localTime: time,
              timeZone,
              weekdays,
              channels: ["IN_APP"],
              enabled: true,
            }).catch(() => ({ error: "unexpected" }) as const)
            setState("error" in result ? result.error : "saved")
          })
        }}
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor={timeId}>{t("time")}</Label>
          <Input
            id={timeId}
            type="time"
            step={300}
            value={time}
            onChange={(event) => setTime(event.target.value)}
            className="h-10 w-36"
          />
        </div>
        <Button type="submit" size="lg" className="h-10" disabled={pending}>
          {pending ? t("saving") : t("create")}
        </Button>
        <Button
          type="button"
          size="lg"
          variant="ghost"
          className="h-10"
          onClick={() => setState("dismissed")}
        >
          {t("later")}
        </Button>
      </form>
      {failed && (
        <p role="alert" className="text-sm text-destructive">
          {errors(state as ReminderActionError, { max: 10 })}
        </p>
      )}
    </section>
  )
}
