import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { nextCookies } from "better-auth/next-js"
import { magicLink } from "better-auth/plugins/magic-link"

import { defaultLocale, defaultReadingWpm } from "@workspace/core"
import { prisma } from "@workspace/db"
import {
  renderMagicLinkEmail,
  renderResetPasswordEmail,
  renderVerifyEmail,
  type EmailSender,
  type RenderedEmail,
} from "@workspace/notifications"

import { nameOrFromEmail } from "./display-name"
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
    user: {
      // Profile settings, changed from the settings page (not on sign-up).
      additionalFields: {
        locale: {
          type: "string",
          required: true,
          defaultValue: defaultLocale,
          input: false,
        },
        // IANA time zone, detected by the browser on the first sign-in.
        timezone: { type: "string", required: false, input: false },
        readingWpm: {
          type: "number",
          required: true,
          defaultValue: defaultReadingWpm,
          input: false,
        },
        // Preferred Bible version, chosen once the reader exists.
        bibleVersion: { type: "string", required: false, input: false },
        // Consent to the privacy policy and terms (see the consent page).
        termsAcceptedAt: { type: "date", required: false, input: false },
        termsVersion: { type: "string", required: false, input: false },
      },
    },
    databaseHooks: {
      user: {
        create: {
          // New accounts speak the language they signed up in, and always
          // have a name: an e-mail link only gives the address.
          before: async (user, ctx) => {
            const locale = getRequestLocale(ctx?.request)
            return {
              data: {
                ...user,
                name: nameOrFromEmail(user.name, user.email, locale),
                locale,
              },
            }
          },
        },
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      sendVerificationEmail: ({ user, url }, request) =>
        deliver(
          user.email,
          renderVerifyEmail(getRequestLocale(request), { name: user.name, url })
        ),
    },
    plugins: [
      // Passwordless sign-in by email (link valid 5 minutes, single use).
      magicLink({
        sendMagicLink: ({ email, url }, ctx) =>
          deliver(
            email,
            renderMagicLinkEmail(getRequestLocale(ctx?.request), { url })
          ),
      }),
      // Lets Server Actions set auth cookies; must stay the last plugin.
      nextCookies(),
    ],
  })
}

export type Auth = ReturnType<typeof createAuth>
