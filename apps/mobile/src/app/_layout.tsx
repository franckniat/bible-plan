import { Stack, ThemeProvider } from "expo-router"
import * as SplashScreen from "expo-splash-screen"
import { StatusBar } from "expo-status-bar"
import { useEffect } from "react"
import { useColorScheme } from "react-native"
import { useTranslations } from "use-intl"

import { Celebration } from "@/components/achievements/celebration"
import { Body, Screen } from "@/components/screen"
import { useDatabase } from "@/db/migrate"
import { I18nProvider } from "@/i18n/provider"
import { useAchievementEvaluation } from "@/lib/achievements/keep-evaluated"
import { usePreferences } from "@/lib/preferences"
import { useReminderResponses } from "@/lib/reminders/actions"
import { useReminderScheduling } from "@/lib/reminders/keep-scheduled"
import { useProfile } from "@/repositories/profile"
import { navigationTheme } from "@/theme/colors"
import { useFonts } from "@/theme/fonts"

void SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const fontsReady = useFonts()
  const database = useDatabase()
  const ready = fontsReady && (database.ready || database.error !== undefined)
  useEffect(() => {
    if (ready) void SplashScreen.hideAsync()
  }, [ready])
  if (!ready) return null
  return (
    // Without a database there is no profile: the phone's language then.
    database.error ? (
      <I18nProvider>
        <DatabaseError />
      </I18nProvider>
    ) : (
      <App />
    )
  )
}

/** The app in the language of the profile. */
function App() {
  const { locale } = useProfile()
  useReminderScheduling()
  useReminderResponses()
  useAchievementEvaluation()
  return (
    <I18nProvider locale={locale}>
      <Navigation />
      <Celebration />
    </I18nProvider>
  )
}

/** The local database could not be brought up to date: nothing works. */
function DatabaseError() {
  const t = useTranslations("Mobile.database")
  return (
    <Screen title={t("errorTitle")}>
      <Body>{t("error")}</Body>
    </Screen>
  )
}

function Navigation() {
  const colorScheme = useColorScheme()
  const { onboarded } = usePreferences()
  return (
    <ThemeProvider
      value={navigationTheme(colorScheme === "dark" ? "dark" : "light")}
    >
      <StatusBar style="auto" />
      {/* Each tab has its own stack and header. */}
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        {/* Newcomers see the welcome screens and the onboarding first. */}
        <Stack.Protected guard={!onboarded}>
          <Stack.Screen name="welcome" />
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
        <Stack.Protected guard={onboarded}>
          <Stack.Screen name="(tabs)" />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  )
}
