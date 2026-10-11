import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { nextCookies } from "better-auth/next-js"

import { prisma } from "@workspace/db"
import {
  renderResetPasswordEmail,
  renderVerifyEmail,
  type EmailSender,
  type RenderedEmail,
} from "@workspace/notifications"

import { getRequestLocale } from "./locale"

/** Google OAuth credentials, when GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set. */
function getGoogleCredentials(env = process.env) {
  const clientId = env.GOOGLE_CLIENT_ID
  const clientSecret = env.GOOGLE_CLIENT_SECRET
  return clientId && clientSecret ? { clientId, clientSecret } : undefined
}

/** Whether "Continue with Google" can be offered. */
export function isGoogleAuthEnabled(env = process.env): boolean {
  return getGoogleCredentials(env) !== undefined
}

export type CreateAuthOptions = {
  /** Sends authentication emails (verification, password reset). */
  emailSender: EmailSender
  /**
   * Runs a task after the response is sent (Next.js `after`), so the response
   * time does not reveal whether an account exists. Awaited when omitted.
   */
  runAfterResponse?: (task: Promise<void>) => void
}

/**
 * Authentication server (better-auth). Reads BETTER_AUTH_SECRET and
 * BETTER_AUTH_URL from the environment.
 */
export function createAuth({
  emailSender,
  runAfterResponse,
}: CreateAuthOptions) {
  const google = getGoogleCredentials()

  async function deliver(to: string, email: Promise<RenderedEmail>) {
    const task = email
      .then((rendered) =>
        emailSender.send({ ...rendered, to, category: "auth" })
      )
      .then(() => undefined)
      .catch((error: unknown) => {
        console.error(`Authentication email to ${to} failed`, error)
      })
    if (runAfterResponse) runAfterResponse(task)
    else await task
  }

  return betterAuth({
    appName: "Bible Plan",
    database: prismaAdapter(prisma, { provider: "postgresql" }),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      minPasswordLength: 8,
      sendResetPassword: ({ user, url }, request) =>
        deliver(
          user.email,
          renderResetPasswordEmail(getRequestLocale(request), {
            name: user.name,
            url,
          })
        ),
    },
    socialProviders: google ? { google } : {},
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      sendVerificationEmail: ({ user, url }, request) =>
        deliver(
          user.email,
          renderVerifyEmail(getRequestLocale(request), { name: user.name, url })
        ),
    },
    // Lets Server Actions set auth cookies; must stay the last plugin.
    plugins: [nextCookies()],
  })
}

export type Auth = ReturnType<typeof createAuth>
