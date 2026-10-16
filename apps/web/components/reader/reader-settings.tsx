"use client"

import { AlignJustify, List, Settings2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { useId, useSyncExternalStore, type ReactNode } from "react"

import { buttonVariants } from "@workspace/ui/components/button"
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@workspace/ui/components/popover"
import { Switch } from "@workspace/ui/components/switch"
import { cn } from "@workspace/ui/lib/utils"

/** Text sizes, smallest first. */
export const textSizes = [
  "text-base",
  "text-lg",
  "text-xl",
  "text-2xl",
] as const

export type ReaderSettings = {
  size: number
  verseNumbers: boolean
  /** Verses one after the other, or each on its own line. */
  layout: "flow" | "lines"
}

const defaults: ReaderSettings = { size: 1, verseNumbers: true, layout: "flow" }
const STORAGE_KEY = "bible-plan:reader"
const CHANGE_EVENT = "bible-plan:reader-change"

// Reading settings belong to the device: they live in localStorage.
function read(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? ""
  } catch {
    return ""
  }
}

function parse(stored: string): ReaderSettings {
  try {
    const value = JSON.parse(stored) as Partial<ReaderSettings>
    return {
      size:
        typeof value.size === "number"
          ? Math.min(textSizes.length - 1, Math.max(0, value.size))
          : defaults.size,
      verseNumbers:
        typeof value.verseNumbers === "boolean"
          ? value.verseNumbers
          : defaults.verseNumbers,
      layout: value.layout === "lines" ? "lines" : defaults.layout,
    }
  } catch {
    return defaults
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

function save(settings: ReaderSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // Private browsing: the choice lasts until the page is left.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

/** The reading settings of this device; the defaults on the server. */
export function useReaderSettings(): ReaderSettings {
  return parse(useSyncExternalStore(subscribe, read, () => ""))
}

/** A row of choices, one of which is picked (radio buttons). */
function Choices<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { value: T; label: string; content: ReactNode }[]
  onChange: (value: T) => void
}) {
  const name = useId()
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 font-medium">{label}</legend>
      <div className="flex rounded-2xl bg-brand-night/[0.06] p-1 dark:bg-white/10">
        {options.map((option) => (
          <label
            key={option.value}
            title={option.label}
            className={cn(
              "flex min-h-9 flex-1 cursor-pointer items-center justify-center rounded-xl px-2 has-focus-visible:ring-3 has-focus-visible:ring-ring/40",
              option.value === value
                ? "bg-white text-brand-night shadow-sm dark:bg-neutral-800 dark:text-neutral-100"
                : "text-brand-night/65 hover:text-brand-night dark:text-neutral-100/65 dark:hover:text-neutral-100"
            )}
          >
            <input
              type="radio"
              name={name}
              checked={option.value === value}
              onChange={() => onChange(option.value)}
              aria-label={option.label}
              className="sr-only"
            />
            {option.content}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

/**
 * The reading settings, behind one button: text size, verse numbers and
 * verse layout.
 */
export function ReaderSettingsPopover() {
  const t = useTranslations("Reader.settings")
  const settings = useReaderSettings()
  const verseNumbersId = useId()

  return (
    <Popover>
      <PopoverTrigger
        className={cn(buttonVariants({ variant: "ghost" }), "gap-2")}
      >
        <Settings2 />
        {t("open")}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 gap-5">
        <PopoverTitle className="font-heading text-lg font-semibold">
          {t("title")}
        </PopoverTitle>

        <Choices
          label={t("size")}
          value={settings.size}
          onChange={(size) => save({ ...settings, size })}
          options={textSizes.map((_, index) => ({
            value: index,
            label: t(`sizes.${index}` as "sizes.0"),
            content: (
              <span
                aria-hidden
                className="font-heading leading-none"
                style={{ fontSize: `${0.8 + index * 0.2}rem` }}
              >
                A
              </span>
            ),
          }))}
        />

        <label className="flex cursor-pointer items-center justify-between gap-4">
          <span id={verseNumbersId} className="font-medium">
            {t("verseNumbers")}
          </span>
          <Switch
            aria-labelledby={verseNumbersId}
            checked={settings.verseNumbers}
            onCheckedChange={(verseNumbers) =>
              save({ ...settings, verseNumbers })
            }
          />
        </label>

        <Choices
          label={t("layout")}
          value={settings.layout}
          onChange={(layout) => save({ ...settings, layout })}
          options={(
            [
              ["flow", AlignJustify],
              ["lines", List],
            ] as const
          ).map(([value, Icon]) => ({
            value,
            label: t(`layouts.${value}`),
            content: (
              <span className="flex items-center gap-1.5 text-sm font-medium">
                <Icon aria-hidden className="size-4" />
                {t(`layouts.${value}`)}
              </span>
            ),
          }))}
        />
      </PopoverContent>
    </Popover>
  )
}
