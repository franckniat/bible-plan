import { locales, readingSpeeds, type ReadingSpeed } from "@workspace/core"
import { router } from "expo-router"
import { Check } from "lucide-react-native"
import { useState } from "react"
import { ScrollView, Text, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useLocale, useTranslations } from "use-intl"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Chip } from "@/components/ui/chip"
import { ListRow } from "@/components/ui/list-row"
import { ProgressBar } from "@/components/ui/progress-bar"
import {
  reminderTimes,
  setPreferences,
  usePreferences,
  type Reminder,
} from "@/lib/preferences"
import {
  bibleVersionIds,
  bibleVersionNames,
  bibleVersionOf,
  setProfile,
  useProfile,
} from "@/repositories/profile"
import { spacing, typography } from "@/theme/metrics"
import { createThemedStyles, useThemedStyles } from "@/theme/themed-styles"
import { useColors } from "@/theme/use-colors"

const steps = ["language", "pace", "reminder"] as const

const reminders: Reminder[] = ["morning", "noon", "evening", "none"]

/** A short setup after the welcome screens; every choice is saved at once. */
export default function OnboardingScreen() {
  const t = useTranslations()
  const locale = useLocale()
  const styles = useThemedStyles(themedStyles)
  const colors = useColors()
  const preferences = usePreferences()
  const profile = useProfile()
  const [index, setIndex] = useState(0)
  const step = steps[index]!
  const last = index === steps.length - 1
  const bibleVersion = bibleVersionOf(profile.bibleVersion, locale)

  // A tick on the chosen option, an empty slot (not a chevron) on the others.
  const check = (selected: boolean) =>
    selected ? (
      <Check size={20} color={colors.foreground} />
    ) : (
      <View style={styles.unchecked} />
    )

  const finish = () => {
    setProfile({ bibleVersion })
    setPreferences({ onboarded: true })
    router.replace("/today")
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.progress}>
          <Text style={styles.progressLabel}>
            {t("Mobile.onboarding.progress", {
              current: index + 1,
              total: steps.length,
            })}
          </Text>
          <ProgressBar ratio={(index + 1) / steps.length} height={6} />
        </View>

        {step === "language" ? (
          <>
            <Text accessibilityRole="header" style={styles.title}>
              {t("Mobile.onboarding.language.title")}
            </Text>
            <Text style={styles.description}>
              {t("Mobile.onboarding.language.description")}
            </Text>
            <View style={styles.chips}>
              {locales.map((code) => (
                <Chip
                  key={code}
                  label={t("LanguageSwitcher.locale", { locale: code })}
                  selected={locale === code}
                  onPress={() => setProfile({ locale: code })}
                />
              ))}
            </View>
            <Text style={styles.label}>
              {t("Mobile.onboarding.language.bible")}
            </Text>
            <View style={styles.chips}>
              {bibleVersionIds.map((id) => (
                <Chip
                  key={id}
                  label={bibleVersionNames[id]}
                  selected={bibleVersion === id}
                  onPress={() => setProfile({ bibleVersion: id })}
                />
              ))}
            </View>
          </>
        ) : null}

        {step === "pace" ? (
          <>
            <Text accessibilityRole="header" style={styles.title}>
              {t("Mobile.onboarding.pace.title")}
            </Text>
            <Text style={styles.description}>
              {t("Settings.fields.readingSpeedHint")}
            </Text>
            <Card padded={false}>
              {(Object.keys(readingSpeeds) as ReadingSpeed[]).map(
                (speed, i, all) => (
                  <ListRow
                    key={speed}
                    label={t(`Settings.readingSpeeds.${speed}.label`)}
                    subtitle={t(`Settings.readingSpeeds.${speed}.description`, {
                      wpm: readingSpeeds[speed],
                    })}
                    trailing={check(profile.readingSpeed === speed)}
                    onPress={() => setProfile({ readingSpeed: speed })}
                    last={i === all.length - 1}
                  />
                )
              )}
            </Card>
          </>
        ) : null}

        {step === "reminder" ? (
          <>
            <Text accessibilityRole="header" style={styles.title}>
              {t("Mobile.onboarding.reminder.title")}
            </Text>
            <Text style={styles.description}>
              {t("Mobile.onboarding.reminder.description")}
            </Text>
            <Card padded={false}>
              {reminders.map((reminder, i) => (
                <ListRow
                  key={reminder}
                  label={t(`Mobile.onboarding.reminder.${reminder}`)}
                  subtitle={
                    reminder === "none"
                      ? undefined
                      : t("Mobile.onboarding.reminder.at", {
                          time: reminderTimes[reminder],
                        })
                  }
                  trailing={check(preferences.reminder === reminder)}
                  onPress={() => setPreferences({ reminder })}
                  last={i === reminders.length - 1}
                />
              ))}
            </Card>
          </>
        ) : null}
      </ScrollView>

      <View style={styles.actions}>
        {index > 0 ? (
          <Button
            title={t("Mobile.onboarding.back")}
            variant="outline"
            onPress={() => setIndex(index - 1)}
            style={styles.action}
          />
        ) : null}
        <Button
          title={
            last ? t("Mobile.onboarding.finish") : t("Mobile.onboarding.next")
          }
          onPress={last ? finish : () => setIndex(index + 1)}
          style={styles.action}
        />
      </View>
    </SafeAreaView>
  )
}

const themedStyles = createThemedStyles((colors) => ({
  screen: { flex: 1, backgroundColor: colors.background },
  content: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  progress: { gap: spacing.sm, marginBottom: spacing.md },
  progressLabel: { ...typography.label, color: colors.mutedForeground },
  title: { ...typography.title, color: colors.foreground },
  description: { ...typography.body, color: colors.mutedForeground },
  label: {
    ...typography.h3,
    color: colors.foreground,
    marginTop: spacing.md,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  action: { flex: 1 },
  unchecked: { width: 20 },
}))
