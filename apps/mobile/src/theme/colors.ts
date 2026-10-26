import { DarkTheme, DefaultTheme, type Theme } from "expo-router"

/** Brand identity (logo: flame and cross), identical in light and dark mode. */
export const brand = {
  night: "#10284a",
  nightSoft: "#15335c",
  gold: "#f2b441",
  goldSoft: "#fbd78a",
  cream: "#fbf6ea",
} as const

/**
 * The web's design tokens (packages/ui/src/styles/globals.css), in sRGB:
 * cream and night blue in the light, a neutral dark with gold highlights.
 */
const light = {
  background: brand.cream,
  foreground: brand.night,
  card: "#ffffff",
  primary: brand.night,
  primaryForeground: brand.cream,
  muted: "#f5f0e5",
  mutedForeground: "#46576c",
  accent: brand.gold,
  destructive: "#e7000b",
  border: "rgba(16, 40, 74, 0.12)",
}

export type Colors = Record<keyof typeof light, string>

const dark: Colors = {
  background: "#0a0a0a",
  foreground: "#f5f5f5",
  card: "#171717",
  primary: brand.gold,
  primaryForeground: "#0a0a0a",
  muted: "#262626",
  mutedForeground: "#a1a1a1",
  accent: brand.gold,
  destructive: "#ff6467",
  border: "rgba(255, 255, 255, 0.1)",
}

export const colors = { light, dark } as const

/** React Navigation theme (headers, tabs) built from the tokens. */
export function navigationTheme(scheme: "light" | "dark"): Theme {
  const base = scheme === "dark" ? DarkTheme : DefaultTheme
  const c = colors[scheme]
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: c.primary,
      background: c.background,
      card: c.background,
      text: c.foreground,
      border: c.border,
      notification: c.accent,
    },
  }
}
