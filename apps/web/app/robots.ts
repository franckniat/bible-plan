import type { MetadataRoute } from "next"

import { getSiteUrl } from "@/lib/site"

// The personal pages ask for a session and say nothing to a search engine;
// everything else (landing, legal pages, the Bible to read) is open.
const privatePages = [
  "today",
  "plans",
  "prayer",
  "meditate",
  "notes",
  "stats",
  "settings",
  "notifications",
  "sign-in",
  "sign-up",
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", ...privatePages.map((page) => `/*/${page}`)],
    },
    sitemap: new URL("/sitemap.xml", getSiteUrl()).toString(),
  }
}
