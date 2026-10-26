import { useColorScheme } from "react-native"

import { colors, type Colors } from "./colors"

/** The design tokens of the current system theme. */
export function useColors(): Colors {
  return colors[useColorScheme() === "dark" ? "dark" : "light"]
}
