import * as Clipboard from "expo-clipboard"
import { router } from "expo-router"
import { Check, Columns2, Copy, Share2 } from "lucide-react-native"
import { useEffect, useState } from "react"
import { Text, View } from "react-native"
import { useTranslations } from "use-intl"

import { HighlightRow } from "@/components/bible/highlight-row"
import { PanelAction } from "@/components/bible/panel-action"
import { verseActions, useVerseActions } from "@/lib/verse-actions"
import { spacing, typography } from "@/theme/metrics"
import { useColors } from "@/theme/use-colors"

/**
 * The options of the verses selected in the reader, in a native sheet that
 * leaves the text behind it usable: more verses can be tapped while it is
 * open. Closed (pulled down), it unselects them; with no verse selected any
 * more, it closes.
 */
export default function VerseActionsScreen() {
  const t = useTranslations("Reader.selection")
  const colors = useColors()
  const { actions } = useVerseActions()
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    if (!actions && router.canGoBack()) router.back()
  }, [actions])
  // Pulled down: the verses are no longer selected.
  useEffect(
    () => () => {
      verseActions.setSheetHeight(null)
      verseActions.get().actions?.close()
    },
    []
  )
  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(null), 2500)
    return () => clearTimeout(timer)
  }, [copied])

  if (!actions) return null
  return (
    <View
      accessibilityLabel={t("label")}
      onLayout={(event) =>
        verseActions.setSheetHeight(event.nativeEvent.layout.height)
      }
      style={{
        gap: spacing.md,
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.xl,
        paddingBottom: spacing.lg,
        backgroundColor: colors.card,
      }}
    >
      <View style={{ gap: 2 }}>
        <Text style={[typography.small, { color: colors.mutedForeground }]}>
          {t("current")}
        </Text>
        <Text
          accessibilityRole="header"
          style={[typography.h3, { fontSize: 20, color: colors.foreground }]}
        >
          {actions.reference}{" "}
          <Text style={[typography.small, { color: colors.mutedForeground }]}>
            {actions.version}
          </Text>
        </Text>
      </View>
      <HighlightRow current={actions.color} onPick={actions.highlight} />
      <PanelAction
        icon={copied === actions.key ? Check : Copy}
        label={copied === actions.key ? t("copied") : t("copy")}
        onPress={async () => {
          await Clipboard.setStringAsync(actions.copyText)
          setCopied(actions.key)
        }}
      />
      <PanelAction
        icon={Columns2}
        label={t("compare")}
        onPress={actions.compare}
      />
      <PanelAction icon={Share2} label={t("share")} onPress={actions.share} />
    </View>
  )
}
