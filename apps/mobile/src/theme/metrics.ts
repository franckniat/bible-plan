import type { TextStyle } from "react-native"

import { fontFamily } from "./fonts"

export const spacing = { xs: 4, sm: 8, md: 16, lg: 20, xl: 32 } as const

/** Rounded like the web cards (rounded-3xl) and pill buttons. */
export const radius = { sm: 10, md: 16, lg: 24, pill: 999 } as const

export const typography = {
  title: { fontFamily: fontFamily.heading, fontSize: 32, lineHeight: 40 },
  h2: { fontFamily: fontFamily.heading, fontSize: 22, lineHeight: 30 },
  h3: { fontFamily: fontFamily.semibold, fontSize: 17, lineHeight: 24 },
  body: { fontFamily: fontFamily.regular, fontSize: 16, lineHeight: 24 },
  small: { fontFamily: fontFamily.regular, fontSize: 14, lineHeight: 20 },
  label: { fontFamily: fontFamily.medium, fontSize: 12, lineHeight: 16 },
} as const satisfies Record<string, TextStyle>
