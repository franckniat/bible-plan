"use client"

import { Bell, Pencil, Plus, Trash2 } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { useId, useState, useTransition } from "react"

import {
  allWeekdays,
  maxRemindersPerUser,
  reminderChannels,
  reminderKinds,
  reminderStepMinutes,
  type ReminderChannel,
  type ReminderKind,
  type Weekday,
} from "@workspace/core"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Switch } from "@workspace/ui/components/switch"
import { cn } from "@workspace/ui/lib/utils"

import {
  deleteReminderAction,
  saveReminderAction,
  setReminderEnabledAction,
  type ReminderActionError,
  type ReminderActionResult,
} from "@/server/actions/reminders"

export type ReminderView = {
  id: string
  kind: ReminderKind
  localTime: string
  weekdays: Weekday[]
  channels: ReminderChannel[]
  enabled: boolean
}

type Draft = Omit<ReminderView, "id" | "enabled"> & { enabled: boolean }

const emptyDraft: Draft = {
  kind: "READING",
  localTime: "07:00",
  weekdays: [...allWeekdays],
  channels: ["IN_APP"],
  enabled: true,
}

// Monday first, as on a wall calendar in both languages.
const weekOrder: Weekday[] = [1, 2, 3, 4, 5, 6, 0]

/** The short name of a weekday, in the language of the page. */
function useWeekdayNames() {
  const locale = useLocale()
  const format = new Intl.DateTimeFormat(locale, {
    weekday: "short",
    timeZone: "UTC",
  })
  // 2026-01-04 is a Sunday.
  return (weekday: Weekday) =>
    format.format(new Date(Date.UTC(2026, 0, 4 + weekday)))
}

export function RemindersManager({
  reminders,
  timeZone,
  emailEnabled,
  pushEnabled,
}: {
  reminders: ReminderView[]
  /** The time zone the times are read in (the profile's). */
  timeZone: string
  emailEnabled: boolean
  /** Whether push notifications are set up on the server. */
  pushEnabled: boolean
}) {
  const t = useTranslations("Reminders")
  const [editing, setEditing] = useState<"new" | string | null>(null)
  const [error, setError] = useState<ReminderActionError | null>(null)
  const [pending, startTransition] = useTransition()

  function run(
    action: () => Promise<ReminderActionResult>,
    onDone?: () => void
  ) {
    setError(null)
    startTransition(async () => {
      const result = await action().catch(
        () => ({ error: "unexpected" }) as const
      )
      if ("error" in result) setError(result.error)
      else onDone?.()
    })
  }

  const atLimit = reminders.length >= maxRemindersPerUser

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <p
          role="alert"
          className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {t(`errors.${error}`, { max: maxRemindersPerUser })}
        </p>
      )}

      {reminders.length === 0 && editing !== "new" && (
        <div className="flex flex-col items-start gap-2 rounded-3xl border border-dashed border-brand-night/20 p-6 dark:border-white/20">
          <Bell aria-hidden className="size-6 text-brand-gold" />
          <h2 className="font-heading text-xl font-semibold">
            {t("empty.title")}
          </h2>
          <p className="text-brand-night/70 dark:text-neutral-100/70">
            {t("empty.description")}
          </p>
        </div>
      )}

      <ul className="flex flex-col gap-3">
        {reminders.map((reminder) => (
          <li
            key={reminder.id}
            className="rounded-3xl bg-white/85 p-5 ring-1 ring-brand-night/10 dark:bg-neutral-900/85 dark:ring-white/10"
          >
            {editing === reminder.id ? (
              <ReminderForm
                initial={reminder}
                emailEnabled={emailEnabled}
                pushEnabled={pushEnabled}
                timeZone={timeZone}
                pending={pending}
                onCancel={() => setEditing(null)}
                onSave={(draft) =>
                  run(
                    () =>
                      saveReminderAction(reminder.id, { ...draft, timeZone }),
                    () => setEditing(null)
                  )
                }
              />
            ) : (
              <ReminderRow
                reminder={reminder}
                pending={pending}
                onEdit={() => {
                  setError(null)
                  setEditing(reminder.id)
                }}
                onToggle={(enabled) =>
                  run(() => setReminderEnabledAction(reminder.id, enabled))
                }
                onDelete={() => {
                  if (window.confirm(t("confirmDelete")))
                    run(() => deleteReminderAction(reminder.id))
                }}
              />
            )}
          </li>
        ))}
      </ul>

      {editing === "new" ? (
        <div className="rounded-3xl bg-white/85 p-5 ring-1 ring-brand-night/10 dark:bg-neutral-900/85 dark:ring-white/10">
          <ReminderForm
            initial={emptyDraft}
            emailEnabled={emailEnabled}
            pushEnabled={pushEnabled}
            timeZone={timeZone}
            pending={pending}
            onCancel={() => setEditing(null)}
            onSave={(draft) =>
              run(
                () => saveReminderAction(null, { ...draft, timeZone }),
                () => setEditing(null)
              )
            }
          />
        </div>
      ) : (
        <div className="flex flex-col items-start gap-2">
          <Button
            size="lg"
            className="h-11 sm:px-5"
            disabled={atLimit}
            onClick={() => {
              setError(null)
              setEditing("new")
            }}
          >
            <Plus />
            {t("add")}
          </Button>
          {atLimit && (
            <p className="text-sm text-brand-night/70 dark:text-neutral-100/70">
              {t("errors.limit", { max: maxRemindersPerUser })}
            </p>
          )}
        </div>
      )}

      <p className="text-sm text-brand-night/70 dark:text-neutral-100/70">
        {t("timeZoneNote", { timeZone: timeZone.replaceAll("_", " ") })}
      </p>
    </div>
  )
}

