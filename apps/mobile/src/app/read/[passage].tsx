import { formatPassage, parsePassageSlug } from "@workspace/core"
import { Stack, useLocalSearchParams } from "expo-router"

import { Body, Screen } from "@/components/screen"

/** A passage opened from a link, e.g. bibleplan://read/John.3 */
export default function ReadScreen() {
  const { passage: slug } = useLocalSearchParams<{ passage: string }>()
  const passage = parsePassageSlug(slug)
  const title = passage ? formatPassage(passage, "fr") : "Passage introuvable"
  return (
    <>
      <Stack.Screen options={{ title }} />
      <Screen title={title}>
        {!passage && <Body>Le lien « {slug} » ne désigne aucun passage.</Body>}
      </Screen>
    </>
  )
}
