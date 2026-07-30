# QuestionOps

Evidence-driven system for structuring customer problems into reusable knowledge and capabilities.

```
Problem → Evidence → Cluster → Knowledge → Capability
```

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS v4
- Prisma 6 + PostgreSQL
- Clerk auth (with `DEV_AUTH_BYPASS` for local development)
- Zod, React Query, Sonner
- Layered architecture: repositories → services → API → UI

## Prerequisites

- Node.js 20+
- PostgreSQL running locally (or a hosted database)

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment variables:

```bash
cp .env.example .env
```

Ensure at least:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/questionops?schema=public"
DEV_AUTH_BYPASS=true
NEXT_PUBLIC_DEV_AUTH_BYPASS=true
```

3. Create the database schema:

```bash
npm run db:push
```

4. Seed sample data (20 problems, 100 evidence, 20 knowledge, 10 capabilities):

```bash
npm run db:seed
```

5. Start the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Auth modes

### Local bypass (default in `.env`)

When `DEV_AUTH_BYPASS=true` and `NEXT_PUBLIC_DEV_AUTH_BYPASS=true`:

- Middleware skips Clerk
- `getAuthContext()` upserts a demo user + organization + membership
- Sign-in / sign-up pages redirect you to the dashboard message

### Clerk

1. Set Clerk keys in `.env`
2. Set `DEV_AUTH_BYPASS=false` and `NEXT_PUBLIC_DEV_AUTH_BYPASS=false`
3. Ensure users select an active Clerk organization (org-scoped data)

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start Next.js |
| `npm run build` | Generate Prisma client + build |
| `npm run test` | Run Vitest |
| `npm run db:push` | Push Prisma schema |
| `npm run db:seed` | Seed demo data |
| `npm run db:studio` | Open Prisma Studio |

## Architecture

```
src/
  app/            # App Router pages + API routes
  components/     # UI + feature components
  hooks/          # React Query hooks
  lib/            # auth, prisma, api helpers
  schemas/        # Zod validators
  repositories/   # Prisma data access
  services/       # Business logic + activity logging
  prompts/        # AI draft prompts
  types/          # Shared types
```

API routes never talk to Prisma directly — they call services, which call repositories.

## AI drafts (optional)

Set `OPENAI_API_KEY` to enable OpenAI-backed drafts for knowledge and clusters.

Without a key, endpoints return deterministic template drafts so the MVP flow still works.

## MVP flow checklist

1. Open dashboard
2. Create a problem
3. Attach multiple evidence items
4. Cluster related evidence
5. Create knowledge (optionally AI draft)
6. Create a capability from knowledge
7. Search across entities
8. Review activity log
9. Edit / soft-delete records
