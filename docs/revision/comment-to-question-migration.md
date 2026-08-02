# Comment → Question Migration

## Goal

Preserve YouTube (and later Zoom/Meet) **raw messages**, but make **Question** the unit of operations — never auto-Evidence / auto-Knowledge from every comment.

## Current path (retire as default)

```text
YouTubeComment
  → (optional) Evidence via to-evidence / ensureEvidenceForComments
  → YouTubeAnalysisCluster → Cluster
  → KnowledgeCandidate → Knowledge
  → CapabilityCandidate → Capability
```

Key code:

- `src/services/youtube/comment-service.ts` — `convertToEvidence`
- `src/services/youtube/analysis-service.ts` — classify, cluster, candidates
- `src/app/api/youtube/videos/[id]/comments/to-evidence/route.ts`
- UI: `youtube-video-detail-view.tsx`, `youtube-analysis-panel.tsx`

## Target path

```text
YouTubeComment | LiveChatMessage (immutable raw)
  → Submission (normalized, always kept)
  → AI: QUESTION candidate? (suggestion only)
  → Operator review
  → Question (accepted) | rejected / excluded / chat-only
  → QuestionCluster (optional, human-approved)
  → QueueItem
  → LiveAnswer and/or TextAnswer
  → PublicationItem
  → Knowledge (promotion rules) → Capability
```

## Mapping table

| Current | Target | Migration note |
| --- | --- | --- |
| `YouTubeComment` | Keep as raw + optionally link `Submission` | Do not rewrite original text |
| `YouTubeVideo` | Seed / link `LiveSession.youtubeVideoId` | Session is parent, not video detail |
| `YouTubeAnalysisCluster` | Suggest `QuestionCluster` only | Never auto-merge |
| `Evidence` from comments | Stop bulk convert | Recreate Evidence as ops artifacts later |
| `Cluster` | `QuestionCluster` | New table; optional archive old Cluster rows |
| Comment `classification` | Message-type / handling recommendation | Separate from Question.status |
| Sentiment fields | Defer / non-core | Do not drive dashboard |

## Submission creation rules

1. Import chat/comments into raw store (`YouTubeComment` and/or direct `Submission`).
2. Every inbound message gets a `Submission` with `sourceType` (`YOUTUBE_LIVE_CHAT`, `YOUTUBE_COMMENT`, …).
3. `@@unique([organizationId, sourceType, externalId])` for idempotent sync.
4. Question detection writes **candidate flags / suggested actions**, not final `QuestionStatus` transitions.
5. Operator `accept` creates `Question` with `submissionId` (1:1 when from a single submission).

## Evidence redefinition

Evidence is **verifiable ops material**, not “the comment itself as product object”:

- original comment / submission snapshot link
- intake timestamp
- status change log
- presented-to-speaker time
- transcript segment / video timestamp
- publication artifact
- operator actions / timing records

Pipeline:

```text
raw message → question candidate → operator review → Question
```

Never: comment → Knowledge / Capability in one step.

## Data migration strategy (high level)

1. **Additive schema first** — add LiveSession / Submission / Question* without dropping YouTube tables.
2. Backfill: for each org video used as a “session”, create `LiveSession` pointing at `youtubeVideoId`.
3. For each `YouTubeComment`, create `Submission` (`sourceType=YOUTUBE_COMMENT`, `externalId=youtubeCommentId`).
4. Optionally create `Question` only where `classification=QUESTION` **and** operator later accepts — do **not** bulk-accept AI labels.
5. Leave historical Evidence / Cluster / Knowledge rows readable; mark UI as legacy or hide from primary nav.
6. Soft-deprecate APIs: `to-evidence`, YouTube analysis approve→Capability.

## Dual-write window (recommended)

During Phases 1–3:

- Continue writing `YouTubeComment` on import.
- Also write `Submission` + attach to `LiveSession`.
- New UI reads Submission/Question only.
- Old `/youtube/*` remains read-only or redirects to LiveSession.

## Cutover checklist

- [ ] No UI path bulk-converts comments to Evidence
- [ ] Analysis panel replaced by question detection + review
- [ ] Knowledge promotion requires approved TextAnswer / multi-session recurrence
- [ ] Seed data uses LiveSession scenarios, not only support Problems
- [ ] Docs/tagline no longer say “comment analysis product”
