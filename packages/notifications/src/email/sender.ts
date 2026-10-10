/** Why an email is sent: authentication emails always take priority. */
export type EmailCategory = "auth" | "reminder"

export type EmailMessage = {
  to: string
  subject: string
  html: string
  text: string
  category: EmailCategory
  /** Extra headers, e.g. List-Unsubscribe for reminders. */
  headers?: Record<string, string>
}

export type SentEmail = { id?: string }

/** Sends emails; implementations: Resend, terminal (dev), no-op. */
export interface EmailSender {
  send(message: EmailMessage): Promise<SentEmail>
}
