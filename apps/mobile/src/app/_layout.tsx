import { Stack, ThemeProvider } from "expo-router"
import * as SplashScreen from "expo-splash-screen"
import { StatusBar } from "expo-status-bar"
import { useEffect } from "react"
import { useColorScheme } from "react-native"

import { I18nProvider } from "@/i18n/provider"
import { navigationTheme } from "@/theme/colors"
import { useFonts } from "@/theme/fonts"

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
  return (
    <ThemeProvider
      value={navigationTheme(colorScheme === "dark" ? "dark" : "light")}
    >
      <StatusBar style="auto" />
      {/* Each tab has its own stack and header. */}
      <Stack screenOptions={{ headerShown: false }} />
    </ThemeProvider>
  )
}
