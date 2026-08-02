# Removal Candidates

Items that **conflict with the new product core** or should leave MVP priority.

## Product framing / copy

- Tagline “Evidence → Capability” / Problem-centric README flows
- Docs that describe MVP as “comment analysis → AI answers → post replies”
- Any UI copy implying auto-reply chatbot

## Features to remove from MVP path (or hard-defer)

| Feature | Why |
| --- | --- |
| Bulk comment → Evidence conversion | Spec §3 — Evidence ≠ every comment |
| YouTube analysis panel as primary UX | Replaced by LiveSession control/review |
| Auto Knowledge from comment clusters | Spec §24 promotion rules |
| Auto Capability from comment clusters | Spec §25 SOP definition |
| AI auto-finalizing question status | Spec §30 — suggestions only |
| AI / system auto-publish to channels | Spec §23 — copy-first MVP |
| Sentiment / purchase / churn dashboards | Spec §31 |
| Comment insight charts as core metrics | Spec §26 |
| Problem as required hub for all work | Spec §2 / §4 LiveSession-first |
| Primary nav “YouTube Videos” | Spec §33 — YouTube is settings/source |

## Code / routes (deprecate schedule)

| Path | Phase to hide | Delete earliest |
| --- | --- | --- |
| `youtube-analysis-panel.tsx` | 2–3 | After review/control ships |
| `.../comments/to-evidence` | 1 (feature flag off) | Phase 8 |
| `analysis-service` candidate→capability | 1 | Phase 8 |
| `/problems` primary nav | 2 | Optional keep legacy |
| `/clusters` as Evidence clusters | 2 | After QuestionCluster |
| Sentiment-first `CommentClassification` usage in dashboard | 1 | — |

## Data models (do not drop immediately)

Safe to **stop writing** early; **drop tables** only post-acceptance:

- `YouTubeVideoAnalysis`
- `YouTubeAnalysisCluster`
- `YouTubeKnowledgeCandidate`
- `YouTubeCapabilityCandidate`

Keep:

- `YouTubeConnection`, `YouTubeChannel`, `YouTubeVideo`, `YouTubeComment`, `YouTubeSyncJob`, `YouTubeApiQuotaEvent`

## AI taxonomy downscope

Defer or non-core:

- POSITIVE/NEGATIVE ratio widgets  
- PURCHASE_INTENT / CHURN_RISK driven workflows  

Keep lightweight:

- Spam / abuse heuristics  
- Urgent technical issue flag  
- Question vs non-question recommendation  

## Explicit non-goals (remain)

- Auto-reply to YouTube  
- Live chat moderation writes to YouTube  
- Competitor scraping  
- Kakao/YouTube/email/LMS auto-send in MVP  

## KEEP list (do not remove)

Login, Organization isolation, YouTube OAuth, channel connect, video list (as import source), raw comment/chat collection, job progress pattern, Activity log basis, Search provider, AI provider abstraction, Zod, i18n, token encryption.
