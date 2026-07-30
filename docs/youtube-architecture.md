# YouTube Architecture

## Goal

Connect a user’s YouTube channel, import video comments as external source data, then convert selected comments into QuestionOps Evidence → Cluster → Knowledge → Capability without becoming a YouTube Studio replacement.

## Existing system fit

QuestionOps already uses:

- Org-scoped Prisma models + soft delete
- `repositories → services → API → UI`
- `createApiHandler` + Zod
- Activity log on mutations
- Provider-style SearchService / AI draft interfaces
- i18n (`ko` / `en`)

YouTube features extend these layers. They do **not** invent a parallel stack.

## High-level components

```text
UI (/settings/integrations/youtube, /youtube/*)
  → API (/api/integrations/youtube/*, /api/youtube/*)
    → YouTubeConnectionService / YouTubeVideoService / YouTubeCommentService / YouTubeAnalysisService
      → Repositories (Prisma)
      → YouTubeApiClient (OAuth token refresh + Data API)
      → Job queue workers (Inngest)
      → AI providers (classify / embed / cluster / draft)
```

## Job queue choice: **Inngest**

| Option | Pros | Cons |
| --- | --- | --- |
| Inngest | Native Next.js routes, no Redis for MVP, local `npx inngest-cli`, serverless-friendly for Vercel | Vendor dependency |
| Trigger.dev | Strong DX | Extra infra |
| BullMQ + Redis | Full control | Requires Redis ops on every env |
| Vercel Queues | Platform-native | Newer / less portable |

**Decision:** Inngest for MVP. Sync jobs (comment import, analysis) run as durable functions with step retries. Local dev runs the Inngest Dev Server. Documented in README.

Fallback path for tests: `MockJobRunner` in-process when `JOB_QUEUE_MODE=inline`.

## Module layout (planned)

```text
src/
  app/(app)/settings/integrations/youtube/
  app/(app)/youtube/
  app/api/integrations/youtube/
  app/api/youtube/
  app/api/inngest/
  repositories/youtube-*.ts
  services/youtube/
  lib/youtube/ (oauth, crypto, url-parse, quota)
  schemas/youtube/
  prompts/youtube/
  jobs/youtube/
docs/youtube-*.md
```

## Phase map

| Phase | Scope |
| --- | --- |
| Y1 | Models, OAuth, status UI, channel sync, disconnect |
| Y2 | Videos list/detail, URL import |
| Y3 | Comment import jobs, progress, resume |
| Y4 | Evidence conversion, filters, translation display |
| Y5 | Classification + clustering + review UX |
| Y6 | Knowledge / Capability candidates |
| Y7 | Incremental sync, quota admin, cost caps |

## Alternatives considered

1. **Poll comments only via API key** — simpler OAuth, but fails for non-public videos. Rejected as sole approach; used as optional public-path later.
2. **Sync comments synchronously in API route** — breaks Vercel timeouts. Rejected.
3. **Store tokens in Clerk metadata** — hard to encrypt/rotate; rejected in favor of DB + encryption key.

## Risks

- Google refresh token revocation / missing refresh token on re-consent
- YouTube quota exhaustion (`quotaExceeded`)
- Comment replies incomplete in `commentThreads.list`
- Scope `youtube.force-ssl` is broader than read; app must hard-block write APIs
- AI cost blow-ups on large comment sets

## Non-goals (MVP)

Auto-reply, delete/hide/report comments, live chat, competitor scraping, unlimited realtime sync.
