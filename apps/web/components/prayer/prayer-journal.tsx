"use client"

import {
  Archive,
  ArchiveRestore,
  BookOpen,
  Check,
  HandHeart,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { useId, useState, useTransition } from "react"

import {
  formatPassage,
  maxPrayerPassages,
  maxPrayerRequestsPerUser,
  maxPrayerTextLength,
  maxPrayerTitleLength,
  parsePassageSlug,
  parseReference,
  prayerCategories,
  toPassageSlug,
  type IsoDate,
  type Locale,
  type PrayerCategory,
  type PrayerStatus,
} from "@workspace/core"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Textarea } from "@workspace/ui/components/textarea"

import { Link } from "@/i18n/navigation"
import { formatIsoDate } from "@/lib/dates"
import {
  answeredAction,
  deletePrayerAction,
  prayedAction,
  savePrayerAction,
  setPrayerStatusAction,
  updateAnswerAction,
  type PrayerActionError,
  type PrayerActionResult,
} from "@/server/actions/prayers"

/** A request ready to show. Dates are calendar dates in the day of the user. */
export type PrayerView = {
  id: string
  title: string
  details: string | null
  category: PrayerCategory
  status: PrayerStatus
  startedOn: IsoDate
  /** Passage slugs, to read in the Bible. */
  passages: string[]
  prayerCount: number
  /** "12 oct. 2026", or null if never prayed for. */
  lastPrayed: string | null
  answeredOn: IsoDate | null
  answerNote: string | null
}

type Draft = {
  title: string
  details: string
  category: PrayerCategory
  startedOn: IsoDate
  passages: string[]
}

type AnswerDraft = { answeredOn: IsoDate; answerNote: string }

