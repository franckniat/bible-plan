/**
 * Reading speeds offered in the profile, in words per minute. They turn a
 * passage length into a reading time when a plan is built from the time
 * available each day.
 */
export const readingSpeeds = {
  slow: 130,
  normal: 180,
  fast: 240,
} as const

export type ReadingSpeed = keyof typeof readingSpeeds

export const defaultReadingWpm = readingSpeeds.normal

/** Bounds accepted for a reading speed. */
export const minReadingWpm = 60
export const maxReadingWpm = 400
