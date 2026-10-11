import { magicLinkClient } from "better-auth/client/plugins"
import { createAuthClient } from "better-auth/react"

/**
 * Browser client of the better-auth server mounted at /api/auth (same
 * origin). Exposes signUp, signIn, signOut, useSession, requestPasswordReset...
 */
export const authClient = createAuthClient({ plugins: [magicLinkClient()] })

export const { signIn, signOut, signUp, useSession } = authClient
