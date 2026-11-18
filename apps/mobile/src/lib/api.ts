import { apiErrorSchema } from "@workspace/core"
import type { z } from "zod"

import { authClient } from "@/lib/auth-client"
import { siteUrl } from "@/lib/site"

/**
 * A refusal of the website's API: `code` is what it said (a key of
 * Groups.errors or Comments.errors), "offline" when it could not be reached,
 * "unexpected" when its answer could not be read.
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string
  ) {
    super(`API ${status}: ${code}`)
    this.name = "ApiError"
  }
}

/**
 * Calls the website's API (/api/v1) as the person signed in on the phone
 * (the session of the keychain), and checks its answer with `schema`.
 */
export async function api<T>(
  path: string,
  schema: z.ZodType<T>,
  { method = "GET", body }: { method?: string; body?: unknown } = {}
): Promise<T> {
  const cookie = await authClient.getCookie()
  let response: Response
  try {
    response = await fetch(`${siteUrl}/api/v1${path}`, {
      method,
      credentials: "omit",
      headers: {
        accept: "application/json",
        ...(cookie ? { cookie } : {}),
        ...(body === undefined ? {} : { "content-type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, "offline")
  }
  const data: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    throw new ApiError(
      response.status,
      apiErrorSchema.safeParse(data).data?.error ?? "unexpected"
    )
  }
  const parsed = schema.safeParse(data)
  if (!parsed.success) throw new ApiError(response.status, "unexpected")
  return parsed.data
}
