"use client"

import { CircleAlertIcon } from "lucide-react"
import { useTranslations } from "next-intl"
import { useId, useState, useTransition } from "react"

import { maxNoteTextLength } from "@workspace/core"
import { Alert, AlertDescription } from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@workspace/ui/components/field"
import { Spinner } from "@workspace/ui/components/spinner"
import { Textarea } from "@workspace/ui/components/textarea"

import { PassagePicker } from "@/components/bible/passage-picker"
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
  const formId = useId()
  const [passage, setPassage] = useState(initial.passage)
  const [keyVerse, setKeyVerse] = useState(initial.keyVerse)
  const [reflection, setReflection] = useState(initial.reflection)
  const [application, setApplication] = useState(initial.application)
  const [error, setError] = useState<NoteActionError | "passage" | null>(null)
  const [pending, startTransition] = useTransition()

  function submit() {
    if (passage === "") return setError("passage")
    setError(null)
    startTransition(async () => {
      const result = await saveNoteAction(id, {
        passage,
        keyVerse: keyVerse === "" ? null : keyVerse,
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
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
    >
      <FieldGroup>
        {error && error !== "passage" && (
          <Alert variant="destructive" role="alert">
            <CircleAlertIcon />
            <AlertDescription>{t(`errors.${error}`)}</AlertDescription>
          </Alert>
        )}

        <FieldSet data-invalid={error === "passage" || undefined}>
          <FieldLegend variant="label">{t("fields.passage")}</FieldLegend>
          <PassagePicker value={passage} onChange={setPassage} />
          {error === "passage" && <FieldError>{t("errors.passage")}</FieldError>}
        </FieldSet>

        <FieldSet>
          <FieldLegend variant="label">{t("fields.keyVerse")}</FieldLegend>
          <PassagePicker value={keyVerse} onChange={setKeyVerse} />
        </FieldSet>

        <Field>
          <FieldLabel htmlFor={`${formId}-reflection`}>
            {t("fields.reflection")}
          </FieldLabel>
          <Textarea
            id={`${formId}-reflection`}
            value={reflection}
            maxLength={maxNoteTextLength}
            placeholder={t("fields.reflectionPlaceholder")}
            onChange={(event) => setReflection(event.target.value)}
            className="min-h-28"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${formId}-application`}>
            {t("fields.application")}
          </FieldLabel>
          <Textarea
            id={`${formId}-application`}
            value={application}
            maxLength={maxNoteTextLength}
            placeholder={t("fields.applicationPlaceholder")}
            onChange={(event) => setApplication(event.target.value)}
            className="min-h-20"
          />
        </Field>

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={pending}>
            {pending && <Spinner data-icon="inline-start" />}
            {t("save")}
          </Button>
          {onCancel && (
            <Button type="button" variant="ghost" onClick={onCancel}>
              {t("cancel")}
            </Button>
          )}
        </div>
      </FieldGroup>
    </form>
  )
}
