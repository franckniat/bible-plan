// Entry point for the better-auth CLI, used to regenerate the Prisma models
// when the auth configuration changes (e.g. a new plugin):
//   pnpm --filter @workspace/auth auth:generate
import { createAuth } from "./src/auth"

export const auth = createAuth()
