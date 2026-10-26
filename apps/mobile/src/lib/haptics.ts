import * as Haptics from "expo-haptics"
import { Platform } from "react-native"

/** Fire-and-forget haptics, ignored where unsupported (web). */
export const haptics = {
  tap() {
    if (Platform.OS === "web") return
    void Haptics.selectionAsync().catch(() => undefined)
  },
  press() {
    if (Platform.OS === "web") return
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
      () => undefined
    )
  },
  success() {
    if (Platform.OS === "web") return
    void Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Success
    ).catch(() => undefined)
  },
}
