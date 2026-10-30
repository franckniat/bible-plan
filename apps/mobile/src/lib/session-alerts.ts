import { createAudioPlayer, setAudioModeAsync } from "expo-audio"
import * as Notifications from "expo-notifications"
import { Platform } from "react-native"

/** The three soft tones of the web (scripts/end-sound.mjs). */
const endSound = require("@/assets/sounds/session-end.wav")

/** Marks the notification that ends a session, shown only in the background. */
const SESSION_END = "session-end"

const native = Platform.OS !== "web"

// In the app, the timer plays the sound itself: the end notification is for
// a locked phone or another app.
if (native) {
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const show = notification.request.content.data?.kind !== SESSION_END
      return {
        shouldShowBanner: show,
        shouldShowList: show,
        shouldPlaySound: show,
        shouldSetBadge: false,
      }
    },
  })
}

/** Plays the end sound, even with the phone on silent. */
export async function playEndSound() {
  try {
    await setAudioModeAsync({ playsInSilentMode: true })
    const player = createAudioPlayer(endSound)
    player.addListener("playbackStatusUpdate", (status) => {
      if (status.didJustFinish) player.remove()
    })
    player.play()
  } catch {
    // No sound is better than a broken timer.
  }
}

/**
 * Schedules the end of a running session as a local notification with the
 * end sound, so it is heard with the screen locked. Gives its id, or null
 * when notifications are not allowed (the timer still ends in the app).
 */
export async function scheduleSessionEnd(
  at: Date,
  content: { title: string; body: string }
): Promise<string | null> {
  if (!native) return null
  try {
    const { granted } = await Notifications.requestPermissionsAsync()
    if (!granted) return null
    return await Notifications.scheduleNotificationAsync({
      content: {
        ...content,
        sound: "session-end.wav",
        data: { kind: SESSION_END },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: at,
      },
    })
  } catch {
    return null
  }
}

/** Cancels the end of a session paused or stopped early. */
export async function cancelSessionEnd(id: string | null) {
  if (!native || !id) return
  await Notifications.cancelScheduledNotificationAsync(id).catch(
    () => undefined
  )
}
