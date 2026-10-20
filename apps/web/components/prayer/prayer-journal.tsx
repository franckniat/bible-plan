"use client"

import {
  Archive,
  ArchiveRestore,
  Check,
  HandHeart,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react"
import { useTranslations } from "next-intl"
import { useId, useState, useTransition } from "react"

import {
  maxPrayerRequestsPerUser,
  maxPrayerTextLength,
  maxPrayerTitleLength,
  prayerCategories,
  type PrayerCategory,
  type PrayerStatus,
} from "@workspace/core"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Textarea } from "@workspace/ui/components/textarea"

import {
  answeredAction,
  deletePrayerAction,
  prayedAction,
  savePrayerAction,
  setPrayerStatusAction,
  type PrayerActionError,
  type PrayerActionResult,
} from "@/server/actions/prayers"

/** A request ready to show: dates are written in the day of the user. */
export type PrayerView = {
  id: string
  title: string
  details: string | null
  category: PrayerCategory
  status: PrayerStatus
  prayerCount: number
  /** "12 oct. 2026", or null if never prayed for. */
  lastPrayed: string | null
  answered: string | null
  answerNote: string | null
}

type Draft = { title: string; details: string; category: PrayerCategory }

const emptyDraft: Draft = { title: "", details: "", category: "PERSONAL" }

