import { Stack, ThemeProvider } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { useColorScheme } from "react-native"
import { useTranslations } from "use-intl"

import { I18nProvider } from "@/i18n/provider"
import { navigationTheme } from "@/theme/colors"

export default function RootLayout() {
  return (
    <I18nProvider>
      <Navigation />
    </I18nProvider>
  )
}

function Navigation() {
  const colorScheme = useColorScheme()
  const t = useTranslations("Mobile")
  return (
    <ThemeProvider
      value={navigationTheme(colorScheme === "dark" ? "dark" : "light")}
    >
      <StatusBar style="auto" />
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="join/[code]" options={{ title: t("join.title") }} />
        <Stack.Screen
          name="prayer-time"
          options={{ title: t("prayerTime.title"), presentation: "modal" }}
        />
      </Stack>
    </ThemeProvider>
  )
}
