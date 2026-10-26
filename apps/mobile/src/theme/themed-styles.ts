import {
  StyleSheet,
  type ImageStyle,
  type TextStyle,
  type ViewStyle,
} from "react-native"

import type { Colors } from "./colors"
import { useColors } from "./use-colors"

type NamedStyles<T> = { [P in keyof T]: ViewStyle | TextStyle | ImageStyle }

/**
 * Styles that depend on the theme's colors, created once per theme (as in
 * expense-tracker-237). Use with useThemedStyles inside the component.
 */
export function createThemedStyles<T extends NamedStyles<T>>(
  factory: (colors: Colors) => T & NamedStyles<T>
): (colors: Colors) => T {
  const cache = new Map<Colors, T>()
  return (colors) => {
    let styles = cache.get(colors)
    if (!styles) {
      styles = StyleSheet.create(factory(colors))
      cache.set(colors, styles)
    }
    return styles
  }
}

export function useThemedStyles<T>(themed: (colors: Colors) => T): T {
  return themed(useColors())
}
