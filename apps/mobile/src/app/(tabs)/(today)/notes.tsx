import { formatPassage, parsePassageSlug, type Locale } from "@workspace/core"
import { router, Stack } from "expo-router"
import { Plus } from "lucide-react-native"
import { useState } from "react"
import { Text } from "react-native"
import { useLocale, useTranslations } from "use-intl"

import { Body, TabScreen } from "@/components/screen"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useNotes, type Note } from "@/repositories/notes"
import { spacing, typography } from "@/theme/metrics"
import { useColors } from "@/theme/use-colors"

/** The meditation notes kept on the phone, searchable by a word. */
export default function NotesScreen() {
  const t = useTranslations("Notes")
  const [query, setQuery] = useState("")
  const notes = useNotes(query)
  return (
    <>
      <Stack.Screen options={{ title: t("title") }} />
      <TabScreen>
        <Body>{t("description")}</Body>
        <Button
          title={t("add")}
          icon={Plus}
          onPress={() => router.push("/note-edit")}
        />
        <Input
          label={t("search.label")}
          placeholder={t("search.placeholder")}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
        />
        {notes.length === 0 ? (
          <Card title={t(query.trim() ? "empty.filteredTitle" : "empty.title")}>
            <Body>
              {t(
                query.trim() ? "empty.filteredDescription" : "empty.description"
              )}
            </Body>
          </Card>
        ) : (
          notes.map((note) => <NoteCard key={note.id} note={note} />)
        )}
      </TabScreen>
    </>
  )
}

const passageOf = (slug: string | null, locale: Locale) => {
  const passage = slug ? parsePassageSlug(slug) : null
  return passage ? formatPassage(passage, locale) : null
}

function NoteCard({ note }: { note: Note }) {
  const t = useTranslations("Notes")
  const locale = useLocale() as Locale
  const colors = useColors()
  const keyVerse = passageOf(note.keyVerse, locale)
  const text = [typography.body, { color: colors.foreground }]
  const label = [typography.small, { color: colors.mutedForeground }]
  return (
    <Card title={passageOf(note.passage, locale) ?? note.passage}>
      {keyVerse ? (
        <Text style={label}>
          {t("fields.keyVerse")} · {keyVerse}
        </Text>
      ) : null}
      {note.reflection ? (
        <>
          <Text style={label}>{t("fields.reflection")}</Text>
          <Text style={text}>{note.reflection}</Text>
        </>
      ) : null}
      {note.application ? (
        <>
          <Text style={label}>{t("fields.application")}</Text>
          <Text style={text}>{note.application}</Text>
        </>
      ) : null}
      <Button
        title={t("edit")}
        variant="outline"
        size="sm"
        style={{ alignSelf: "flex-start", marginTop: spacing.xs }}
        onPress={() =>
          router.push({ pathname: "/note-edit", params: { id: note.id } })
        }
      />
    </Card>
  )
}
