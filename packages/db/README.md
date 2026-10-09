# @workspace/db

Database access for Bible Plan: PostgreSQL on [Neon](https://neon.tech) through [Prisma ORM](https://www.prisma.io) 7.

```ts
import { prisma } from "@workspace/db"
```

The package exports the shared `prisma` client and every generated type (models, enums, `Prisma` namespace). Import it only from server code (Server Actions, Route Handlers, services, scripts).

## Configuration

| File | Used by | Variables |
|---|---|---|
| `packages/db/.env` | Prisma CLI (migrate, studio, seed) | `DATABASE_URL`, `DIRECT_URL` |
| `apps/web/.env.local` | Next.js application | `DATABASE_URL` |

Both files are git-ignored. Start from [.env.example](.env.example).

- `DATABASE_URL` is the **pooled** connection (host contains `-pooler`). The application uses it at runtime through `@prisma/adapter-neon`.
- `DIRECT_URL` is the **direct** connection (same host without `-pooler`). Migrations need it.

Without `DATABASE_URL`, importing the client still works (for example, `next build` in CI). The first query then throws an explicit error.

## Commands

Run from the repository root:

| Command | What it does |
|---|---|
| `pnpm db:generate` | Generates the Prisma Client into `src/generated` (git-ignored). Turbo runs it automatically before `dev`, `typecheck`, `test` and `build`. |
| `pnpm db:migrate` | Creates a migration from `prisma/schema.prisma` changes and applies it to the dev database (`prisma migrate dev`). |
| `pnpm db:deploy` | Applies pending migrations without creating new ones (`prisma migrate deploy`), for production. |
| `pnpm db:seed` | Runs [prisma/seed.ts](prisma/seed.ts) to insert development data. |
| `pnpm db:studio` | Opens Prisma Studio to browse the data. |

## Neon branches

Each environment gets its own Neon branch, with its own connection strings:

| Branch | Usage | Where the URLs live |
|---|---|---|
| `dev` (or a personal branch) | Local development | `packages/db/.env`, `apps/web/.env.local` |
| `main` | Production | Vercel environment variables |

Create branches in the Neon console (**Branches → New branch**), then copy their URLs from **Connect**. A branch starts as a copy of its parent. You can reset it from the parent to get a clean dev database again.

> Bible Plan stores sensitive personal data (prayer journals). Create the **production** database in an **EU region** (e.g. AWS Frankfurt) for GDPR.

## Migration workflow

1. Change `prisma/schema.prisma`.
2. Run `pnpm db:migrate --name <name>` (e.g. `add_reading_plans`). Prisma writes `prisma/migrations/<timestamp>_<name>/migration.sql` and applies it to the dev branch.
3. Run `pnpm db:generate`: since Prisma 7, `migrate dev` no longer regenerates the client (Turbo also regenerates it before `dev`, `typecheck`, `test` and `build`).
4. Review the SQL and commit it together with the schema change.
5. In production, `pnpm db:deploy` applies the committed migrations (set up in the production deployment issue).

Never edit a migration that has already been applied to production: create a new one instead.
