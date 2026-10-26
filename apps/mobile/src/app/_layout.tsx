import { Stack, ThemeProvider } from "expo-router"
import * as SplashScreen from "expo-splash-screen"
import { StatusBar } from "expo-status-bar"
import { useEffect } from "react"
import { useColorScheme } from "react-native"
import { useTranslations } from "use-intl"

import { I18nProvider } from "@/i18n/provider"
import { navigationTheme } from "@/theme/colors"
import { fontFamily, useFonts } from "@/theme/fonts"

void SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const fontsReady = useFonts()
  useEffect(() => {
    if (fontsReady) void SplashScreen.hideAsync()
  }, [fontsReady])
  if (!fontsReady) return null
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
      <Stack
        screenOptions={{
          headerTitleStyle: { fontFamily: fontFamily.heading },
        }}
      >
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
