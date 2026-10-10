import type {
  EmailCategory,
  EmailMessage,
  EmailSender,
  SentEmail,
} from "./sender"

/** Where the number of emails sent per (UTC) day is kept. */
export interface EmailQuotaStore {
  /** Emails already sent on `day` (YYYY-MM-DD, UTC). */
  countSent(day: string): Promise<number>
  /** Records one more email sent on `day`. */
  recordSent(day: string): Promise<void>
}

export class EmailQuotaExceededError extends Error {
  constructor(
    readonly category: EmailCategory,
    readonly sent: number,
    readonly limit: number
  ) {
    super(
      `Daily email quota reached for ${category} emails (${sent}/${limit}).`
    )
    this.name = "EmailQuotaExceededError"
  }
}

export const utcDay = (date: Date) => date.toISOString().slice(0, 10)

/** Share of the daily limit only authentication emails may use. */
export const AUTH_RESERVE_RATIO = 0.2

/**
 * Limit for a category: reminders stop before the daily limit so that
 * authentication emails (sign-up, password reset) can always be sent.
 */
export function getCategoryLimit(category: EmailCategory, dailyLimit: number) {
  return category === "auth"
    ? dailyLimit
    : dailyLimit - Math.ceil(dailyLimit * AUTH_RESERVE_RATIO)
}

/** Wraps a sender so it never exceeds the provider's daily quota. */
export class QuotaGuardedEmailSender implements EmailSender {
  constructor(
    private readonly sender: EmailSender,
    private readonly store: EmailQuotaStore,
    private readonly dailyLimit: number,
    private readonly now: () => Date = () => new Date()
  ) {}

  async send(message: EmailMessage): Promise<SentEmail> {
    const day = utcDay(this.now())
    const sent = await this.store.countSent(day)
    const limit = getCategoryLimit(message.category, this.dailyLimit)
    if (sent >= limit) {
      throw new EmailQuotaExceededError(message.category, sent, limit)
    }

    const result = await this.sender.send(message)
    await this.store.recordSent(day)
    return result
  }
}
