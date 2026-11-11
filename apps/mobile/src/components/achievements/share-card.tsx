import { trophyKeys } from "@workspace/core"
import * as Sharing from "expo-sharing"
import { Award, Trophy } from "lucide-react-native"
import { useRef, useState, type ComponentRef } from "react"
import { Text, View } from "react-native"
import { captureRef } from "react-native-view-shot"
import { useTranslations } from "use-intl"

import { Button } from "@/components/ui/button"
import { brand } from "@/theme/colors"
import { fontFamily } from "@/theme/fonts"

/** The card's side, square for every social app. */
const side = 320

/**
 * An earned achievement as an image to share, as on the web: its icon, its
 * name and level, on the night blue of the brand. The card is drawn off
 * screen, captured, then handed to the phone's share sheet.
 */
export function ShareAchievement({
  achievementKey,
  level,
}: {
  achievementKey: string
  level: number
}) {
  const t = useTranslations("Achievements")
  const card = useRef<ComponentRef<typeof View>>(null)
  const [failed, setFailed] = useState(false)
  const trophy = (trophyKeys as readonly string[]).includes(achievementKey)
  const Icon = trophy ? Trophy : Award
  const name = t(`items.${achievementKey as "fidelity"}.name`)
  const levelName = trophy
    ? t("levels.trophy")
    : t(`levels.${level as 1 | 2 | 3}`)

  const share = async () => {
    setFailed(false)
    try {
      const uri = await captureRef(card, { format: "png", quality: 1 })
      await Sharing.shareAsync(uri, {
        mimeType: "image/png",
        dialogTitle: t("celebrate.shareText", { name }),
      })
    } catch {
      setFailed(true)
    }
  }

  return (
    <>
      <Button title={t("celebrate.share")} variant="outline" onPress={share} />
      {failed ? (
        <Text style={{ color: brand.gold, textAlign: "center" }}>
          {t("celebrate.shareFailed")}
        </Text>
      ) : null}
      {/* Drawn off screen, at its own size, to be captured. */}
      <View
        pointerEvents="none"
        style={{ position: "absolute", left: -10000, top: 0 }}
      >
        <View
          ref={card}
          collapsable={false}
          style={{
            width: side,
            height: side,
            alignItems: "center",
            justifyContent: "center",
            gap: 14,
            padding: 28,
            backgroundColor: brand.night,
          }}
        >
          <Icon size={88} color={brand.gold} />
          <Text
            allowFontScaling={false}
            style={{
              fontFamily: fontFamily.heading,
              fontSize: 28,
              lineHeight: 34,
              color: brand.cream,
              textAlign: "center",
            }}
          >
            {name}
          </Text>
          <Text
            allowFontScaling={false}
            style={{
              fontFamily: fontFamily.semibold,
              fontSize: 16,
              color: brand.gold,
            }}
          >
            {levelName}
          </Text>
          <Text
            allowFontScaling={false}
            style={{
              position: "absolute",
              bottom: 20,
              fontFamily: fontFamily.heading,
              fontSize: 15,
              color: brand.goldSoft,
            }}
          >
            Bible Plan
          </Text>
        </View>
      </View>
    </>
  )
}
