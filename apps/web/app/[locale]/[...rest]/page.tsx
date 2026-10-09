import { notFound } from "next/navigation"

// Renders the localized not-found page for unknown paths under a locale.
export default function CatchAllPage() {
  notFound()
}
