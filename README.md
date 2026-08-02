# QuestionOps

강의 질문 운영 시스템입니다. 자동 답변 챗봇이 아닙니다.

```
LiveSession → Submission → Question → LiveAnswer / TextAnswer → Publication → Knowledge → Capability
```

핵심: 질문 접수 · 판정 · 생방송 전달 · 음성 답변 추적 · 미답변 관리 · 사후 초안 검토 · 게시물 복사 · Knowledge 축적

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

4. Seed sample data (includes a live session with mock chat/questions):

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

## YouTube integration (Phase Y1+)

Architecture docs live in `docs/`:

- `youtube-architecture.md` — system design + **Inngest** job queue choice
- `youtube-data-model.md`
- `youtube-oauth-flow.md`
- `youtube-sync-strategy.md`
- `youtube-ai-pipeline.md`
- `youtube-security.md`
- `youtube-mvp-checklist.md`

### Google Cloud setup (operator)

1. Create a Google Cloud project
2. Enable **YouTube Data API v3**
3. Configure OAuth consent screen (External/Internal as needed)
4. Create OAuth **Web** client credentials
5. Add authorized redirect URI:
   - Local: `http://localhost:3000/api/integrations/youtube/callback`
   - Prod: `https://YOUR_DOMAIN/api/integrations/youtube/callback`
6. Copy Client ID / Secret into `.env` (never commit secrets)

### Environment

```env
APP_URL="http://localhost:3000"
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI="http://localhost:3000/api/integrations/youtube/callback"
TOKEN_ENCRYPTION_KEY=   # openssl rand -base64 32
YOUTUBE_MOCK_OAUTH=false
YOUTUBE_SEED_MOCK=false
```

Generate encryption key:

```bash
openssl rand -base64 32
```

### Local test without Google

```env
YOUTUBE_MOCK_OAUTH=true
TOKEN_ENCRYPTION_KEY=<any-valid-32-byte-base64>
```

Then open `/settings/integrations/youtube` and click connect — mock channel is created.

Videos: `/youtube/videos` → sync → open a video → import comments → **Run analysis** → approve clusters → generate Knowledge/Capability candidates. Settings page shows quota/jobs admin.

Or seed a mock connection:

```bash
# PowerShell
$env:YOUTUBE_SEED_MOCK="true"; npm run db:seed
```

### Job queue (Phase Y3+)

Comment import jobs persist progress in `YouTubeSyncJob` (refresh-safe). Local MVP runs the worker **inline** after API start; production Inngest wiring is Phase Y7. See `docs/youtube-architecture.md`.

### Production notes

- Update Redirect URI after deploy
- Google may require OAuth verification for `youtube.force-ssl`
- Prepare privacy policy + terms URLs on the consent screen
- Operators never see raw OAuth tokens (encrypted at rest)
