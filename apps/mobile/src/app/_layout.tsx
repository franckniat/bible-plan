import { Stack, ThemeProvider } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { useColorScheme } from "react-native"

import { navigationTheme } from "@/theme/colors"

export default function RootLayout() {
  const colorScheme = useColorScheme()
  return (
    <ThemeProvider
      value={navigationTheme(colorScheme === "dark" ? "dark" : "light")}
    >
      <StatusBar style="auto" />
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="join/[code]" options={{ title: "Invitation" }} />
        <Stack.Screen
          name="prayer-time"
          options={{ title: "Temps de prière", presentation: "modal" }}
        />
      </Stack>
    </ThemeProvider>
  )
}
