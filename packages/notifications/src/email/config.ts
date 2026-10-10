/** Environment variables read by the email layer (all optional). */
export type EmailEnv = {
  NODE_ENV?: string
  /** Resend API key: authentication emails are sent as soon as it is set. */
  RESEND_API_KEY?: string
  /** Sender, e.g. "Bible Plan <hello@example.com>" (a Resend verified domain). */
  EMAIL_FROM?: string
  /** Force a driver: "resend", "console" (print to the terminal) or "noop". */
  EMAIL_DRIVER?: string
  /** "true" to also send reminders by email (disabled by default). */
  EMAIL_REMINDERS_ENABLED?: string
  /** Emails allowed per day (Resend free plan: 100). */
  EMAIL_DAILY_LIMIT?: string
}

export type EmailDriver = "resend" | "console" | "noop"

/** Resend's test sender, which can only write to the account owner. */
export const DEFAULT_FROM = "Bible Plan <onboarding@resend.dev>"

export const DEFAULT_DAILY_LIMIT = 100

/**
 * Driver used to send emails: Resend when a key is set, the terminal in
 * development, nothing in production without a key.
 */
export function getEmailDriver(env: EmailEnv = process.env): EmailDriver {
  const forced = env.EMAIL_DRIVER
  if (forced === "resend" || forced === "console" || forced === "noop") {
    return forced
  }
  if (env.RESEND_API_KEY) return "resend"
  return env.NODE_ENV === "production" ? "noop" : "console"
}

/** Whether emails really reach people (Resend configured). */
export function isEmailEnabled(env: EmailEnv = process.env): boolean {
  return getEmailDriver(env) === "resend"
}

/**
 * Whether reminders may also be sent by email. Off by default: reminders go
 * through in-app notifications and push, and the email quota is kept for
 * authentication emails.
 */
export function areEmailRemindersEnabled(env: EmailEnv = process.env): boolean {
  return env.EMAIL_REMINDERS_ENABLED === "true" && isEmailEnabled(env)
}

export function getEmailFrom(env: EmailEnv = process.env): string {
  return env.EMAIL_FROM || DEFAULT_FROM
}

export function getEmailDailyLimit(env: EmailEnv = process.env): number {
  const limit = Number(env.EMAIL_DAILY_LIMIT)
  return Number.isInteger(limit) && limit > 0 ? limit : DEFAULT_DAILY_LIMIT
}
