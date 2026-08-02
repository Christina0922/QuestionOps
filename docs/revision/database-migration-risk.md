# Database Migration Risk

## Strategy

**Additive-first, dual-write, then deprecate.**  
Do not drop Problem/Evidence/YouTube tables in Phase 1.

## Risks

| Risk | Severity | Mitigation |
| --- | --- | --- |
| Evidence requires `problemId` | High | New Evidence paths optional; Questions don’t depend on Problem |
| Unique `(org, sourceType, sourceExternalId)` on Evidence | Medium | New Submissions use own unique; avoid colliding backfills |
| Large YouTubeComment tables | Medium | Backfill Submissions in batches; jobs with resume |
| Enum expansion on existing columns | Medium | Prefer new columns/tables over rewriting CommentClassification in place |
| Org role string → enum | Medium | Map unknown → VIEWER; migrate in one deploy with default |
| Soft-deleted YouTube rows | Low | Preserve `deletedAt` / `sourceUnavailableAt` on Submission |
| Vercel / prod without Neon | High | Migration only after DATABASE_URL verified |
| Breaking existing `/api/youtube` clients | Low | Keep routes until redirects land; mark deprecated |
| Seed wipe | High | New seed scenarios behind flag; don’t destroy prod |

## Phase 1 migration steps (proposed)

1. Add enums + tables: LiveSession, Submission, Question, QuestionCluster, QueueItem (minimal).
2. Add FKs from Organization; indexes on `(organizationId, liveSessionId)`, status fields.
3. Optional: `YouTubeComment.submissionId` nullable FK.
4. `YouTubeVideo` ← optional `liveSessionId` or LiveSession.youtubeVideoId only (prefer session owns video id string).
5. Extend `YouTubeSyncJob.jobType` **or** introduce `OpsJob` table for new job types (cleaner long-term).
6. Expand `ActivityAction` or store lecture actions in `metadata.action` until enum migration.
7. `db push` / Prisma migrate in staging; run backfill script dry-run.
8. No destructive drops in Phase 1–4.

## Backfill jobs

| Job | Input | Output |
| --- | --- | --- |
| `sessions_from_videos` | YouTubeVideo | LiveSession DRAFT/ENDED |
| `submissions_from_comments` | YouTubeComment | Submission |
| `noop_questions` | — | Do not auto-create Questions from AI labels |

## Rollback

- Feature flag `LIVE_QA_UI=false` keeps old nav.
- New tables unused if flag off.
- Dual-write can stop writing Submission without deleting data.

## Later destructive phases (Phase 8+)

Only after MVP acceptance:

- Remove YouTube analysis candidate tables
- Archive Problem-centric UI routes
- Narrow Evidence schema

## Performance notes

- Control screen: index QueueItem `(liveSessionId, status, defaultPosition)`.
- Unanswered inbox: index Question `(liveSessionId, status, priority)`.
- Avoid N+1: list endpoints include submission + cluster summary DTOs.
