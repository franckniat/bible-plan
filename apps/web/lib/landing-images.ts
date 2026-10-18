/**
 * Screenshots of the app shown on the landing page. The folder carries a
 * version: images are cached by their address (including by Next.js's image
 * optimizer), so new screenshots go in a new folder rather than over the old
 * files.
 */
const folder = "/landing/v2"

export type LandingScreen = "today" | "reader" | "compare" | "calendar"

export function landingImage(locale: string, screen: LandingScreen): string {
  return `${folder}/${locale}-${screen}.jpg`
}
