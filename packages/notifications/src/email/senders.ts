import { Resend } from "resend"

import { getEmailDriver, getEmailFrom, type EmailEnv } from "./config"
import type { EmailMessage, EmailSender, SentEmail } from "./sender"

export class EmailSendError extends Error {
  constructor(
    message: string,
    readonly statusCode: number | null = null
  ) {
    super(message)
    this.name = "EmailSendError"
  }
}

/** Sends emails through Resend (https://resend.com). */
export class ResendEmailSender implements EmailSender {
  private readonly resend: Resend

  constructor(
    apiKey: string,
    private readonly from: string
  ) {
    this.resend = new Resend(apiKey)
  }

  async send(message: EmailMessage): Promise<SentEmail> {
    const { data, error } = await this.resend.emails.send({
      from: this.from,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
      headers: message.headers,
      tags: [{ name: "category", value: message.category }],
    })
    if (error) throw new EmailSendError(error.message, error.statusCode)
    return { id: data?.id }
  }
}

/** Development sender: prints emails to the terminal instead of sending them. */
export class ConsoleEmailSender implements EmailSender {
  constructor(private readonly log: (text: string) => void = console.info) {}

  async send(message: EmailMessage): Promise<SentEmail> {
    this.log(
      [
        "",
        `── Email (${message.category}) ─────────────────────────────`,
        `To:      ${message.to}`,
        `Subject: ${message.subject}`,
        "",
        message.text,
        "──────────────────────────────────────────────────────",
      ].join("\n")
    )
    return {}
  }
}

/** Production without Resend: emails are dropped (a warning is logged). */
export class NoopEmailSender implements EmailSender {
  constructor(private readonly warn: (text: string) => void = console.warn) {}

  async send(message: EmailMessage): Promise<SentEmail> {
    this.warn(
      `Email "${message.subject}" to ${message.to} not sent: RESEND_API_KEY is not set.`
    )
    return {}
  }
}

/** The sender matching the environment (see getEmailDriver). */
export function createEmailSender(env: EmailEnv = process.env): EmailSender {
  switch (getEmailDriver(env)) {
    case "resend": {
      if (!env.RESEND_API_KEY) {
        throw new Error("EMAIL_DRIVER=resend requires RESEND_API_KEY.")
      }
      return new ResendEmailSender(env.RESEND_API_KEY, getEmailFrom(env))
    }
    case "console":
      return new ConsoleEmailSender()
    case "noop":
      return new NoopEmailSender()
  }
}
