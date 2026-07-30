# YouTube MVP Checklist

## End-to-end acceptance (from product spec §36)

- [ ] Login to QuestionOps
- [ ] Connect YouTube via Google OAuth
- [ ] See connected channel info
- [x] Load video list
- [x] Select a video
- [x] Import up to 1,000 comments with progress
- [x] View original comments
- [x] Convert comments → Evidence
- [x] AI classify comments
- [x] Cluster similar comments
- [x] User edits/approves clusters
- [x] Knowledge draft with supporting comments
- [x] Capability candidates
- [ ] Global search finds YouTube entities
- [x] Incremental sync adds only new comments
- [ ] Disconnect YouTube
- [ ] Delete collected data when requested
- [ ] State survives browser refresh

## Phase gates

Each phase requires: `tsc`, lint, unit tests, build, seed (if applicable), manual check, README update. **Do not start next phase with failing gate.**

### Y1

- [x] Prisma models Connection + Channel (+ job stub)
- [x] OAuth connect/callback/disconnect/status
- [x] Settings UI + i18n
- [x] Channel fetch on connect
- [x] Token encryption
- [x] Tests: state mismatch, encrypt/decrypt, write denylist
- [x] Docs present under `docs/youtube-*.md`

### Y2

- [x] YouTubeVideo model
- [x] Video list / detail pages
- [x] Sync from channel (incl. mock)
- [x] URL import + parser tests
- [x] Filters / sort

### Y3

- [x] YouTubeComment model
- [x] Comment import job (inline + progress via YouTubeSyncJob)
- [x] List comments API + video detail UI with progress bar
- [x] Mock comment import (`YOUTUBE_MOCK_OAUTH`)
- [x] Resume-friendly job status endpoint `/api/youtube/jobs/[jobId]`
- [ ] Inngest production wiring (deferred to Y7)

### Y4

- [x] Evidence source fields (`sourceType`, `sourceExternalId`, `sourceUrl`, `youtubeCommentId`)
- [x] Convert comments → Evidence (idempotent)
- [x] Comment filters (search, language, top-level, converted)
- [x] Translation display mode (original / KO / EN; mock pairs ready)
- [x] Language detect heuristic + tests

### Y5

- [x] Comment classification + sentiment (+ heuristic / OpenAI)
- [x] Cluster formation + review approve/reject → real Cluster
- [x] Analysis panel on video detail

### Y6

- [x] Knowledge / Capability candidates from clusters
- [x] Approve → real Knowledge / Capability

### Y7

- [x] Incremental comment sync (`mode: fast`)
- [x] Quota event accounting + admin panel
- [x] Cost caps env (`YOUTUBE_MAX_ANALYZE_COMMENTS`)
- [x] Inngest stub (`src/jobs/youtube/queue.ts`); runtime still inline

### Remaining polish

- [ ] Global search finds YouTube entities
- [ ] Full Inngest production workers

## Explicit non-goals

Auto-reply, moderation writes, live chat, competitor scraping, unlimited realtime sync.
