import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  transpilePackages: ["@workspace/core", "@workspace/ui"],
}

export default nextConfig
