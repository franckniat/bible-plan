// Development seed, run with `pnpm db:seed` (or automatically by `prisma migrate reset`).
// Feature issues add their sample data here (test user, reading plan...).
import { prisma } from "../src/client"

async function main() {
  const [{ database }] = await prisma.$queryRaw<
    [{ database: string }]
  >`SELECT current_database()::text AS database`
  console.log(`Seeding database "${database}"…`)

  console.log("Nothing to seed yet.")
}

main()
  .catch((error: unknown) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
