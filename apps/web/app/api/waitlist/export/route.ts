import { prisma } from "@workspace/db"

import { toCsv } from "@/lib/csv"
import { hasBearerToken } from "@/server/bearer-token"
import { listWaitlistEntries } from "@/server/services/waitlist"

/**
 * CSV export of the waitlist, protected by WAITLIST_EXPORT_TOKEN:
 *   curl -H "Authorization: Bearer $WAITLIST_EXPORT_TOKEN" \
 *     https://<site>/api/waitlist/export -o waitlist.csv
 */
export async function GET(request: Request) {
  const token = process.env.WAITLIST_EXPORT_TOKEN
  // Without a configured token, the export does not exist.
  if (!token) return new Response("Not found", { status: 404 })

  if (!hasBearerToken(request.headers.get("authorization"), token)) {
    return new Response("Unauthorized", {
      status: 401,
      headers: { "WWW-Authenticate": 'Bearer realm="waitlist-export"' },
    })
  }

  const entries = await listWaitlistEntries(prisma)
  const csv = toCsv(
    [
      "email",
      "first_name",
      "country",
      "interests",
      "locale",
      "consented_at",
      "created_at",
    ],
    entries.map((entry) => [
      entry.email,
      entry.firstName,
      entry.countryCode,
      entry.interests.map((interest) => interest.toLowerCase()).join(" "),
      entry.locale,
      entry.consentedAt,
      entry.createdAt,
    ])
  )

  const date = new Date().toISOString().slice(0, 10)
  return new Response(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="waitlist-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  })
}