function ReminderRow({
  reminder,
  pending,
  onEdit,
  onToggle,
  onDelete,
}: {
  reminder: ReminderView
  pending: boolean
  onEdit: () => void
  onToggle: (enabled: boolean) => void
  onDelete: () => void
}) {
  const t = useTranslations("Reminders")
  const locale = useLocale()
  const weekdayName = useWeekdayNames()
  const labelId = useId()

  const days =
    reminder.weekdays.length === 7
      ? t("everyDay")
      : new Intl.ListFormat(locale, { style: "narrow", type: "unit" }).format(
          weekOrder
            .filter((day) => reminder.weekdays.includes(day))
            .map(weekdayName)
        )

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div
        className={cn("flex flex-col gap-1", !reminder.enabled && "opacity-60")}
      >
        <p id={labelId} className="flex items-baseline gap-3">
          <span className="font-heading text-2xl font-semibold tabular-nums">
            {reminder.localTime}
          </span>
          <span className="font-medium">{t(`kinds.${reminder.kind}`)}</span>
        </p>
        <p className="text-sm text-brand-night/70 first-letter:uppercase dark:text-neutral-100/70">
          {days} ·{" "}
          {reminder.channels
            .map((channel) => t(`channels.${channel}`))
            .join(", ")}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Switch
          aria-labelledby={labelId}
          checked={reminder.enabled}
          disabled={pending}
          onCheckedChange={onToggle}
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={onEdit}
          aria-label={t("edit")}
        >
          <Pencil />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          disabled={pending}
          onClick={onDelete}
          aria-label={t("delete")}
        >
          <Trash2 />
        </Button>
      </div>
    </div>
  )
}

function ReminderForm({
  initial,
  emailEnabled,
  pushEnabled,
  timeZone,
  pending,
  onSave,
  onCancel,
}: {
  initial: Draft
  emailEnabled: boolean
  pushEnabled: boolean
  timeZone: string
  pending: boolean
  onSave: (draft: Draft) => void
  onCancel: () => void
}) {
  const t = useTranslations("Reminders")
  const weekdayName = useWeekdayNames()
  const [draft, setDraft] = useState<Draft>(initial)
  const id = useId()

  function toggle<T>(list: T[], value: T): T[] {
    return list.includes(value)
      ? list.filter((item) => item !== value)
      : [...list, value]
  }

  const valid = draft.weekdays.length > 0 && draft.localTime !== ""

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault()
        if (valid) onSave(draft)
      }}
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${id}-kind`}>{t("fields.kind")}</Label>
          <select
            id={`${id}-kind`}
            value={draft.kind}
            onChange={(event) =>
              setDraft({ ...draft, kind: event.target.value as ReminderKind })
            }
            className="h-10 rounded-lg border border-input bg-transparent px-3"
          >
            {reminderKinds.map((kind) => (
              <option key={kind} value={kind}>
                {t(`kinds.${kind}`)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${id}-time`}>{t("fields.time")}</Label>
          <Input
            id={`${id}-time`}
            type="time"
            step={reminderStepMinutes * 60}
            value={draft.localTime}
            onChange={(event) =>
              setDraft({ ...draft, localTime: event.target.value })
            }
            className="h-10"
          />
        </div>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">{t("fields.days")}</legend>
        <div className="flex flex-wrap gap-2">
          {weekOrder.map((day) => (
            <label
              key={day}
              className="cursor-pointer rounded-full px-3.5 py-1.5 text-sm ring-1 ring-brand-night/15 transition-colors select-none hover:bg-brand-gold/10 has-checked:bg-brand-night has-checked:text-brand-cream has-checked:ring-brand-night has-focus-visible:ring-3 has-focus-visible:ring-brand-gold dark:ring-white/20 dark:has-checked:bg-brand-gold dark:has-checked:text-neutral-950 dark:has-checked:ring-brand-gold"
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={draft.weekdays.includes(day)}
                onChange={() =>
                  setDraft({
                    ...draft,
                    weekdays: toggle(draft.weekdays, day),
                  })
                }
              />
              <span className="first-letter:uppercase">{weekdayName(day)}</span>
            </label>
          ))}
        </div>
        {draft.weekdays.length === 0 && (
          <p role="alert" className="text-sm text-destructive">
            {t("errors.noDays")}
          </p>
        )}
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">
          {t("fields.channels")}
        </legend>
        {reminderChannels.map((channel) => {
          const always = channel === "IN_APP"
          // Push needs the PWA; email only when reminders by email are on.
          const unavailable = channel === "PUSH" && !pushEnabled
          if (channel === "EMAIL" && !emailEnabled) return null
          return (
            <label key={channel} className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                className="size-4 accent-brand-night dark:accent-brand-gold"
                checked={always || draft.channels.includes(channel)}
                disabled={always || unavailable}
                onChange={() =>
                  setDraft({
                    ...draft,
                    channels: toggle(draft.channels, channel),
                  })
                }
              />
              <span>
                {t(`channels.${channel}`)}
                {channel === "PUSH" && !pushEnabled && (
                  <span className="text-brand-night/60 dark:text-neutral-100/60">
                    {" "}
                    ({t("soon")})
                  </span>
                )}
              </span>
            </label>
          )
        })}
      </fieldset>

      <p className="sr-only">{timeZone}</p>

      <div className="flex flex-wrap gap-3">
        <Button
          type="submit"
          size="lg"
          className="h-11 sm:px-5"
          disabled={pending || !valid}
        >
          {pending ? t("saving") : t("save")}
        </Button>
        <Button
          type="button"
          size="lg"
          variant="outline"
          className="h-11 sm:px-5"
          onClick={onCancel}
        >
          {t("cancel")}
        </Button>
      </div>
    </form>
  )
}