export function PrayerJournal({
  prayers,
  status,
  total,
}: {
  prayers: PrayerView[]
  status: PrayerStatus
  /** Requests of the account, all statuses, for the limit. */
  total: number
}) {
  const t = useTranslations("Prayer")
  // "new", the id of the request being edited, or null.
  const [editing, setEditing] = useState<string | null>(null)
  const [answering, setAnswering] = useState<string | null>(null)
  const [error, setError] = useState<PrayerActionError | null>(null)
  const [pending, startTransition] = useTransition()

  function run(
    action: () => Promise<PrayerActionResult>,
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

  const atLimit = total >= maxPrayerRequestsPerUser

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <p
          role="alert"
          className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {t(`errors.${error}`, { max: maxPrayerRequestsPerUser })}
        </p>
      )}

      {status === "ACTIVE" &&
        (editing === "new" ? (
          <div className="rounded-3xl bg-white/85 p-5 ring-1 ring-brand-night/10 dark:bg-neutral-900/85 dark:ring-white/10">
            <PrayerForm
              initial={emptyDraft}
              pending={pending}
              onCancel={() => setEditing(null)}
              onSave={(draft) =>
                run(
                  () => savePrayerAction(null, draft),
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
                {t("errors.limit", { max: maxPrayerRequestsPerUser })}
              </p>
            )}
          </div>
        ))}

      {prayers.length === 0 && editing !== "new" ? (
        <div className="flex flex-col items-start gap-2 rounded-3xl border border-dashed border-brand-night/20 p-6 dark:border-white/20">
          <HandHeart aria-hidden className="size-6 text-brand-gold" />
          <h2 className="font-heading text-xl font-semibold">
            {t(`empty.${status}.title`)}
          </h2>
          <p className="text-brand-night/70 dark:text-neutral-100/70">
            {t(`empty.${status}.description`)}
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {prayers.map((prayer) => (
            <li
              key={prayer.id}
              className="rounded-3xl bg-white/85 p-5 ring-1 ring-brand-night/10 dark:bg-neutral-900/85 dark:ring-white/10"
            >
              {editing === prayer.id ? (
                <PrayerForm
                  initial={{
                    title: prayer.title,
                    details: prayer.details ?? "",
                    category: prayer.category,
                  }}
                  pending={pending}
                  onCancel={() => setEditing(null)}
                  onSave={(draft) =>
                    run(
                      () => savePrayerAction(prayer.id, draft),
                      () => setEditing(null)
                    )
                  }
                />
              ) : (
                <PrayerCard
                  prayer={prayer}
                  pending={pending}
                  answering={answering === prayer.id}
                  onPrayed={() => run(() => prayedAction(prayer.id))}
                  onStartAnswer={() => {
                    setError(null)
                    setAnswering(prayer.id)
                  }}
                  onCancelAnswer={() => setAnswering(null)}
                  onAnswer={(answerNote) =>
                    run(
                      () => answeredAction(prayer.id, { answerNote }),
                      () => setAnswering(null)
                    )
                  }
                  onEdit={() => {
                    setError(null)
                    setEditing(prayer.id)
                  }}
                  onArchive={() =>
                    run(() =>
                      setPrayerStatusAction(
                        prayer.id,
                        prayer.status === "ARCHIVED" ? "ACTIVE" : "ARCHIVED"
                      )
                    )
                  }
                  onDelete={() => {
                    if (window.confirm(t("confirmDelete")))
                      run(() => deletePrayerAction(prayer.id))
                  }}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function PrayerCard({
  prayer,
  pending,
  answering,
  onPrayed,
  onStartAnswer,
  onCancelAnswer,
  onAnswer,
  onEdit,
  onArchive,
  onDelete,
}: {
  prayer: PrayerView
  pending: boolean
  answering: boolean
  onPrayed: () => void
  onStartAnswer: () => void
  onCancelAnswer: () => void
  onAnswer: (note: string) => void
  onEdit: () => void
  onArchive: () => void
  onDelete: () => void
}) {
  const t = useTranslations("Prayer")
  const noteId = useId()
  const [note, setNote] = useState("")

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h2 className="font-heading text-xl font-semibold">{prayer.title}</h2>
          <span className="rounded-full bg-brand-night/[0.06] px-2.5 py-0.5 text-xs font-medium dark:bg-white/10">
            {t(`categories.${prayer.category}`)}
          </span>
        </div>
        {prayer.details && (
          <p className="whitespace-pre-line text-brand-night/80 dark:text-neutral-100/80">
            {prayer.details}
          </p>
        )}
        <p className="text-sm text-brand-night/60 dark:text-neutral-100/60">
          {prayer.lastPrayed
            ? t("lastPrayed", {
                date: prayer.lastPrayed,
                count: prayer.prayerCount,
              })
            : t("neverPrayed")}
        </p>
        {prayer.status === "ANSWERED" && (
          <div className="mt-2 flex flex-col gap-1 rounded-2xl bg-brand-gold/15 p-4">
            <p className="flex items-center gap-2 text-sm font-medium">
              <Sparkles aria-hidden className="size-4 text-brand-gold" />
              {t("answeredOn", { date: prayer.answered ?? "" })}
            </p>
            {prayer.answerNote && (
              <p className="whitespace-pre-line">{prayer.answerNote}</p>
            )}
          </div>
        )}
      </div>

      {answering ? (
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            onAnswer(note)
          }}
        >
          <Label htmlFor={noteId}>{t("answerNote")}</Label>
          <Textarea
            id={noteId}
            value={note}
            maxLength={maxPrayerTextLength}
            placeholder={t("answerPlaceholder")}
            onChange={(event) => setNote(event.target.value)}
            className="min-h-24"
            autoFocus
          />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={pending}>
              <Check />
              {t("confirmAnswered")}
            </Button>
            <Button type="button" variant="ghost" onClick={onCancelAnswer}>
              {t("cancel")}
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {prayer.status === "ACTIVE" && (
            <>
              <Button disabled={pending} onClick={onPrayed}>
                <HandHeart />
                {t("prayed")}
              </Button>
              <Button variant="outline" disabled={pending} onClick={onStartAnswer}>
                <Sparkles />
                {t("answered")}
              </Button>
            </>
          )}
          <div className="ml-auto flex items-center gap-1">
            {prayer.status !== "ANSWERED" && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onEdit}
                aria-label={t("edit")}
              >
                <Pencil />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              disabled={pending}
              onClick={onArchive}
              aria-label={
                prayer.status === "ARCHIVED" ? t("restore") : t("archive")
              }
            >
              {prayer.status === "ARCHIVED" ? <ArchiveRestore /> : <Archive />}
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
      )}
    </div>
  )
}

function PrayerForm({
  initial,
  pending,
  onSave,
  onCancel,
}: {
  initial: Draft
  pending: boolean
  onSave: (draft: Draft) => void
  onCancel: () => void
}) {
  const t = useTranslations("Prayer")
  const [draft, setDraft] = useState<Draft>(initial)
  const id = useId()
  const valid = draft.title.trim() !== ""

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault()
        if (valid) onSave(draft)
      }}
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-title`}>{t("fields.title")}</Label>
        <Input
          id={`${id}-title`}
          value={draft.title}
          maxLength={maxPrayerTitleLength}
          placeholder={t("fields.titlePlaceholder")}
          onChange={(event) => setDraft({ ...draft, title: event.target.value })}
          className="h-10"
          autoFocus
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-details`}>{t("fields.details")}</Label>
        <Textarea
          id={`${id}-details`}
          value={draft.details}
          maxLength={maxPrayerTextLength}
          onChange={(event) =>
            setDraft({ ...draft, details: event.target.value })
          }
          className="min-h-24"
        />
      </div>
      <div className="flex flex-col gap-2 sm:max-w-xs">
        <Label htmlFor={`${id}-category`}>{t("fields.category")}</Label>
        <select
          id={`${id}-category`}
          value={draft.category}
          onChange={(event) =>
            setDraft({
              ...draft,
              category: event.target.value as PrayerCategory,
            })
          }
          className="h-10 rounded-lg border border-input bg-transparent px-3"
        >
          {prayerCategories.map((category) => (
            <option key={category} value={category}>
              {t(`categories.${category}`)}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending || !valid}>
          {t("save")}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          {t("cancel")}
        </Button>
      </div>
    </form>
  )
}
