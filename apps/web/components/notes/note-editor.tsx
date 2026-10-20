"use client"

import { useLocale, useTranslations } from "next-intl"
import { useId, useState, useTransition } from "react"

import { maxNoteTextLength, type Locale } from "@workspace/core"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Textarea } from "@workspace/ui/components/textarea"

import { labelOfSlug, slugFromText } from "@/lib/passage-input"
import {
  saveNoteAction,
  type NoteActionError,
} from "@/server/actions/meditation"

export type NoteDraft = {
  /** Passage slug, "" while nothing is chosen. */
  passage: string
  keyVerse: string
  reflection: string
  application: string
}

export const emptyNoteDraft: NoteDraft = {
  passage: "",
  keyVerse: "",
  reflection: "",
  application: "",
}

/**
 * Writes a note about a passage: the key verse, a reflection and how to live
 * it. Creates the note, or changes the one with `id`.
 */
export function NoteEditor({
  id = null,
  initial,
  sessionId = null,
  onSaved,
  onCancel,
}: {
  id?: string | null
  initial: NoteDraft
  /** The meditation session this note follows, if any. */
  sessionId?: string | null
  onSaved: () => void
  onCancel?: () => void
}) {
  const t = useTranslations("Notes")
  const locale = useLocale() as Locale
  const formId = useId()
  const [passageText, setPassageText] = useState(
    initial.passage ? labelOfSlug(initial.passage, locale) : ""
  )
  const [keyVerseText, setKeyVerseText] = useState(
    initial.keyVerse ? labelOfSlug(initial.keyVerse, locale) : ""
  )
  const [reflection, setReflection] = useState(initial.reflection)
  const [application, setApplication] = useState(initial.application)
  const [error, setError] = useState<
    NoteActionError | "passage" | "keyVerse" | null
  >(null)
  const [pending, startTransition] = useTransition()

  function submit() {
    const passage = slugFromText(passageText, locale)
    if (!passage) return setError("passage")
    const keyVerse =
      keyVerseText.trim() === "" ? null : slugFromText(keyVerseText, locale)
    if (keyVerseText.trim() !== "" && !keyVerse) return setError("keyVerse")
    setError(null)
    startTransition(async () => {
      const result = await saveNoteAction(id, {
        passage,
        keyVerse,
        reflection,
        application,
        sessionId,
      }).catch(() => ({ error: "unexpected" }) as const)
      if ("error" in result) setError(result.error)
      else onSaved()
    })
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
    >
      {error && (
        <p
          role="alert"
          className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {t(`errors.${error}`)}
        </p>
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${formId}-passage`}>{t("fields.passage")}</Label>
          <Input
            id={`${formId}-passage`}
            value={passageText}
            placeholder={t("fields.passagePlaceholder")}
            aria-invalid={error === "passage"}
            onChange={(event) => setPassageText(event.target.value)}
            className="h-10"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${formId}-key`}>{t("fields.keyVerse")}</Label>
          <Input
            id={`${formId}-key`}
            value={keyVerseText}
            placeholder={t("fields.keyVersePlaceholder")}
            aria-invalid={error === "keyVerse"}
            onChange={(event) => setKeyVerseText(event.target.value)}
            className="h-10"
          />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${formId}-reflection`}>{t("fields.reflection")}</Label>
        <Textarea
          id={`${formId}-reflection`}
          value={reflection}
          maxLength={maxNoteTextLength}
          placeholder={t("fields.reflectionPlaceholder")}
          onChange={(event) => setReflection(event.target.value)}
          className="min-h-28"
          autoFocus={initial.passage !== ""}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${formId}-application`}>
          {t("fields.application")}
        </Label>
        <Textarea
          id={`${formId}-application`}
          value={application}
          maxLength={maxNoteTextLength}
          placeholder={t("fields.applicationPlaceholder")}
          onChange={(event) => setApplication(event.target.value)}
          className="min-h-20"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>
          {t("save")}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            {t("cancel")}
          </Button>
        )}
      </div>
    </form>
  )
}
