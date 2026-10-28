/** The Bible Plan website, where the app downloads Bible versions. */
export const siteUrl = (
  process.env.EXPO_PUBLIC_SITE_URL || "https://bible-plan-delta.vercel.app"
).replace(/\/$/, "")
