/** A moment of the day, for the illustration of the verse of the day. */
export type Period = "morning" | "day" | "night"

export const periods: readonly Period[] = ["morning", "day", "night"]

/** Morning from 5 am, day from 11 am, night from 6 pm. */
export function periodOfHour(hour: number): Period {
  if (hour >= 5 && hour < 11) return "morning"
  if (hour >= 11 && hour < 18) return "day"
  return "night"
}

/** The moment of the day in a time zone (the device's when none is given). */
export function currentPeriod(
  timeZone?: string | null,
  now = new Date()
): Period {
  const hour = (zone?: string) =>
    Number(
      new Intl.DateTimeFormat("en-GB", {
        hour: "numeric",
        hourCycle: "h23",
        timeZone: zone,
      }).format(now)
    )
  try {
    return periodOfHour(hour(timeZone ?? undefined))
  } catch {
    // Unknown time zone name.
    return periodOfHour(hour())
  }
}
