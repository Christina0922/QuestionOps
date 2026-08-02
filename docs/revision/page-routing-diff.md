# Page & Routing Diff

## Current App Router (primary)

| Route | Purpose |
| --- | --- |
| `/` | Dashboard (entity counts) |
| `/problems/*` | Problem CRUD (hub) |
| `/evidence/*` | Evidence CRUD |
| `/clusters/*` | Cluster CRUD |
| `/knowledge/*` | Knowledge CRUD |
| `/capabilities/*` | Capability CRUD |
| `/youtube`, `/youtube/videos`, `/youtube/videos/[videoId]` | Video list + comments + analysis |
| `/settings/integrations/youtube` | OAuth connect |
| `/search`, `/activity` | Search + activity |

Auth: `/sign-in`, `/sign-up`.

## Target routes (spec §32)

| Route | Purpose | Phase |
| --- | --- | --- |
| `/dashboard` | Ops metrics (may keep `/` alias) | 7 |
| `/live-sessions` | Session list | 2 |
| `/live-sessions/new` | Create / import from YouTube | 2 |
| `/live-sessions/[sessionId]` | Session overview | 2 |
| `/live-sessions/[sessionId]/control` | Live moderator/speaker console | 3 |
| `/live-sessions/[sessionId]/submissions` | Raw submissions | 2 |
| `/live-sessions/[sessionId]/questions` | Question list / adjudication | 2 |
| `/live-sessions/[sessionId]/review` | Post-live review | 4 |
| `/live-sessions/[sessionId]/unanswered` | Unanswered inbox | 5 |
| `/live-sessions/[sessionId]/answers` | TextAnswer draft/approve | 5 |
| `/live-sessions/[sessionId]/publications` | Publication list | 6 |
| `/live-sessions/[sessionId]/publications/new` | Publication builder | 6 |
| `/live-sessions/[sessionId]/activity` | Session activity | 7 |
| `/knowledge`, `/knowledge/[id]` | Keep, retarget | 7 |
| `/capabilities`, `/capabilities/[id]` | Keep, retarget | 7 |
| `/search` | Expanded entities | 7 |
| `/settings/integrations/youtube` | Keep as data source | 1+ |
| `/settings/members`, `/settings/roles`, `/settings/templates` | BUILD_NEW | 8 |

## Sidebar diff (spec §33)

| Current | Target |
| --- | --- |
| Dashboard | Dashboard |
| Problems | **Live sessions** |
| Evidence | **Unanswered** (global or deep-link) |
| Clusters | **Answer review** |
| Knowledge | Knowledge |
| Capabilities | Capability |
| YouTube Videos | *(remove from primary)* |
| YouTube Connect | Settings → integrations |
| Search | Search |
| Activity | *(fold into settings or keep)* |
| — | Publications |

**Principle:** YouTube is a **data source**, not the product.

## Redirect / compatibility plan

| Old | Action |
| --- | --- |
| `/youtube/videos/[videoId]` | Redirect to LiveSession for that video if exists; else “create session from video” |
| `/youtube/videos` | Redirect → `/live-sessions` or settings |
| `/problems/*` | Hide from nav; soft-deprecate in Phase 2–3 |
| `/evidence/*`, `/clusters/*` | Hide from primary nav; keep APIs until cutover |
| `/` vs `/dashboard` | Prefer `/` rendering new dashboard; optional alias |

## Control screen requirements (`/control`)

Layout: Queue | Current question | Next / recent / status buttons.

Commands (buttons + shortcuts when focus not in input):

| Action | Shortcut |
| --- | --- |
| Answered live | A |
| Partial | P |
| Later / defer | L |
| Next | N |
| Duplicate | D |
| Important | I |
| Exclude | X |
| Undo | Z |

All transitions via Command APIs; optimistic UI with rollback.

## Mobile

Speaker/moderator buttons must be large on tablet/phone; minimize instructor typing (spec §11).
