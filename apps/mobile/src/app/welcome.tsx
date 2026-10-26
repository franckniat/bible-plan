import { router } from "expo-router"
import {
  CalendarCheck,
  HandHeart,
  Smartphone,
  type LucideIcon,
} from "lucide-react-native"
import { useRef, useState } from "react"
import {
  Image,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
  type ScrollViewInstance,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useTranslations } from "use-intl"

import { Button } from "@/components/ui/button"
import { radius, spacing, typography } from "@/theme/metrics"
import { createThemedStyles, useThemedStyles } from "@/theme/themed-styles"
import { useColors } from "@/theme/use-colors"

type SlideKey = "welcome" | "plans" | "prayer" | "offline"

const slides: { key: SlideKey; icon?: LucideIcon }[] = [
  { key: "welcome" },
  { key: "plans", icon: CalendarCheck },
  { key: "prayer", icon: HandHeart },
  { key: "offline", icon: Smartphone },
]

/** A few screens presenting the app to newcomers, before the onboarding. */
export default function WelcomeScreen() {
  const t = useTranslations("Mobile.welcome")
  const styles = useThemedStyles(themedStyles)
  const colors = useColors()
  const { width } = useWindowDimensions()
  const pager = useRef<ScrollViewInstance>(null)
  const [page, setPage] = useState(0)
  const last = page === slides.length - 1

  const start = () => router.replace("/onboarding")
  const next = () => {
    if (last) return start()
    pager.current?.scrollTo({ x: (page + 1) * width, animated: true })
    setPage(page + 1)
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.top}>
        {last ? null : (
          <Button title={t("skip")} variant="ghost" size="sm" onPress={start} />
        )}
      </View>

      <ScrollView
        ref={pager}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) =>
          setPage(Math.round(event.nativeEvent.contentOffset.x / width))
        }
        scrollEventThrottle={16}
      >
        {slides.map(({ key, icon: Icon }) => (
          <View key={key} style={[styles.slide, { width }]}>
            {Icon ? (
              <View style={styles.icon}>
                <Icon size={56} color={colors.foreground} strokeWidth={1.5} />
              </View>
            ) : (
              <Image
                source={require("@/assets/images/splash-icon.png")}
                style={styles.logo}
                accessible={false}
              />
            )}
            <Text accessibilityRole="header" style={styles.title}>
              {t(`slides.${key}.title`)}
            </Text>
            <Text style={styles.body}>{t(`slides.${key}.body`)}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.bottom}>
        <View
          style={styles.dots}
          accessibilityLabel={t("progress", {
            current: page + 1,
            total: slides.length,
          })}
        >
          {slides.map(({ key }, index) => (
            <View
              key={key}
              style={[styles.dot, index === page && styles.dotOn]}
            />
          ))}
        </View>
        <Button title={last ? t("start") : t("next")} onPress={next} />
      </View>
    </SafeAreaView>
  )
}

const themedStyles = createThemedStyles((colors) => ({
  screen: { flex: 1, backgroundColor: colors.background },
  top: {
    minHeight: 44,
    alignItems: "flex-end",
    paddingHorizontal: spacing.md,
  },
  slide: {
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  logo: { width: 140, height: 140, marginBottom: spacing.md },
  icon: {
    width: 128,
    height: 128,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  title: {
    ...typography.title,
    color: colors.foreground,
    textAlign: "center",
  },
  body: {
    ...typography.body,
    fontSize: 17,
    lineHeight: 26,
    color: colors.mutedForeground,
    textAlign: "center",
    maxWidth: 340,
  },
  bottom: {
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  dots: { flexDirection: "row", justifyContent: "center", gap: spacing.sm },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
  },
  dotOn: { width: 24, backgroundColor: colors.accent },
}))
