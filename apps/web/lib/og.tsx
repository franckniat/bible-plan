import { readFile } from "node:fs/promises"
import path from "node:path"

import type { ReactNode } from "react"

import { markPath } from "@/components/brand/brand-mark"

/** The size shared links are previewed at (WhatsApp, Facebook, X, Slack). */
export const ogSize = { width: 1200, height: 630 }
export const ogContentType = "image/png"

export const ogColors = {
  night: "#10284a",
  nightDeep: "#0a1b34",
  gold: "#f2b441",
  goldSoft: "#fbd78a",
  cream: "#fbf6ea",
}

/** Quotation marks of a language: « text » in French, “text” in English. */
export function quote(text: string, locale: string): string {
  return locale === "fr" ? `«\u00a0${text}\u00a0»` : `“${text}”`
}

/** A file of /public as a data address, for an <img> of an image response. */
export async function publicImageDataUri(file: string): Promise<string | null> {
  try {
    const bytes = await readFile(path.join(process.cwd(), "public", file))
    const type = file.endsWith(".png") ? "image/png" : "image/jpeg"
    return `data:${type};base64,${bytes.toString("base64")}`
  } catch {
    // The preview is still worth sending without its screenshot.
    return null
  }
}

/** The mark of Bible Plan with its name, in the colors of the brand. */
export function OgBrand({ size = 56 }: { size?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
      <svg
        width={size * 1.05}
        height={size}
        viewBox="40 50 432 410"
        style={{ display: "flex" }}
      >
        <path fill={ogColors.gold} fillRule="evenodd" d={markPath} />
      </svg>
      <div
        style={{
          display: "flex",
          fontSize: size * 0.72,
          fontWeight: 700,
          color: ogColors.cream,
          letterSpacing: -1,
        }}
      >
        Bible Plan
      </div>
    </div>
  )
}

/** The night-blue background with a warm glow, shared by the previews. */
export function OgFrame({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        padding: 64,
        color: ogColors.cream,
        backgroundColor: ogColors.night,
        backgroundImage: `radial-gradient(circle at 12% 8%, rgba(242,180,65,0.28), rgba(242,180,65,0) 45%), linear-gradient(135deg, ${ogColors.night}, ${ogColors.nightDeep})`,
      }}
    >
      {children}
    </div>
  )
}
