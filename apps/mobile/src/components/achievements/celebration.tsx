import { trophyKeys } from "@workspace/core"
import { Award, Trophy } from "lucide-react-native"
import { useEffect, useState } from "react"
import { AccessibilityInfo, Animated, Modal, Text, View } from "react-native"
import { useTranslations } from "use-intl"

import { Button } from "@/components/ui/button"
import { haptics } from "@/lib/haptics"
import { celebrated, useUnseenAchievements } from "@/repositories/achievements"
import { radius, spacing, typography } from "@/theme/metrics"
import { useColors } from "@/theme/use-colors"

/** Whether the person asked the phone to reduce motion. */
function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(true)
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduce)
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduce
    )
    return () => subscription.remove()
  }, [])
  return reduce
}

/**
 * Celebrates an achievement just earned, once, as on the web: its name and
 * level in a card that grows in, or simply appears when the phone asks to
 * reduce motion. Several at once are shown one after the other.
 */
export function Celebration() {
  const t = useTranslations("Achievements")
  const colors = useColors()
  const reduceMotion = useReduceMotion()
  const unseen = useUnseenAchievements()
  const current = unseen[0]
  // An animated value made once, kept as state (not read from a ref).
  const [scale] = useState(() => new Animated.Value(1))

  useEffect(() => {
    if (!current) return
    haptics.success()
    if (reduceMotion) {
      scale.setValue(1)
      return
    }
    scale.setValue(0.6)
    Animated.spring(scale, {
      toValue: 1,
      friction: 5,
      useNativeDriver: true,
    }).start()
  }, [current, reduceMotion, scale])

  if (!current) return null
  const trophy = (trophyKeys as readonly string[]).includes(current.key)
  const Icon = trophy ? Trophy : Award
  const name = t(`items.${current.key as "fidelity"}.name`)
  const level = trophy
    ? t("levels.trophy")
    : t(`levels.${current.level as 1 | 2 | 3}`)

  return (
    <Modal
      transparent
      visible
      animationType={reduceMotion ? "none" : "fade"}
      onRequestClose={() => celebrated([current.id])}
    >
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: spacing.lg,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
        }}
      >
        <Animated.View
          accessibilityViewIsModal
          style={{
            transform: [{ scale }],
            width: "100%",
            maxWidth: 360,
            alignItems: "center",
            gap: spacing.md,
            padding: spacing.lg,
            borderRadius: radius.lg,
            backgroundColor: colors.card,
          }}
        >
          <Icon size={56} color={colors.accent} />
          <Text
            accessibilityRole="header"
            style={[typography.h2, { color: colors.foreground }]}
          >
            {t("celebrate.title")}
          </Text>
          <Text
            style={[
              typography.body,
              { color: colors.mutedForeground, textAlign: "center" },
            ]}
          >
            {t(trophy ? "celebrate.trophy" : "celebrate.badge")}
          </Text>
          <Text
            style={[
              typography.h3,
              { color: colors.foreground, textAlign: "center" },
            ]}
          >
            {t("levelAria", { name, level })}
          </Text>
          <Button
            title={t("celebrate.close")}
            onPress={() => celebrated([current.id])}
            style={{ alignSelf: "stretch" }}
          />
        </Animated.View>
      </View>
    </Modal>
  )
}
