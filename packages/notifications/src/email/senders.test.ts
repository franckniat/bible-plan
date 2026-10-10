import { describe, expect, it, vi } from "vitest"

import type { EmailMessage } from "./sender"
import {
  ConsoleEmailSender,
  createEmailSender,
  NoopEmailSender,
  ResendEmailSender,
} from "./senders"

const message: EmailMessage = {
  to: "marie@example.com",
  subject: "Bienvenue",
  html: "<p>Bonjour</p>",
  text: "Bonjour",
  category: "auth",
}

describe("createEmailSender", () => {
  it("returns the sender matching the environment", () => {
    expect(createEmailSender({ RESEND_API_KEY: "re_123" })).toBeInstanceOf(
      ResendEmailSender
    )
    expect(createEmailSender({ NODE_ENV: "development" })).toBeInstanceOf(
      ConsoleEmailSender
    )
    expect(createEmailSender({ NODE_ENV: "production" })).toBeInstanceOf(
      NoopEmailSender
    )
  })

  it("requires a key when Resend is forced", () => {
    expect(() => createEmailSender({ EMAIL_DRIVER: "resend" })).toThrow(
      /RESEND_API_KEY/
    )
  })
})

describe("ConsoleEmailSender", () => {
  it("prints the recipient, subject and text", async () => {
    const log = vi.fn()
    await new ConsoleEmailSender(log).send(message)
    const output = log.mock.calls[0]![0] as string
    expect(output).toContain("marie@example.com")
    expect(output).toContain("Bienvenue")
    expect(output).toContain("Bonjour")
  })
})

describe("NoopEmailSender", () => {
  it("warns that the email was not sent", async () => {
    const warn = vi.fn()
    await expect(new NoopEmailSender(warn).send(message)).resolves.toEqual({})
    expect(warn.mock.calls[0]![0]).toMatch(/not sent/)
  })
})
