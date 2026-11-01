import { Stack } from "expo-router"
import { useTranslations } from "use-intl"

import { LargeTitleStack } from "@/components/large-title-stack"

// A screen opened from a link gets a back button to the tab's root.
export const unstable_settings = { initialRouteName: "bible" }

/** Sheets that rise from the bottom over the reader, as in reading apps. */
const sheet = {
  presentation: "formSheet" as const,
  sheetAllowedDetents: [0.6, 1],
  sheetGrabberVisible: true,
  sheetCornerRadius: 24,
  headerShown: false,
}

export default function BibleStack() {
  const t = useTranslations("App.nav")
  return (
    <LargeTitleStack name="bible" title={t("bible")}>
      <Stack.Screen name="choose-passage" options={sheet} />
      {/* The text stays usable behind it: more verses can be tapped. */}
      <Stack.Screen
        name="verse-actions"
        options={{
          ...sheet,
          sheetAllowedDetents: "fitToContents",
          sheetLargestUndimmedDetentIndex: "last",
        }}
      />
    </LargeTitleStack>
  )
}
