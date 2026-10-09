import { PrismaNeon } from "@prisma/adapter-neon"

import { PrismaClient } from "./generated/prisma/client"

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    // Fail on first use rather than on import, so modules that import the
    // client can still be loaded without a database (e.g. `next build` in CI).
    return new Proxy({} as PrismaClient, {
      get() {
        throw new Error(
          "DATABASE_URL is not set. Add it to your environment (see packages/db/README.md)."
        )
      },
    })
  }
  return new PrismaClient({ adapter: new PrismaNeon({ connectionString }) })
}

// Reuse a single client across hot reloads in development to avoid
// exhausting database connections.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
