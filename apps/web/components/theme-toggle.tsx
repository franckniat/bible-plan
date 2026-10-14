"use client"

import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react"
import { useTranslations } from "next-intl"
import { useTheme } from "next-themes"
import { useSyncExternalStore } from "react"

import { cn } from "@workspace/ui/lib/utils"

const themes: { value: "light" | "dark" | "system"; icon: LucideIcon }[] = [
  { value: "light", icon: Sun },
  { value: "dark", icon: Moon },
  { value: "system", icon: Monitor },
]

const subscribe = () => () => {}

/** Light, dark or system theme, as a group of toggle buttons. */
export function ThemeToggle({
  showLabels = false,
  className,
}: {
  showLabels?: boolean
  className?: string
}) {
  const t = useTranslations("Theme")
  const { theme, setTheme } = useTheme()
  // The chosen theme is only known in the browser (local storage).
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  )

  return (
    <div
      role="group"
      aria-label={t("label")}
      className={cn(
        "inline-flex gap-1 rounded-2xl bg-brand-night/[0.06] p-1 dark:bg-white/10",
        className
      )}
    >
      {themes.map(({ value, icon: Icon }) => {
        const active = mounted && theme === value
        return (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value)}
            aria-pressed={active}
            aria-label={showLabels ? undefined : t(value)}
            title={showLabels ? undefined : t(value)}
            className={cn(
              "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
              showLabels ? "h-9 flex-1 px-3" : "size-7",
              active
                ? "bg-white text-brand-night shadow-sm dark:bg-neutral-700 dark:text-neutral-100"
                : "text-brand-night/60 hover:text-brand-night dark:text-neutral-100/60 dark:hover:text-neutral-100"
            )}
          >
            <Icon aria-hidden className="size-4" />
            {showLabels && t(value)}
          </button>
        )
      })}
    </div>
  )
}
