"use client"

import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  BookOpenIcon,
  CheckIcon,
  CircleAlertIcon,
  HandHeartIcon,
  PencilIcon,
  PlusIcon,
  SparklesIcon,
  XIcon,
} from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { useId, useState, useTransition } from "react"

import {
  maxPrayerPassages,
  maxPrayerRequestsPerUser,
  maxPrayerTextLength,
  maxPrayerTitleLength,
  prayerCategories,
  type IsoDate,
  type Locale,
  type PrayerCategory,
  type PrayerStatus,
} from "@workspace/core"
import { Alert, AlertDescription } from "@workspace/ui/components/alert"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@workspace/ui/components/empty"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Spinner } from "@workspace/ui/components/spinner"
import { Textarea } from "@workspace/ui/components/textarea"

import { PassagePicker } from "@/components/bible/passage-picker"
import { ConfirmDeleteButton } from "@/components/confirm-delete-button"
import { Link } from "@/i18n/navigation"
import { formatIsoDate } from "@/lib/dates"
import { labelOfSlug } from "@/lib/passage-input"
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
        <Alert variant="destructive" role="alert">
          <CircleAlertIcon />
          <AlertDescription>
            {t(`errors.${error}`, { max: maxPrayerRequestsPerUser })}
          </AlertDescription>
        </Alert>
      )}

      {status === "ACTIVE" &&
        (editing === "new" ? (
          <Card>
            <CardContent>
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
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <Button
              size="lg"
              className="h-11 sm:px-5"
              disabled={atLimit}
              onClick={() => {
                setError(null)
                setEditing("new")
              }}
            >
              <PlusIcon data-icon="inline-start" />
              {t("add")}
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-11 sm:px-5"
              nativeButton={false}
              render={<Link href="/prayer/timer" />}
            >
              <HandHeartIcon data-icon="inline-start" />
              {t("timer")}
            </Button>
            {atLimit && (
              <p className="text-sm text-muted-foreground">
                {t("errors.limit", { max: maxPrayerRequestsPerUser })}
              </p>
            )}
          </div>
        ))}

      {prayers.length === 0 && editing !== "new" ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HandHeartIcon />
            </EmptyMedia>
            <EmptyTitle>{t(`empty.${status}.title`)}</EmptyTitle>
            <EmptyDescription>
              {t(`empty.${status}.description`)}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="flex flex-col gap-3">
          {prayers.map((prayer) => (
            <li key={prayer.id}>
              <Card>
                {editing === prayer.id ? (
                  <CardContent>
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
                  </CardContent>
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
                    onDelete={() => run(() => deletePrayerAction(prayer.id))}
                  />
                )}
              </Card>
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
  if (slugs.length === 0) return null
  return (
    <ul aria-label={t("passages.label")} className="flex flex-wrap gap-2">
      {slugs.map((slug) => (
        <li key={slug}>
          <Badge
            variant="outline"
            className="h-6 px-2.5 text-sm"
            render={<Link href={`/read/${slug}`} />}
          >
            <BookOpenIcon data-icon="inline-start" />
            {labelOfSlug(slug, locale)}
            <span className="sr-only"> — {t("passages.read")}</span>
          </Badge>
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
    <>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-x-3 gap-y-1 font-heading text-xl">
          {prayer.title}
          <Badge variant="secondary">{t(`categories.${prayer.category}`)}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {prayer.details && (
          <p className="whitespace-pre-line text-muted-foreground">
            {prayer.details}
          </p>
        )}
        <PassageLinks slugs={prayer.passages} />
        <p className="text-sm text-muted-foreground">
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
          <Alert>
            <SparklesIcon />
            <AlertDescription className="flex flex-col gap-1 text-foreground">
              <span className="font-medium">
                {t("answeredOn", {
                  date: prayer.answeredOn
                    ? formatIsoDate(prayer.answeredOn, locale)
                    : "",
                })}
              </span>
              {prayer.answerNote ? (
                <span className="whitespace-pre-line">{prayer.answerNote}</span>
              ) : (
                <span className="text-muted-foreground">
                  {t("noCircumstances")}
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}
        {answering && (
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
        )}
      </CardContent>
      {!answering && (
        <CardFooter className="flex-wrap gap-2">
          {prayer.status === "ACTIVE" && (
            <>
              <Button disabled={pending} onClick={onPrayed}>
                {pending ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <HandHeartIcon data-icon="inline-start" />
                )}
                {t("prayed")}
              </Button>
              <Button
                variant="outline"
                disabled={pending}
                onClick={onStartAnswer}
              >
                <SparklesIcon data-icon="inline-start" />
                {t("answered")}
              </Button>
            </>
          )}
          {answered && (
            <Button variant="outline" onClick={onStartAnswer}>
              <PencilIcon data-icon="inline-start" />
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
              <PencilIcon />
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
              {prayer.status === "ARCHIVED" ? (
                <ArchiveRestoreIcon />
              ) : (
                <ArchiveIcon />
              )}
            </Button>
            <ConfirmDeleteButton
              label={t("delete")}
              title={t("deleteDialog.title")}
              description={t("deleteDialog.description", {
                title: prayer.title,
              })}
              confirmLabel={t("delete")}
              cancelLabel={t("cancel")}
              disabled={pending}
              onConfirm={onDelete}
            />
          </div>
        </CardFooter>
      )}
    </>
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
      onSubmit={(event) => {
        event.preventDefault()
        if (draft.answeredOn) onSave(draft)
      }}
    >
      <FieldGroup>
        <Field className="sm:max-w-xs">
          <FieldLabel htmlFor={`${id}-day`}>{t("fields.answeredOn")}</FieldLabel>
          <Input
            id={`${id}-day`}
            type="date"
            value={draft.answeredOn}
            max={today}
            onChange={(event) =>
              setDraft({ ...draft, answeredOn: event.target.value })
            }
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${id}-note`}>
            {t("fields.answerNote")}
          </FieldLabel>
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
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={pending || !draft.answeredOn}>
            {pending ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <CheckIcon data-icon="inline-start" />
            )}
            {submitLabel}
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel}>
            {t("cancel")}
          </Button>
        </div>
      </FieldGroup>
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
  // The passage being chosen, added to the list with the button.
  const [candidate, setCandidate] = useState("")
  // Remounts the picker once a passage is added, to start another.
  const [pickerKey, setPickerKey] = useState(0)
  const id = useId()
  const valid = draft.title.trim() !== "" && draft.startedOn !== ""
  const full = draft.passages.length >= maxPrayerPassages

  function addPassage() {
    if (candidate === "" || draft.passages.includes(candidate)) return
    setDraft({ ...draft, passages: [...draft.passages, candidate] })
    setCandidate("")
    setPickerKey((key) => key + 1)
  }

  const categories = prayerCategories.map((category) => ({
    value: category,
    label: t(`categories.${category}`),
  }))

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        if (valid) onSave(draft)
      }}
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor={`${id}-title`}>{t("fields.title")}</FieldLabel>
          <Input
            id={`${id}-title`}
            value={draft.title}
            maxLength={maxPrayerTitleLength}
            placeholder={t("fields.titlePlaceholder")}
            onChange={(event) =>
              setDraft({ ...draft, title: event.target.value })
            }
            autoFocus
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${id}-details`}>
            {t("fields.details")}
          </FieldLabel>
          <Textarea
            id={`${id}-details`}
            value={draft.details}
            maxLength={maxPrayerTextLength}
            onChange={(event) =>
              setDraft({ ...draft, details: event.target.value })
            }
            className="min-h-24"
          />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor={`${id}-started`}>
              {t("fields.startedOn")}
            </FieldLabel>
            <Input
              id={`${id}-started`}
              type="date"
              value={draft.startedOn}
              max={today}
              onChange={(event) =>
                setDraft({ ...draft, startedOn: event.target.value })
              }
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`${id}-category`}>
              {t("fields.category")}
            </FieldLabel>
            <Select
              items={categories}
              value={draft.category}
              onValueChange={(category) =>
                category &&
                setDraft({ ...draft, category: category as PrayerCategory })
              }
            >
              <SelectTrigger id={`${id}-category`} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {categories.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        </div>

        <FieldSet>
          <FieldLegend variant="label">{t("fields.passages")}</FieldLegend>
          <FieldDescription>{t("fields.passagesHint")}</FieldDescription>
          {draft.passages.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {draft.passages.map((slug) => {
                const label = labelOfSlug(slug, locale)
                return (
                  <li key={slug}>
                    <Badge variant="secondary" className="h-7 gap-1 pr-1 pl-2.5 text-sm">
                      {label}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        aria-label={t("passages.remove", { passage: label })}
                        onClick={() =>
                          setDraft({
                            ...draft,
                            passages: draft.passages.filter((s) => s !== slug),
                          })
                        }
                      >
                        <XIcon />
                      </Button>
                    </Badge>
                  </li>
                )
              })}
            </ul>
          )}
          {full ? (
            <FieldError>
              {t("passages.errors.limit", { max: maxPrayerPassages })}
            </FieldError>
          ) : (
            <>
              <PassagePicker
                key={pickerKey}
                value={candidate}
                onChange={setCandidate}
              />
              <div>
                <Button
                  type="button"
                  variant="outline"
                  disabled={candidate === ""}
                  onClick={addPassage}
                >
                  <PlusIcon data-icon="inline-start" />
                  {t("passages.add")}
                </Button>
              </div>
            </>
          )}
        </FieldSet>

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={pending || !valid}>
            {pending && <Spinner data-icon="inline-start" />}
            {t("save")}
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel}>
            {t("cancel")}
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}
