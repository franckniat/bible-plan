import {
  BookOpen,
  CalendarCheck,
  HandHeart,
  Settings,
  Sun,
  type LucideIcon,
} from "lucide-react-native"

/** The bottom bar, same order and icons as the web's (app-nav.tsx). */
export const tabs = [
  { name: "today", label: "today", icon: Sun },
  { name: "bible", label: "bible", icon: BookOpen },
  { name: "plans", label: "plans", icon: CalendarCheck },
  { name: "prayer", label: "prayer", icon: HandHeart },
  { name: "settings", label: "settings", icon: Settings },
] as const satisfies readonly {
  name: string
  label: string
  icon: LucideIcon
}[]
