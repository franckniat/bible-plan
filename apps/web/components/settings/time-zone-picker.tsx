"use client"

import { useTranslations } from "next-intl"
import { useMemo } from "react"

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@workspace/ui/components/combobox"

type TimeZone = {
  /** IANA name, the submitted value (e.g. "America/New_York"). */
  id: string
  /** Readable name (e.g. "America / New York"). */
  name: string
  /** Current offset from UTC (e.g. "GMT-04:00"). */
  offset: string
}

function getOffset(timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "longOffset",
  }).formatToParts(new Date())
  return parts.find((part) => part.type === "timeZoneName")?.value ?? ""
}

/** Every time zone known to the browser, plus `current` if it is missing. */
function getTimeZones(current: string | null): TimeZone[] {
  const ids = new Set(Intl.supportedValuesOf("timeZone"))
  if (current) ids.add(current)
  return [...ids].map((id) => ({
    id,
    name: id.replaceAll("_", " ").replaceAll("/", " / "),
    offset: getOffset(id),
  }))
}

function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
}

function matchesTimeZone(timeZone: TimeZone, query: string) {
  const search = normalize(query.trim())
  return (
    normalize(timeZone.name).includes(search) ||
    timeZone.id.toLowerCase().includes(search) ||
    timeZone.offset.toLowerCase().includes(search)
  )
}

/** Searchable list of IANA time zones with their current UTC offset. */
export function TimeZonePicker({
  name,
  id,
  value,
  onValueChange,
  invalid,
  describedBy,
}: {
  /** Form field name; the submitted value is the IANA name. */
  name: string
  id?: string
  value: string | null
  onValueChange: (value: string | null) => void
  invalid?: boolean
  describedBy?: string
}) {
  const t = useTranslations("Settings.timezonePicker")
  const timeZones = useMemo(() => getTimeZones(value), [value])
  const selected = timeZones.find((timeZone) => timeZone.id === value) ?? null

  return (
    <Combobox
      items={timeZones}
      value={selected}
      onValueChange={(timeZone: TimeZone | null) =>
        onValueChange(timeZone?.id ?? null)
      }
      name={name}
      itemToStringLabel={(timeZone: TimeZone) => timeZone.name}
      itemToStringValue={(timeZone: TimeZone) => timeZone.id}
      isItemEqualToValue={(item: TimeZone, other: TimeZone) =>
        item.id === other.id
      }
      filter={matchesTimeZone}
      autoHighlight
    >
      <ComboboxInput
        id={id}
        placeholder={t("placeholder")}
        showClear={selected !== null}
        triggerLabel={t("show")}
        clearLabel={t("clear")}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className="h-10"
      />
      <ComboboxContent>
        <ComboboxEmpty>{t("empty")}</ComboboxEmpty>
        <ComboboxList>
          {(timeZone: TimeZone) => (
            <ComboboxItem key={timeZone.id} value={timeZone}>
              <span className="flex-1">{timeZone.name}</span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {timeZone.offset}
              </span>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}
