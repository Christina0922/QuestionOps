# Current Architecture Audit

**Date:** 2026-08-02  
**Scope:** QuestionOps codebase vs product pivot to lecture Q&A ops  
**Phase:** Revision Phase 0 — analysis only (no code changes)

## Product definition (target)

QuestionOps is **not** an auto-reply chatbot.

It is a **lecture question operations system**:

Submission intake → question adjudication → live handoff → spoken answer tracking → unanswered management → post-live review → instructor-approved drafts → publications → Knowledge / Capability.

Core chain:

```text
YouTubeComment (raw)
  → Submission
  → Question
  → QuestionCluster
  → LiveAnswer | TextAnswer
  → Publication
  → Knowledge
  → Capability
```

`LiveSession` is the primary parent object.

## Current product (as implemented)

Tagline / flow today: **Problem → Evidence → Cluster → Knowledge → Capability**, with YouTube comments as the primary ingestion and AI analysis surface.

```text
YouTube OAuth → Video → Comment import
  → classify / cluster (YouTubeAnalysis*)
  → convert to Evidence
  → approve Cluster / Knowledge / Capability candidates
```

## Classification legend

| Label | Meaning |
| --- | --- |
| KEEP | Use as-is |
| ADAPT | Reuse with semantic or structural changes |
| REMOVE_OR_DEFER | Conflicts with new core; remove from MVP path or demote |
| BUILD_NEW | Does not exist; must implement |

## Area audit

### 1. Auth — KEEP (+ ADAPT for RBAC)

| Asset | Path |
| --- | --- |
| Auth context | `src/lib/auth.ts` |
| Middleware | `middleware.ts` |
| API wrapper | `src/lib/api-handler.ts` |
| Providers | `src/components/layout/providers.tsx` |

- Clerk + `DEV_AUTH_BYPASS` works.
- Org isolation via `organizationId` is consistent.
- Gap: roles stored as free string, never enforced.

### 2. Organization / roles — ADAPT + BUILD_NEW

- `OrganizationMember.role` is `String @default("member")`.
- Target enum: `OWNER | ADMIN | MODERATOR | SPEAKER | REVIEWER | VIEWER`.
- Need `requireRole` in services + UI gating.

### 3. YouTube OAuth / channel / video / comment — ADAPT (ingestion) + REMOVE_OR_DEFER (product core)

**Keep as data source (not product center):**

- OAuth connect/disconnect (`src/services/youtube/connection-service.ts`)
- Token encryption (`src/lib/youtube/crypto.ts`)
- Channel sync, video list, comment raw import
- Quota events, sync jobs

**Demote / stop treating as core UX:**

- `/youtube/videos` as primary nav
- Analysis panel as main value prop
- Comment → Evidence / Knowledge / Capability auto-path
- Sentiment / churn / purchase taxonomies as dashboard focus

### 4. Evidence / Cluster / Knowledge / Capability / Problem

| Entity | Verdict | Notes |
| --- | --- | --- |
| Problem | REMOVE_OR_DEFER as hub | Replaced by LiveSession + Question |
| Evidence | ADAPT | Ops evidence (timestamps, transcripts, actions) — not “every comment” |
| Cluster | ADAPT → QuestionCluster | Duplicate grouping only; no auto-merge |
| Knowledge | ADAPT | Promotion after approved answers + recurrence |
| Capability | ADAPT | SOP to reduce repeat questions, not reply templates |

Auto paths that **must stop being default**:

- `POST .../comments/to-evidence`
- `ensureEvidenceForComments` on cluster approve
- YouTube knowledge/capability candidate generation from comment clusters

### 5. Dashboard — ADAPT

Today: counts of problems / evidence / knowledge / capabilities.

Target: live sessions, answered / partial / unanswered, review backlog, drafts, publications, repeat questions.

### 6. Search — ADAPT

Today: problem, evidence, knowledge, capability.

Target: LiveSession, Submission, Question, LiveAnswer transcript, TextAnswer, Publication, Knowledge, Capability — with source labels.

### 7. Activity log — KEEP + ADAPT

- Model: `Activity` with `CREATE|UPDATE|DELETE`, free `entityType`, optional `metadata`.
- Expand actions (present, partial-answer, approve-draft, mark-copied, etc.).
- Prefer `previousValue` / `newValue` / `reason` (extend schema or use `metadata`).

### 8. Prisma schema summary

**Core (14):** User, Organization, OrganizationMember, Problem, Evidence, Cluster (+join), Knowledge (+joins), Capability, Tag (+joins), Activity.

**YouTube (11):** Connection, Channel, Video, SyncJob, Comment, VideoAnalysis, AnalysisCluster, KnowledgeCandidate, CapabilityCandidate, ApiQuotaEvent.

**Missing for target:** LiveSession, Submission, Question, QuestionCluster, QueueItem, TranscriptSegment, QuestionAnswerMatch, LiveAnswer, TextAnswer, Publication, PublicationItem, OrganizationRole enum, lecture-specific statuses.

### 9. Job queue — KEEP pattern + BUILD_NEW job types

- Runtime: inline `void run…()` after API; progress in `YouTubeSyncJob`.
- Inngest: stub only (`src/jobs/youtube/queue.ts`).
- Reuse durable job + poll pattern for post-live pipeline.

### 10. AI — ADAPT

Keep: OpenAI client + template fallback, Zod outputs, “AI suggests / human confirms”.

Retarget:

- Message type: QUESTION vs CHAT vs SPAM (not sentiment-first)
- Duplicate / importance / live-answered candidates
- Instructor draft (`AnswerDraftSchema`) — never auto-publish

Remove from MVP core: sentiment dashboards, purchase intent, churn risk.

### 11. Pages / nav — ADAPT + BUILD_NEW

Current sidebar centers Problems / Evidence / YouTube.

Target sidebar: Dashboard, Live sessions, Unanswered, Answer review, Publications, Knowledge, Capability, Search, Settings.

### 12. Tests — BUILD_NEW domain tests

Existing: ApiError, problem-service (mocked), YouTube classify/crypto/language/url-parse.

Need: question state machine, queue, merge/split, match review, publication copy, RBAC.

### 13. i18n — ADAPT

Typed KO/EN dictionaries ready; product copy and nav keys need rewrite.

## Collision summary (must resolve before Phase 1)

1. Evidence requires `problemId` — breaks LiveSession-first model.
2. Product UI and docs frame comment analysis as the product.
3. Dual cluster systems (`Cluster` vs `YouTubeAnalysisCluster`).
4. No answer / publication / queue / transcript entities.
5. No RBAC.
6. No real-time control UX (REST + React Query only).

## Phase 0 outputs

See sibling docs in `docs/revision/`:

- `comment-to-question-migration.md`
- `domain-model-diff.md`
- `page-routing-diff.md`
- `state-transition-plan.md`
- `database-migration-risk.md`
- `reusable-components.md`
- `removal-candidates.md`
