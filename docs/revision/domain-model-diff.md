# Domain Model Diff

## Target conceptual graph

```text
Organization
  └─ LiveSession
       ├─ Submission ──┬─ Question ─┬─ QueueItem
       │               │            ├─ LiveAnswer
       │               │            ├─ TextAnswer
       │               │            └─ QuestionCluster (many Questions)
       ├─ TranscriptSegment ─ QuestionAnswerMatch ─ Question
       └─ Publication ─ PublicationItem ─ Question / TextAnswer
```

Downstream: Knowledge ← approved answers + recurrence; Capability ← operational SOPs.

## New models (BUILD_NEW)

| Model | Role |
| --- | --- |
| `LiveSession` | Parent for questions, submissions, transcripts, publications |
| `Submission` | Normalized inbound message; preserves original |
| `Question` | Operable question unit (self-ref children for partials) |
| `QuestionCluster` | Human-approved duplicate group |
| `QueueItem` | Projection for live order |
| `TranscriptSegment` | Caption / ASR / manual segments |
| `QuestionAnswerMatch` | AI-suggested question↔segment links |
| `LiveAnswer` | Spoken answer record + completeness |
| `TextAnswer` | Post-live draft / review / approve |
| `Publication` / `PublicationItem` | Copy-first multi-channel publish record |

## Enums (BUILD_NEW / expand)

See product spec §4–§21. Critical:

- `LiveSessionStatus`, `TranscriptStatus`
- `SubmissionSourceType`
- `QuestionStatus` (includes `PARTIALLY_ANSWERED_LIVE`)
- `QuestionCategory`, `QuestionPriority`, `AnswerMode`
- `ClusterStatus`, `QueueItemStatus`
- `AnswerCompleteness`, `AnswerReviewStatus`, `TextAnswerStatus`
- `PublicationChannel`, `PublicationFormat`, `PublicationStatus`
- `OrganizationRole`
- Message-type / handling recommendation enums for AI (not final status)

## Existing models — fate

| Model | Diff |
| --- | --- |
| `YouTubeComment` | KEEP as raw external row; optional FK to Submission |
| `YouTubeConnection` / `Channel` / `Video` | KEEP for ingestion; Video links LiveSession |
| `YouTubeSyncJob` | ADAPT → general job table or extend jobType enum |
| `YouTubeVideoAnalysis*` / candidates | REMOVE_OR_DEFER from MVP path |
| `Problem` | REMOVE_OR_DEFER as primary hub; optional legacy |
| `Evidence` | ADAPT semantics; drop required Problem coupling for new flows |
| `Cluster` | REPLACE UX with `QuestionCluster`; freeze old CRUD |
| `Knowledge` | ADAPT fields (status OFFICIAL…, scope, exceptions, last reviewed) |
| `Capability` | ADAPT toward SOP examples in spec §25 |
| `Activity` | EXPAND actions / metadata |
| `OrganizationMember.role` | REPLACE with `OrganizationRole` enum |

## Field-level highlights

### LiveSession counters

Maintain denormalized counts for control/dashboard:

`totalSubmissions`, `totalQuestions`, `answeredLiveCount`, `partiallyAnsweredCount`, `unansweredCount`, `publishedAnswerCount`.

Update via Service transactions on status changes.

### Question self-reference

MVP: `parentQuestionId` for compound questions split under partial live answers.

Parent: `PARTIALLY_ANSWERED_LIVE`; children: `ANSWERED_LIVE` / `UNANSWERED`.

### TextAnswer audit

Keep `aiDraft` immutable once generated; edits go to `currentDraft` / `finalAnswer`.

### Publication MVP

Copy + mark-copied / mark-published + optional `externalUrl`. No auto-post to Kakao/YouTube/email.

## Knowledge / Capability promotion (diff from current)

**Stop:** every cluster approve → knowledge/capability candidates.

**Start:** candidate when recurrence / multi-author / instructor official / policy relevance.

Knowledge statuses: `CANDIDATE | EMERGING_PATTERN | VALIDATED | OFFICIAL | CONTRADICTED | DEPRECATED | ARCHIVED`.

## Relationship to YouTubeComment

External source ≠ Question.

```text
YouTubeComment (immutable text)
Submission.originalText (copy/normalize)
Question.questionText (operator-facing; may use representative text)
```
