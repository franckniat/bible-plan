import type { NextConfig } from "next"
import createNextIntlPlugin from "next-intl/plugin"

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Bible chapters (public/bible): rarely change, cached for a day,
        // then refreshed in the background.
        source: "/bible/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
    ]
  },
  transpilePackages: [
    "@workspace/auth",
    "@workspace/bible-data",
    "@workspace/core",
    "@workspace/db",
    "@workspace/i18n",
    "@workspace/notifications",
    "@workspace/ui",
  ],
}

const withNextIntl = createNextIntlPlugin("./i18n/request.ts")

export default withNextIntl(nextConfig)
