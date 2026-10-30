import { useEffect } from "react"

import { onChange } from "@/db/changes"
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
        checkAchievements(currentProfile().timeZone)
      } catch {
        // Evaluated again at the next change.
      }
    }
    check()
    let timer: ReturnType<typeof setTimeout> | undefined
    const stop = onChange((tables) => {
      if (!achievementSources.some((table) => tables.has(table))) return
      clearTimeout(timer)
      timer = setTimeout(check, 300)
    })
    return () => {
      stop()
      clearTimeout(timer)
    }
  }, [])
}
