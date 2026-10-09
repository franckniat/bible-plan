import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  transpilePackages: ["@workspace/core", "@workspace/db", "@workspace/ui"],
}

export default nextConfig
