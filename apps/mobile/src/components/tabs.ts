import type { AndroidSymbol, SFSymbol } from "expo-symbols"

/** The four tabs, shared by the native tab bar and its web version. */
export const tabs = [
  { name: "today", label: "App.nav.today", sf: "sun.max", md: "today" },
  { name: "bible", label: "App.nav.bible", sf: "book", md: "menu_book" },
  {
    name: "prayer",
    label: "App.nav.prayer",
    sf: "hands.and.sparkles",
    md: "volunteer_activism",
  },
  { name: "more", label: "Mobile.tabs.more", sf: "ellipsis", md: "more_horiz" },
] as const satisfies readonly {
  name: string
  label: string
  sf: SFSymbol
  md: AndroidSymbol
}[]
