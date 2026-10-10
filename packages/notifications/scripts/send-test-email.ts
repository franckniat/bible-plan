// Sends the test email with the configured sender (Resend, or the terminal).
// Usage: pnpm email:test you@example.com [fr|en]
// Reads apps/web/.env.local (RESEND_API_KEY, EMAIL_FROM).
import process from "node:process"

import { localeSchema } from "@workspace/core"

import { getEmailDriver } from "../src/email/config"
import { createEmailSender } from "../src/email/senders"
import { renderTestEmail } from "../src/email/templates/test-email"

const [to, localeArg = "fr"] = process.argv.slice(2)
const locale = localeSchema.safeParse(localeArg)
if (!to || !locale.success) {
  console.error("Usage: pnpm email:test <email> [fr|en]")
  process.exit(1)
}

const email = await renderTestEmail(locale.data)
const sent = await createEmailSender().send({ ...email, to, category: "auth" })
console.log(
  `Test email sent to ${to} via ${getEmailDriver()}${sent.id ? ` (id ${sent.id})` : ""}.`
)
