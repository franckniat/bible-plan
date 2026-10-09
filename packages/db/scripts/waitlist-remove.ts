// Removes a person from the waitlist (GDPR deletion request).
// Usage: pnpm db:waitlist:remove someone@example.com
import process from "node:process"

import { prisma } from "../src/client"

const email = process.argv[2]?.trim().toLowerCase()
if (!email) {
  console.error("Usage: pnpm db:waitlist:remove <email>")
  process.exit(1)
}

const { count } = await prisma.waitlistEntry.deleteMany({ where: { email } })
console.log(
  count
    ? `Removed ${email} from the waitlist.`
    : `${email} is not on the waitlist.`
)
await prisma.$disconnect()
