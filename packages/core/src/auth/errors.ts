/** Message keys of auth errors ("Auth.errors.<key>"). */
export type AuthErrorKey =
  | "invalidCredentials"
  | "userExists"
  | "passwordTooShort"
  | "passwordTooLong"
  | "invalidEmail"
  | "invalidToken"
  | "tooManyRequests"
  | "unexpected"

const byCode: Record<string, AuthErrorKey> = {
  INVALID_EMAIL_OR_PASSWORD: "invalidCredentials",
  INVALID_PASSWORD: "invalidCredentials",
  USER_ALREADY_EXISTS: "userExists",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "userExists",
  PASSWORD_TOO_SHORT: "passwordTooShort",
  PASSWORD_TOO_LONG: "passwordTooLong",
  INVALID_EMAIL: "invalidEmail",
  INVALID_TOKEN: "invalidToken",
  TOKEN_EXPIRED: "invalidToken",
}

/** Translatable key for an error returned by the better-auth client. */
export function getAuthErrorKey(
  error: { code?: string; status?: number } | null | undefined
): AuthErrorKey {
  if (error?.status === 429) return "tooManyRequests"
  return (error?.code && byCode[error.code]) || "unexpected"
}
