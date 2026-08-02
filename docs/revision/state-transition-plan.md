# State Transition Plan

## Principles

1. AI recommendations **never** set final `QuestionStatus` without operator/instructor confirmation.
2. Prefer **Command APIs** over generic PATCH for transitions (spec §35–§37).
3. Admin recovery requires explicit command + reason.
4. `PARTIALLY_ANSWERED_LIVE` is first-class; compound questions use `parentQuestionId`.

## QuestionStatus — allowed happy path

```text
DETECTED → NEEDS_REVIEW → ACCEPTED → WAITING → QUEUED
  → ASSIGNED → PRESENTED_TO_SPEAKER → ANSWERING_LIVE
  → ANSWERED_LIVE | PARTIALLY_ANSWERED_LIVE | UNANSWERED

PARTIALLY_ANSWERED_LIVE | UNANSWERED | POST_REVIEW_PENDING
  → ANSWER_DRAFTED → ANSWER_IN_REVIEW → ANSWER_APPROVED
  → READY_TO_PUBLISH → PUBLISHED → RESOLVED → ARCHIVED
```

Adjudication branches from `DETECTED` / `NEEDS_REVIEW`:

- `REJECTED`, `DUPLICATE`, `EXCLUDED`

## Allowed transitions (MVP matrix excerpt)

| From | To | Actor |
| --- | --- | --- |
| DETECTED | NEEDS_REVIEW / ACCEPTED / REJECTED / EXCLUDED | MODERATOR+ |
| ACCEPTED | QUEUED / WAITING | system / MODERATOR |
| QUEUED | PRESENTED_TO_SPEAKER / UNANSWERED / DEFERRED* | MODERATOR |
| PRESENTED_TO_SPEAKER | ANSWERING_LIVE | MODERATOR / SPEAKER |
| ANSWERING_LIVE | ANSWERED_LIVE / PARTIALLY_ANSWERED_LIVE / UNANSWERED | MODERATOR / SPEAKER |
| PARTIALLY_ANSWERED_LIVE | ANSWER_DRAFTED / child Questions | MODERATOR |
| UNANSWERED | ANSWER_DRAFTED | MODERATOR |
| ANSWER_DRAFTED | ANSWER_IN_REVIEW | MODERATOR / SPEAKER |
| ANSWER_IN_REVIEW | ANSWER_APPROVED / REVISION* | SPEAKER / REVIEWER |
| ANSWER_APPROVED | READY_TO_PUBLISH | MODERATOR |
| READY_TO_PUBLISH | PUBLISHED | MODERATOR |
| PUBLISHED | RESOLVED | system / MODERATOR |

\*Defer maps via QueueItem `DEFERRED` while Question may stay `QUEUED` or move to `UNANSWERED` — decide in Service and document in tests.

## Forbidden examples (must test)

| From | To | Why |
| --- | --- | --- |
| REJECTED | ANSWERED_LIVE | Never answered |
| EXCLUDED | PUBLISHED | Excluded from ops |
| DETECTED | PUBLISHED | Skips review |
| ANSWER_DRAFTED | RESOLVED | Skips approve/publish |
| DUPLICATE | QUEUED | Represented by cluster rep |

## QueueItemStatus

```text
WAITING → NEXT → PRESENTED → ANSWERING → COMPLETED
         ↘ SKIPPED | DEFERRED | REMOVED
```

Default order: `acceptedAt ASC`, overridden by `manualPosition` / priority with audit of before/after.

## LiveSessionStatus (pipeline)

```text
DRAFT → SCHEDULED → PREPARING → LIVE → ENDED
  → PROCESSING → REVIEW_READY → ANSWER_WRITING
  → READY_TO_PUBLISH → COMPLETED → ARCHIVED
```

`CANCELLED` from pre-LIVE states.

Post-live job stages (progress strings / job types):

1. Final chat/comment sync  
2. Question candidate detection  
3. Transcript import  
4. Q↔segment matching  
5. Live / partial / unanswered candidates  
6. Review-ready  

## TextAnswerStatus

```text
EMPTY → AI_GENERATED | DRAFT → IN_REVIEW
  → REVISION_REQUESTED → DRAFT
  → APPROVED → READY_TO_PUBLISH → PUBLISHED
```

Also: `REJECTED`, `ARCHIVED`.

## MatchReviewStatus / ClusterStatus / PublicationStatus

- Matches: `AI_SUGGESTED → NEEDS_REVIEW → CONFIRMED | REJECTED`
- Clusters: `AI_SUGGESTED → NEEDS_REVIEW → APPROVED | REJECTED | SPLIT | MERGED | ARCHIVED`
- Publications: `DRAFT → IN_REVIEW → READY → COPIED → PUBLISHED` (+ `FAILED`, `ARCHIVED`)

## Partial answer algorithm (MVP)

1. Operator marks parent `PARTIALLY_ANSWERED_LIVE`.
2. Optional: split into child Questions with individual statuses.
3. Unanswered children appear in unanswered inbox.
4. LiveAnswer on parent may have `completeness=PARTIAL`.

## Service ownership

`QuestionReviewService` / `QuestionQueueService` / `LiveAnswerService` / `PostLiveReviewService` own transition validation.

UI must not invent illegal transitions client-side only.
