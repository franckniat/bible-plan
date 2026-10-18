"use client"

import { Highlighter, X } from "lucide-react"
import { useTranslations } from "next-intl"

import { highlightColors, type HighlightColor } from "@workspace/core"
import { cn } from "@workspace/ui/lib/utils"

import { Link } from "@/i18n/navigation"

/** The look of each color: a solid background, with dark text on it. */
export const highlightStyles: Record<HighlightColor, string> = {
  YELLOW: "bg-yellow-300 text-neutral-950",
  ORANGE: "bg-orange-300 text-neutral-950",
  GREEN: "bg-green-300 text-neutral-950",
  BLUE: "bg-sky-300 text-neutral-950",
  PURPLE: "bg-violet-300 text-neutral-950",
  PINK: "bg-pink-300 text-neutral-950",
}

/** The same colors as the dots of the picker. */
const dotStyles: Record<HighlightColor, string> = {
  YELLOW: "bg-yellow-300",
  ORANGE: "bg-orange-300",
  GREEN: "bg-green-300",
  BLUE: "bg-sky-300",
  PURPLE: "bg-violet-300",
  PINK: "bg-pink-300",
}

/**
 * The "Highlight" action of the selection panel: a dot per color, and a way
 * to remove the color of verses that have one.
 */
export function HighlightRow({
  current,
  removable,
  signedIn,
  onPick,
  onRemove,
}: {
  /** The color all the selected verses have, if they share one. */
  current: HighlightColor | null
  /** Whether some selected verse has a color to remove. */
  removable: boolean
  signedIn: boolean
  onPick: (color: HighlightColor) => void
  onRemove: () => void
}) {
  const t = useTranslations("Reader.highlight")

  return (
    <div className="flex flex-col gap-2 py-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-2">
        <p className="flex items-center gap-3 font-medium">
          <Highlighter aria-hidden className="size-5 shrink-0" />
          {t("label")}
        </p>
        <div className="flex flex-wrap items-center gap-2.5">
          {highlightColors.map((color) => (
            <button
              key={color}
              type="button"
              aria-label={t(`colors.${color}`)}
              aria-pressed={current === color}
              onClick={() => onPick(color)}
              className={cn(
                "size-8 rounded-full ring-offset-2 ring-offset-white outline-none focus-visible:ring-3 focus-visible:ring-ring/60 dark:ring-offset-neutral-800",
                dotStyles[color],
                current === color && "ring-2 ring-brand-night dark:ring-white"
              )}
            />
          ))}
          {removable && (
            <button
              type="button"
              aria-label={t("remove")}
              title={t("remove")}
              onClick={onRemove}
              className="flex size-8 items-center justify-center rounded-full border border-brand-night/30 outline-none focus-visible:ring-3 focus-visible:ring-ring/60 dark:border-white/40"
            >
              <X aria-hidden className="size-4" />
            </button>
          )}
        </div>
      </div>
      {!signedIn && (
        <p className="px-2 text-xs text-brand-night/70 dark:text-neutral-100/70">
          {t.rich("device", {
            link: (chunks) => (
              <Link href="/sign-in" className="font-medium underline">
                {chunks}
              </Link>
            ),
          })}
        </p>
      )}
    </div>
  )
}
