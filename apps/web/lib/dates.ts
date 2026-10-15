import type { IsoDate } from "@workspace/core"

/**
 * Formats a calendar date (YYYY-MM-DD) in the user's language. Read at
 * midnight UTC, so the day never moves with the time zone of the device.
 */
export function formatIsoDate(
  date: IsoDate,
  locale: string,
  options: Intl.DateTimeFormatOptions = { dateStyle: "long" }
): string {
  return new Intl.DateTimeFormat(locale, {
    ...options,
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`))
}
