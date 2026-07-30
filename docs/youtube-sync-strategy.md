# YouTube Sync Strategy

## Job types

| Type | Purpose |
| --- | --- |
| CHANNEL_SYNC | Refresh channel metadata |
| VIDEO_SYNC | Pull video list pages |
| COMMENT_IMPORT | Full or capped comment pull for a video |
| COMMENT_INCREMENTAL_SYNC | Fast sync since last cursor |
| ANALYSIS | AI pipeline for a video |

## Execution

- Enqueued via Inngest (`youtube/comment.import`, etc.)
- Each job row in `YouTubeSyncJob` is source of truth for UI progress
- Steps are **idempotent**: upsert by YouTube IDs

## Comment import (Y3)

Defaults:

- Include replies
- Max 1,000 comments
- Order: time (newest first) for incremental; relevance optional later

Algorithm (full):

```text
1. Create job PENDING → RUNNING
2. Loop commentThreads.list with pageToken
3. Upsert top-level comments
4. If replies.totalResults > replies.items.length → comments.list parentId
5. Update processed/created/updated/skipped/failed counts
6. Persist nextPageToken for resume
7. On cancel flag → CANCELLED
8. Complete PARTIAL if hit max or soft errors
```

## Incremental (fast) sync

```text
1. Fetch newest pages
2. Stop after N consecutive known youtubeCommentIds (configurable, default 20)
3. Upsert new/changed (updatedAtSource newer)
```

## Full recheck

Separate job type / flag that does not early-stop; marks missing comments with `sourceUnavailableAt` when absent from a complete pass (best-effort; YouTube does not provide delete feed).

## Quota

- Costs read from config (`YOUTUBE_QUOTA_COST_COMMENT_THREADS_LIST`, default 1) — **not hardcoded magic in business logic**
- Record `YouTubeApiQuotaEvent` per call
- On `quotaExceeded` → fail job with user-friendly message; do not busy-loop

## Error mapping

| API | User message key |
| --- | --- |
| commentsDisabled | youtube.error.commentsDisabled |
| videoNotFound | youtube.error.videoNotFound |
| forbidden | youtube.error.forbidden |
| invalid_grant / 401 | youtube.error.reauthRequired |
| quotaExceeded | youtube.error.quotaExceeded |

## Alternatives

- Cron-only sync — weaker UX for “import now”. Use on-demand jobs + optional cron later.
- Single mega-request — incompatible with serverless limits.

## Risks

- Reply pagination gaps
- Soft-deleted comments reappearing
- Dual full/incremental logic drift — share upsert path
