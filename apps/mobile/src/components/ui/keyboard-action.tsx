import type { ComponentProps } from "react"
import { InputAccessoryView, Platform, View } from "react-native"

import { spacing } from "@/theme/metrics"
import { useColors } from "@/theme/use-colors"

import { Button } from "./button"

/**
 * The main action of a form (save, create…) on a bar right above the
 * keyboard, so typing never hides it: the iPhone's own accessory bar,
 * shown with the fields whose `inputAccessoryViewID` is `id`. Android
 * lifts the screen above the keyboard instead, so there is nothing to add.
 */
export function KeyboardAction({
  id,
  ...button
}: ComponentProps<typeof Button> & { id: string }) {
  const colors = useColors()
  if (Platform.OS !== "ios") return null
  return (
    <InputAccessoryView nativeID={id}>
      <View
        style={{
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          backgroundColor: colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        <Button {...button} />
      </View>
    </InputAccessoryView>
  )
}
