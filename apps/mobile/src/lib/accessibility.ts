import { useEffect, useState } from "react"
import { AccessibilityInfo } from "react-native"

/** Whether VoiceOver or TalkBack is on, kept up to date. */
export function useScreenReader(): boolean {
  const [on, setOn] = useState(false)
  useEffect(() => {
    void AccessibilityInfo.isScreenReaderEnabled().then(setOn)
    const subscription = AccessibilityInfo.addEventListener(
      "screenReaderChanged",
      setOn
    )
    return () => subscription.remove()
  }, [])
  return on
}
