import {
  BookOpen,
  CalendarCheck,
  Crown,
  Flame,
  Flag,
  Flower2,
  HandHeart,
  Hourglass,
  Library,
  Music,
  NotebookPen,
  ScrollText,
  Sprout,
  Sunrise,
  type LucideIcon,
} from "lucide-react"

import type { AchievementKey, AchievementLevel } from "@workspace/core"
import { cn } from "@workspace/ui/lib/utils"

const glyphs: Record<AchievementKey, LucideIcon> = {
  "first-reading": BookOpen,
  "first-prayer": HandHeart,
  "first-meditation": Sprout,
  fidelity: Flame,
  prayer: HandHeart,
  meditation: Flower2,
  "prayer-time": Hourglass,
  books: Library,
  notes: NotebookPen,
  "plan-completed": Flag,
  psalms: Music,
  gospels: Sunrise,
  "new-testament": ScrollText,
  bible: Crown,
  "regularity-year": CalendarCheck,
}

/** Metal of each level: [ring light, ring dark, glyph]. */
const metals: Record<AchievementLevel, [string, string, string]> = {
  1: ["#d9a066", "#9c5f2b", "#7a4519"],
  2: ["#e5e7eb", "#8b95a5", "#4b5563"],
  3: ["#f7d774", "#c08a12", "#7c5400"],
}

const sizes = { sm: "size-12", md: "size-20", lg: "size-28" } as const

/**
 * Medal of a badge or trophy: a ring in the metal of the level around the
 * glyph of the achievement (a trophy is a gold medal with a crown edge).
 * Locked ones are grey. Decorative: the name is always written next to it.
 */
export function AchievementMedal({
  achievementKey,
  level,
  locked = false,
  trophy = false,
  size = "md",
  className,
}: {
  achievementKey: AchievementKey
  level: AchievementLevel
  locked?: boolean
  trophy?: boolean
  size?: keyof typeof sizes
  className?: string
}) {
  const Glyph = glyphs[achievementKey]
  const [light, dark, ink] = trophy ? metals[3] : metals[level]
  const id = `medal-${achievementKey}-${level}`

  return (
    <span
      aria-hidden="true"
      className={cn("relative inline-flex shrink-0", sizes[size], className)}
    >
      <svg viewBox="0 0 100 100" className="size-full">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={locked ? "#d4d4d8" : light} />
            <stop offset="1" stopColor={locked ? "#a1a1aa" : dark} />
          </linearGradient>
        </defs>
        {trophy ? (
          <path
            d="M50 4 L61 14 L76 12 L81 27 L95 34 L90 49 L95 64 L81 71 L76 86 L61 84 L50 94 L39 84 L24 86 L19 71 L5 64 L10 49 L5 34 L19 27 L24 12 L39 14 Z"
            fill={`url(#${id})`}
          />
        ) : (
          <circle cx="50" cy="50" r="46" fill={`url(#${id})`} />
        )}
        <circle
          cx="50"
          cy="50"
          r="34"
          fill={locked ? "#f4f4f5" : "#fffaf0"}
          opacity={locked ? 0.7 : 0.92}
        />
      </svg>
      <Glyph
        className="absolute inset-0 m-auto size-[42%]"
        style={{ color: locked ? "#a1a1aa" : ink }}
        strokeWidth={2}
      />
    </span>
  )
}
