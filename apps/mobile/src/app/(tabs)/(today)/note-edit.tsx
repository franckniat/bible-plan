import {
  formatPassage,
  maxNoteTextLength,
  parsePassageSlug,
  parseReference,
  toPassageSlug,
  type Locale,
} from "@workspace/core"
import { router, Stack, useLocalSearchParams } from "expo-router"
import { useState } from "react"
import { Text } from "react-native"
import { useLocale, useTranslations } from "use-intl"

import { TabScreen } from "@/components/screen"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { confirm } from "@/lib/confirm"
import { notebook, useNote, type Note } from "@/repositories/notes"
import { typography } from "@/theme/metrics"
import { useColors } from "@/theme/use-colors"

/**
 * Writes a meditation note (`?id=` to change one, `?session=` after a
 * session, `?passage=` a slug to start from).
 */
export default function NoteEditScreen() {
  const params = useLocalSearchParams<{
    id?: string
    session?: string
    passage?: string
  }>()
  const note = useNote(params.id)
  return (
    <NoteForm
      key={note?.id ?? "new"}
      id={params.id ?? null}
      note={note}
      session={params.session ?? null}
      passage={params.passage ?? null}
    />
  )
}

/** A slug shown as the reference people type, "Jean 3:1–21". */
const asText = (slug: string | null | undefined, locale: Locale) => {
  const passage = slug ? parsePassageSlug(slug) : null
  return passage ? formatPassage(passage, locale) : ""
}

/** The first passage of a typed reference, as a slug; null when unknown. */
const toSlug = (text: string, locale: Locale) => {
  const [passage] = parseReference(text, { locale }) ?? []
  return passage ? toPassageSlug(passage) : null
}

function NoteForm({
  id,
  note,
  session,
  passage,
}: {
  id: string | null
  note: Note | null
  session: string | null
  passage: string | null
}) {
  const t = useTranslations("Notes")
  const locale = useLocale() as Locale
  const colors = useColors()
  const [reference, setReference] = useState(
    asText(note?.passage ?? passage, locale)
  )
  const [keyVerse, setKeyVerse] = useState(asText(note?.keyVerse, locale))
  const [reflection, setReflection] = useState(note?.reflection ?? "")
  const [application, setApplication] = useState(note?.application ?? "")
  const [error, setError] = useState<string | null>(null)

  const save = () => {
    const slug = toSlug(reference, locale)
    const key = keyVerse.trim() ? toSlug(keyVerse, locale) : null
    if (!slug || (keyVerse.trim() && !key)) return setError(t("errors.passage"))
    if (!reflection.trim() && !application.trim() && !key) {
      return setError(t("errors.invalid"))
    }
    const result = notebook.save(
      {
        passage: slug,
        keyVerse: key,
        reflection,
        application,
        sessionId: session,
      },
      id
    )
    if (result.ok) router.back()
    else setError(t("errors.notFound"))
  }

  const remove = async () => {
    if (!id) return
    const sure = await confirm({
      title: t("deleteDialog.title"),
      message: t("deleteDialog.description"),
      confirmLabel: t("delete"),
      cancelLabel: t("cancel"),
    })
    if (!sure) return
    notebook.remove(id)
    router.back()
  }

  const long = {
    minHeight: 110,
    textAlignVertical: "top" as const,
    paddingTop: 12,
  }
  return (
    <>
      <Stack.Screen options={{ title: id ? t("edit") : t("add") }} />
      <TabScreen>
        <Input
          label={t("fields.passage")}
          placeholder={locale === "fr" ? "Jean 3:1-21" : "John 3:1-21"}
          value={reference}
          onChangeText={setReference}
          autoFocus={!id && !passage}
        />
        <Input
          label={t("fields.keyVerse")}
          placeholder={locale === "fr" ? "Jean 3:16" : "John 3:16"}
          value={keyVerse}
          onChangeText={setKeyVerse}
        />
        <Input
          label={t("fields.reflection")}
          placeholder={t("fields.reflectionPlaceholder")}
          value={reflection}
          onChangeText={setReflection}
          maxLength={maxNoteTextLength}
          multiline
          style={long}
        />
        <Input
          label={t("fields.application")}
          placeholder={t("fields.applicationPlaceholder")}
          value={application}
          onChangeText={setApplication}
          maxLength={maxNoteTextLength}
          multiline
          style={long}
        />
        {error ? (
          <Text style={[typography.small, { color: colors.destructive }]}>
            {error}
          </Text>
        ) : null}
        <Button title={t("save")} onPress={save} />
        {id ? (
          <Button title={t("delete")} variant="destructive" onPress={remove} />
        ) : (
          <Button
            title={t("cancel")}
            variant="ghost"
            onPress={() => router.back()}
          />
        )}
      </TabScreen>
    </>
  )
}
