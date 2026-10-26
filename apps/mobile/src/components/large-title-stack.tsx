import { Stack } from "expo-router"
import type { ReactNode } from "react"
import { Platform, useColorScheme } from "react-native"

import { fontFamily } from "@/theme/fonts"
import { useColors } from "@/theme/use-colors"

/**
 * Native stack for a tab's root screen (as in expense-tracker-237): on iOS a
 * large title that shrinks into a centred title over a blurred bar while
 * scrolling; Android keeps a regular header.
 */
export function LargeTitleStack({
  name,
  title,
  headerRight,
}: {
  /** Route of the tab's root screen inside the stack. */
  name: string
  title: string
  headerRight?: () => ReactNode
}) {
  const colors = useColors()
  const dark = useColorScheme() === "dark"
  const ios = Platform.OS === "ios"
  return (
    <Stack
      screenOptions={{
        headerLargeTitle: true,
        headerTransparent: ios,
        headerBlurEffect: ios
          ? dark
            ? "systemChromeMaterialDark"
            : "systemChromeMaterialLight"
          : undefined,
        headerShadowVisible: false,
        headerLargeTitleShadowVisible: false,
        headerLargeStyle: { backgroundColor: colors.background },
        headerStyle: ios ? undefined : { backgroundColor: colors.background },
        headerTintColor: colors.primary,
        headerTitleStyle: {
          fontFamily: fontFamily.heading,
          color: colors.foreground,
        },
        headerLargeTitleStyle: {
          fontFamily: fontFamily.heading,
          color: colors.foreground,
        },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name={name} options={{ title, headerRight }} />
    </Stack>
  )
}
