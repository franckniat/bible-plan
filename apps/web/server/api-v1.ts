import "server-only"

import { getSession, type SessionUser } from "@/server/session"

/**
 * Helpers of the API the mobile app reads (/api/v1): answers are never kept
 * by a cache, a refusal is `{ error }` with its HTTP status, and a write only
 * takes JSON (a form of another site cannot send it).
 */

const noStore = { "Cache-Control": "no-store" }

export function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: noStore })
}

/** Why something was refused, as the services say it, and its HTTP status. */
const statuses: Record<string, number> = {
  unauthorized: 401,
  forbidden: 403,
  notFound: 404,
  limit: 409,
  full: 409,
  ownerMustHandOver: 409,
  invalidCode: 400,
  invalid: 400,
  unsupported: 415,
}

export function refuse(error: string): Response {
  return json({ error }, statuses[error] ?? 400)
}

/** The signed-in person, or the answer to send when nobody is. */
export async function apiUser(): Promise<SessionUser | Response> {
  const session = await getSession()
  return session ? session.user : refuse("unauthorized")
}

/** The JSON body of a write, or the answer to send when there is none. */
export async function readJson(
  request: Request
): Promise<{ body: unknown } | Response> {
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return refuse("unsupported")
  }
  return { body: await request.json().catch(() => null) }
}
