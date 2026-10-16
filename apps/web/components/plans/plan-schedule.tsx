"use client"

import { CalendarDays, List } from "lucide-react"
import { useTranslations } from "next-intl"
import { useSyncExternalStore, type ReactNode } from "react"

import { cn } from "@workspace/ui/lib/utils"

type View = "list" | "calendar"

// The chosen view belongs to the device: it lives in localStorage.
const STORAGE_KEY = "bible-plan:plan-view"
const CHANGE_EVENT = "bible-plan:plan-view-change"

function read(): View {
  try {
    return localStorage.getItem(STORAGE_KEY) === "calendar"
      ? "calendar"
      : "list"
  } catch {
    return "list"
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange)
  window.addEventListener(CHANGE_EVENT, onChange)
  return () => {
    window.removeEventListener("storage", onChange)
    window.removeEventListener(CHANGE_EVENT, onChange)
  }
}

function save(view: View) {
  try {
    localStorage.setItem(STORAGE_KEY, view)
  } catch {
    // Private browsing: the choice lasts until the page is left.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

/**
 * The days of a plan, as a list by month or as a month calendar; the device
 * remembers the choice for every plan.
 */
export function PlanSchedule({
  list,
  calendar,
}: {
  list: ReactNode
  calendar: ReactNode
}) {
  const t = useTranslations("PlanDetail")
  const view = useSyncExternalStore(subscribe, read, () => "list" as const)

  return (
    <section aria-labelledby="schedule-title" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="schedule-title" className="font-heading text-xl font-semibold">
          {t("schedule")}
        </h2>
        <div
          role="group"
          aria-label={t("view.label")}
          className="flex rounded-2xl bg-brand-night/[0.06] p-1 dark:bg-white/10"
        >
          {(
            [
              ["list", List],
              ["calendar", CalendarDays],
            ] as const
          ).map(([value, Icon]) => (
            <button
              key={value}
              type="button"
              aria-pressed={view === value}
              onClick={() => save(value)}
              className={cn(
                "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
                view === value
                  ? "bg-white text-brand-night shadow-sm dark:bg-neutral-800 dark:text-neutral-100"
                  : "text-brand-night/65 hover:text-brand-night dark:text-neutral-100/65 dark:hover:text-neutral-100"
              )}
            >
              <Icon aria-hidden className="size-4" />
              {t(`view.${value}`)}
            </button>
          ))}
        </div>
      </div>
      {view === "list" ? list : calendar}
    </section>
  )
}
