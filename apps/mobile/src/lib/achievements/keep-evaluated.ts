import { useEffect } from "react"

import { onChange } from "@/db/changes"
import { afterFirstScreen } from "@/lib/after-first-screen"
import { track } from "@/lib/analytics"
import {
  achievementSources,
  checkAchievements,
} from "@/repositories/achievements"
import { currentProfile } from "@/repositories/profile"

/**
 * Evaluates the achievements on the phone when the app opens and shortly
 * after what can earn one (a reading, a prayer, a session, a note).
 */
export function useAchievementEvaluation() {
  useEffect(() => {
    const check = () => {
      try {
        for (const { key, level } of checkAchievements(
          currentProfile().timeZone
        )) {
          track({ name: "achievement_earned", key, level })
        }
      } catch {
        // Evaluated again at the next change.
      }
    }
    // At opening, once the first screen is shown.
    const cancel = afterFirstScreen(check)
    let timer: ReturnType<typeof setTimeout> | undefined
    const stop = onChange((tables) => {
      if (!achievementSources.some((table) => tables.has(table))) return
      clearTimeout(timer)
      timer = setTimeout(check, 300)
    })
    return () => {
      cancel()
      stop()
      clearTimeout(timer)
    }
  }, [])
}
