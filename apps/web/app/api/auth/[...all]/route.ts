import { toNextJsHandler } from "@workspace/auth/next"

import { auth } from "@/server/auth"

// All better-auth endpoints: sign-up, sign-in, email verification, password
// reset, sessions...
export const { GET, POST } = toNextJsHandler(auth)
