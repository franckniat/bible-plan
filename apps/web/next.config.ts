import type { NextConfig } from "next"
import createNextIntlPlugin from "next-intl/plugin"

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // The service worker is never cached, so a new version reaches every
        // device, and it may only load scripts of this site.
        source: "/sw.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self'",
          },
        ],
      },
      {
        // Bible chapters (public/bible): rarely change, cached for a day,
        // then refreshed in the background. Public-domain texts, readable
        // from anywhere (the mobile app's browser preview downloads them).
        source: "/bible/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
          { key: "Access-Control-Allow-Origin", value: "*" },
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