export function PrayerJournal({
  prayers,
  status,
  total,
  today,
}: {
  prayers: PrayerView[]
  status: PrayerStatus
  /** Requests of the account, all statuses, for the limit. */
  total: number
  /** The day of the user. */
  today: IsoDate
}) {
  const t = useTranslations("Prayer")
  // "new", the id of the request being edited, or null.
  const [editing, setEditing] = useState<string | null>(null)
  // The request being answered, or whose answer is being corrected.
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
  const emptyDraft: Draft = {
    title: "",
    details: "",
    category: "PERSONAL",
    startedOn: today,
    passages: [],
  }

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
              today={today}
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
                    startedOn: prayer.startedOn,
                    passages: prayer.passages,
                  }}
                  today={today}
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
                  today={today}
                  pending={pending}
                  answering={answering === prayer.id}
                  onPrayed={() => run(() => prayedAction(prayer.id))}
                  onStartAnswer={() => {
                    setError(null)
                    setAnswering(prayer.id)
                  }}
                  onCancelAnswer={() => setAnswering(null)}
                  onAnswer={(draft) =>
                    run(
                      () =>
                        prayer.status === "ANSWERED"
                          ? updateAnswerAction(prayer.id, draft)
                          : answeredAction(prayer.id, draft),
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

/** The passages of a prayer, each one a link to read it in the Bible. */
function PassageLinks({ slugs }: { slugs: string[] }) {
  const t = useTranslations("Prayer")
  const locale = useLocale() as Locale
  const passages = slugs.flatMap((slug) => {
    const passage = parsePassageSlug(slug)
    return passage ? [{ slug, label: formatPassage(passage, locale) }] : []
  })
  if (passages.length === 0) return null
  return (
    <ul aria-label={t("passages.label")} className="flex flex-wrap gap-2">
      {passages.map(({ slug, label }) => (
        <li key={slug}>
          <Link
            href={`/read/${slug}`}
            className="flex items-center gap-1.5 rounded-full px-3 py-1 text-sm ring-1 ring-brand-night/15 transition-colors outline-none hover:bg-brand-gold/10 focus-visible:ring-3 focus-visible:ring-brand-gold dark:ring-white/20"
          >
            <BookOpen aria-hidden className="size-3.5 text-brand-gold" />
            {label}
            <span className="sr-only"> — {t("passages.read")}</span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

function PrayerCard({
  prayer,
  today,
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
  today: IsoDate
  pending: boolean
  answering: boolean
  onPrayed: () => void
  onStartAnswer: () => void
  onCancelAnswer: () => void
  onAnswer: (draft: AnswerDraft) => void
  onEdit: () => void
  onArchive: () => void
  onDelete: () => void
}) {
  const t = useTranslations("Prayer")
  const locale = useLocale()
  const answered = prayer.status === "ANSWERED"

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
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
        <PassageLinks slugs={prayer.passages} />
        <p className="text-sm text-brand-night/60 dark:text-neutral-100/60">
          {t("startedOn", { date: formatIsoDate(prayer.startedOn, locale) })}
          {" · "}
          {prayer.lastPrayed
            ? t("lastPrayed", {
                date: prayer.lastPrayed,
                count: prayer.prayerCount,
              })
            : t("neverPrayed")}
        </p>
        {answered && !answering && (
          <div className="mt-2 flex flex-col gap-1 rounded-2xl bg-brand-gold/15 p-4">
            <p className="flex items-center gap-2 text-sm font-medium">
              <Sparkles aria-hidden className="size-4 text-brand-gold" />
              {t("answeredOn", {
                date: prayer.answeredOn
                  ? formatIsoDate(prayer.answeredOn, locale)
                  : "",
              })}
            </p>
            {prayer.answerNote ? (
              <p className="whitespace-pre-line">{prayer.answerNote}</p>
            ) : (
              <p className="text-sm text-brand-night/70 dark:text-neutral-100/70">
                {t("noCircumstances")}
              </p>
            )}
          </div>
        )}
      </div>

      {answering ? (
        <AnswerForm
          initial={{
            answeredOn: prayer.answeredOn ?? today,
            answerNote: prayer.answerNote ?? "",
          }}
          today={today}
          pending={pending}
          submitLabel={answered ? t("save") : t("confirmAnswered")}
          onCancel={onCancelAnswer}
          onSave={onAnswer}
        />
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {prayer.status === "ACTIVE" && (
            <>
              <Button disabled={pending} onClick={onPrayed}>
                <HandHeart />
                {t("prayed")}
              </Button>
              <Button
                variant="outline"
                disabled={pending}
                onClick={onStartAnswer}
              >
                <Sparkles />
                {t("answered")}
              </Button>
            </>
          )}
          {answered && (
            <Button variant="outline" onClick={onStartAnswer}>
              <Pencil />
              {t("editAnswer")}
            </Button>
          )}
          <div className="ml-auto flex items-center gap-1">
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

/** The day and the circumstances of an answer. */
function AnswerForm({
  initial,
  today,
  pending,
  submitLabel,
  onSave,
  onCancel,
}: {
  initial: AnswerDraft
  today: IsoDate
  pending: boolean
  submitLabel: string
  onSave: (draft: AnswerDraft) => void
  onCancel: () => void
}) {
  const t = useTranslations("Prayer")
  const [draft, setDraft] = useState<AnswerDraft>(initial)
  const id = useId()

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        if (draft.answeredOn) onSave(draft)
      }}
    >
      <div className="flex flex-col gap-2 sm:max-w-xs">
        <Label htmlFor={`${id}-day`}>{t("fields.answeredOn")}</Label>
        <Input
          id={`${id}-day`}
          type="date"
          value={draft.answeredOn}
          max={today}
          onChange={(event) =>
            setDraft({ ...draft, answeredOn: event.target.value })
          }
          className="h-10"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-note`}>{t("fields.answerNote")}</Label>
        <Textarea
          id={`${id}-note`}
          value={draft.answerNote}
          maxLength={maxPrayerTextLength}
          placeholder={t("fields.answerPlaceholder")}
          onChange={(event) =>
            setDraft({ ...draft, answerNote: event.target.value })
          }
          className="min-h-24"
          autoFocus
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending || !draft.answeredOn}>
          <Check />
          {submitLabel}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          {t("cancel")}
        </Button>
      </div>
    </form>
  )
}

function PrayerForm({
  initial,
  today,
  pending,
  onSave,
  onCancel,
}: {
  initial: Draft
  today: IsoDate
  pending: boolean
  onSave: (draft: Draft) => void
  onCancel: () => void
}) {
  const t = useTranslations("Prayer")
  const locale = useLocale() as Locale
  const [draft, setDraft] = useState<Draft>(initial)
  const [reference, setReference] = useState("")
  const [referenceError, setReferenceError] = useState<
    "invalid" | "limit" | null
  >(null)
  const id = useId()
  const valid = draft.title.trim() !== "" && draft.startedOn !== ""

  /** Reads what was typed ("Ps 51:1-4; Jn 3:16") and adds its passages. */
  function addReference() {
    const text = reference.trim()
    if (text === "") return
    const parsed = parseReference(text, { locale })
    if (!parsed) return setReferenceError("invalid")
    const slugs = [
      ...new Set([...draft.passages, ...parsed.map((p) => toPassageSlug(p))]),
    ]
    if (slugs.length > maxPrayerPassages) return setReferenceError("limit")
    setDraft({ ...draft, passages: slugs })
    setReference("")
    setReferenceError(null)
  }

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
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${id}-started`}>{t("fields.startedOn")}</Label>
          <Input
            id={`${id}-started`}
            type="date"
            value={draft.startedOn}
            max={today}
            onChange={(event) =>
              setDraft({ ...draft, startedOn: event.target.value })
            }
            className="h-10"
          />
        </div>
        <div className="flex flex-col gap-2">
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
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-reference`}>{t("fields.passages")}</Label>
        <div className="flex gap-2">
          <Input
            id={`${id}-reference`}
            value={reference}
            placeholder={t("fields.passagesPlaceholder")}
            aria-invalid={referenceError !== null}
            onChange={(event) => {
              setReference(event.target.value)
              setReferenceError(null)
            }}
            onKeyDown={(event) => {
              // Enter adds the passage instead of saving the whole request.
              if (event.key === "Enter") {
                event.preventDefault()
                addReference()
              }
            }}
            className="h-10"
          />
          <Button
            type="button"
            variant="outline"
            className="h-10"
            disabled={reference.trim() === ""}
            onClick={addReference}
          >
            {t("passages.add")}
          </Button>
        </div>
        {referenceError && (
          <p role="alert" className="text-sm text-destructive">
            {t(`passages.errors.${referenceError}`, {
              max: maxPrayerPassages,
            })}
          </p>
        )}
        {draft.passages.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {draft.passages.flatMap((slug) => {
              const passage = parsePassageSlug(slug)
              if (!passage) return []
              const label = formatPassage(passage, locale)
              return [
                <li
                  key={slug}
                  className="flex items-center gap-1 rounded-full bg-brand-night/[0.06] py-1 pr-1 pl-3 text-sm dark:bg-white/10"
                >
                  {label}
                  <button
                    type="button"
                    aria-label={t("passages.remove", { passage: label })}
                    onClick={() =>
                      setDraft({
                        ...draft,
                        passages: draft.passages.filter((s) => s !== slug),
                      })
                    }
                    className="rounded-full p-1 outline-none hover:bg-brand-night/10 focus-visible:ring-3 focus-visible:ring-brand-gold dark:hover:bg-white/10"
                  >
                    <X aria-hidden className="size-3.5" />
                  </button>
                </li>,
              ]
            })}
          </ul>
        )}
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
