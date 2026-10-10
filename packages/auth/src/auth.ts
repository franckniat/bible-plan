import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { nextCookies } from "better-auth/next-js"

import { prisma } from "@workspace/db"

/**
 * Authentication server (better-auth). Reads BETTER_AUTH_SECRET and
 * BETTER_AUTH_URL from the environment.
 */
export function createAuth() {
  return betterAuth({
    appName: "Bible Plan",
    database: prismaAdapter(prisma, { provider: "postgresql" }),
    emailAndPassword: { enabled: true },
    // Lets Server Actions set auth cookies; must stay the last plugin.
    plugins: [nextCookies()],
  })
}

export type Auth = ReturnType<typeof createAuth>
