# Reusable Components & Patterns

## KEEP (use as foundation)

| Pattern | Location | Reuse as |
| --- | --- | --- |
| `getAuthContext` + org scope | `src/lib/auth.ts` | All new services |
| `createApiHandler` / Zod parse | `src/lib/api-handler.ts` | Command APIs |
| Repository → Service → Route | `src/repositories/*`, `src/services/*` | LiveSession* services |
| Soft delete `deletedAt` | Prisma models | New domain models |
| Activity logging | `activity-repository` | Expanded lecture actions |
| SearchProvider abstraction | `search-service.ts` | New entity types |
| OpenAI client + template fallback | `src/services/ai/openai-client.ts` | Answer drafts |
| Token encryption | `src/lib/youtube/crypto.ts` | Keep YouTube OAuth |
| OAuth connect UI | settings YouTube page | Settings only |
| Durable job + poll | `YouTubeSyncJob` + `/api/youtube/jobs/[jobId]` | Post-live pipeline |
| i18n typed KO/EN | `src/i18n/*` | New copy |
| UI primitives | `src/components/ui/*` | Control / review screens |
| React Query hooks pattern | `src/hooks/use-*.ts` | Session hooks |
| Dev auth bypass | env + middleware | Local without Clerk |

## ADAPT (modify, don’t rewrite)

| Asset | Adaptation |
| --- | --- |
| Dashboard service/view | Ops metrics |
| Knowledge CRUD + draft API | Promotion + official status |
| Capability CRUD | SOP framing |
| Cluster draft prompts | QuestionCluster naming suggestions |
| YouTube comment import | Feed Submission + LiveSession |
| Video list | “Create LiveSession from video” |
| `AiReviewStatus` | Matches / clusters / drafts |
| Sidebar / tagline | Spec §33 |
| Activity entityType strings | Lecture entities |
| Seed | LiveSession scenarios (spec §39) |

## Useful UI building blocks

- `PageHeader`, `ListSkeleton`, `EmptyState`, `Badge`, `Button`, `Card`, `Select`, `Input`
- Evidence/Knowledge form patterns → TextAnswer editor (autosave)
- YouTube job progress bar → post-live pipeline progress
- Analysis approve/reject cards → question review / match review cards (retargeted)

## Service list to add (spec §36)

Build new, calling repos only:

- LiveSessionService  
- SubmissionImportService  
- QuestionDetectionService  
- QuestionReviewService  
- QuestionQueueService  
- QuestionMergeService  
- LiveAnswerService  
- TranscriptService  
- QuestionAnswerMatchingService  
- PostLiveReviewService  
- TextAnswerService  
- PublicationService  
- KnowledgePromotionService  
- CapabilityService (extend existing)

## Test harness reuse

- Vitest + mocked repositories (`problem-service.test.ts` style) for state machine tests.
- Keep crypto/url-parse tests; add classify→question-detection tests separately.
