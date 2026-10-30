import type { Weekday } from "@workspace/core"
import { useFormatter } from "use-intl"

/** Weekdays Monday first, as the calendars of the app show them. */
export const weekdaysFromMonday: Weekday[] = [1, 2, 3, 4, 5, 6, 0]

/** Short weekday names, Monday first; 2023-01-01 is a Sunday. */
export function useWeekdayNames() {
  const format = useFormatter()
  return (weekday: Weekday) =>
    format.dateTime(new Date(Date.UTC(2023, 0, 1 + weekday)), {
      weekday: "short",
      timeZone: "UTC",
    })
}
