import { useColorScheme } from "react-native"

import { usePreferences } from "@/lib/preferences"

import { brand } from "./colors"

/** The page behind the text in the reader, by day (light theme). */
export const dayBackgrounds = {
  cream: brand.cream,
  white: "#ffffff",
  green: "#eef6ea",
  rose: "#fbeeee",
} as const

/** By night (dark theme). */
export const nightBackgrounds = {
  neutral: "#0a0a0a",
  black: "#000000",
  night: "#0f1b2d",
  plum: "#1f1426",
} as const

/** The color of the page behind the text, in the current theme. */
export function useReaderBackground(): string {
  const dark = useColorScheme() === "dark"
  const { reader } = usePreferences()
  return dark
    ? nightBackgrounds[reader.nightBackground]
    : dayBackgrounds[reader.dayBackground]
}
