# YouTube Data Model

## Principles

1. **External source ≠ Evidence** — `YouTubeComment` is raw source; `Evidence` is curated.
2. **Org isolation** — every row has `organizationId`; queries always filter it.
3. **Soft delete for analysis continuity** — comments get `deletedAt` / `sourceUnavailableAt`, not hard delete by default.
4. **Idempotent sync** — unique on `(organizationId, youtubeCommentId)` and `(organizationId, youtubeVideoId)`.
5. **Tokens never plaintext** — only ciphertext columns on `YouTubeConnection`.

## New enums

```prisma
enum YouTubeConnectionStatus {
  CONNECTED
  REAUTH_REQUIRED
  REVOKED
  ERROR
  DISCONNECTED
}

enum YouTubeVideoSyncStatus {
  NEVER
  PENDING
  SYNCING
  SYNCED
  PARTIAL
  ERROR
  COMMENTS_DISABLED
}

enum YouTubeSyncJobType {
  CHANNEL_SYNC
  VIDEO_SYNC
  COMMENT_IMPORT
  COMMENT_INCREMENTAL_SYNC
  ANALYSIS
}

enum YouTubeSyncJobStatus {
  PENDING
  RUNNING
  COMPLETED
  PARTIAL
  FAILED
  CANCELLED
}

enum CommentClassification {
  QUESTION
  COMPLAINT
  BUG_REPORT
  REQUEST
  SUGGESTION
  PRAISE
  CONFUSION
  PURCHASE_INTENT
  CHURN_RISK
  SPAM
  OTHER
  UNKNOWN
}

enum CommentSentiment {
  POSITIVE
  NEUTRAL
  NEGATIVE
  MIXED
  UNKNOWN
}

enum AiReviewStatus {
  AI_GENERATED
  USER_REVIEWED
  APPROVED
  REJECTED
  ARCHIVED
}

enum EvidenceSourceType {
  MANUAL
  YOUTUBE_COMMENT
}
```

## Core models (Y1+)

### YouTubeConnection

Org + user owned OAuth credential set. One **active** connection per org in MVP (`@@unique([organizationId])` where status ≠ DISCONNECTED enforced in service).

Encrypted fields: `encryptedAccessToken`, `encryptedRefreshToken`.

### YouTubeChannel

Belongs to a connection. Stores channel metadata snapshot. Synced on connect and on demand.

### YouTubeVideo / YouTubeComment

Deferred detail in Y2/Y3. Comments store `textOriginal` immutably; translations live in side fields.

### YouTubeSyncJob / YouTubeSyncCursor / YouTubeImportError

Job progress and pagination resume. Cursor stores `nextPageToken` hashed/opaque string only (not secrets).

### YouTubeApiQuotaEvent

Per-call estimated quota accounting (Y7, stub from Y3).

## Evidence extension

Add optional fields (non-breaking):

```text
sourceType EvidenceSourceType @default(MANUAL)
sourceExternalId String?
sourceUrl String?
youtubeCommentId String?  // FK optional
```

Unique: `@@unique([organizationId, sourceType, sourceExternalId])` where sourceExternalId not null (partial unique via service guard if Prisma partial indexes limited).

## Cluster / Knowledge linkage

Existing Cluster/Knowledge stay general. YouTube analysis attaches via:

- `Cluster.problemId` optional + tags `youtube`, `video:{id}`
- Or join table `YouTubeVideoAnalysis` (Y5) pointing at cluster/knowledge IDs

**Decision for MVP:** introduce `YouTubeVideoAnalysis` in Y5 rather than overloading Problem for every video. Videos can optionally create/link a Problem for the ops cycle.

## Soft delete & disconnect

| Action | Behavior |
| --- | --- |
| Disconnect | status=DISCONNECTED, tokens wiped, channel kept unless user deletes |
| Delete video data | cascade soft-delete comments + related analysis |
| Delete comments | soft-delete; Evidence links remain with unavailable flag |

## Alternatives

- Embed YouTube IDs only on Evidence without `YouTubeComment` table — rejects audit/incremental sync needs.
- One connection per user instead of per org — rejects team reuse; MVP is org-scoped like the rest of the product.

## Risks

- Schema growth; keep Y1 limited to Connection + Channel + SyncJob stubs.
- Migration of Evidence uniqueness for null `sourceExternalId`.
