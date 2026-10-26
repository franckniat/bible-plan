import type { AndroidSymbol, SFSymbol } from "expo-symbols"

/** The four tabs, shared by the native tab bar and its web version. */
export const tabs: readonly {
  name: string
  label: string
  sf: SFSymbol
  md: AndroidSymbol
}[] = [
  { name: "today", label: "Aujourd'hui", sf: "sun.max", md: "today" },
  { name: "bible", label: "Bible", sf: "book", md: "menu_book" },
  {
    name: "prayer",
    label: "Prière",
    sf: "hands.and.sparkles",
    md: "volunteer_activism",
  },
  { name: "more", label: "Plus", sf: "ellipsis", md: "more_horiz" },
]
