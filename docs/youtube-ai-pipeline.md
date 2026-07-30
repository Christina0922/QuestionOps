# YouTube AI Pipeline

## Principle

Do **not** stuff 1,000 comments into one prompt. Pipeline stages are separate jobs/steps with Zod-validated outputs and review status.

## Stages

1. Preprocess (normalize whitespace, URLs, spam heuristics)
2. Language detect
3. Translate (optional cache to `translatedTextKo` / `translatedTextEn`)
4. Classify type / sentiment / urgency / confidence
5. Embeddings (batch)
6. Cluster formation (similarity + LLM naming)
7. Cluster summary with supporting comment IDs
8. Knowledge draft (requires ≥1 supporting evidence/comment)
9. Capability candidates
10. User approval (`AI_GENERATED` → `APPROVED` / `REJECTED`)

## Providers

```text
AIProvider
TranslationProvider
EmbeddingProvider
ClassificationProvider
ClusteringProvider
KnowledgeDraftProvider
```

Implementations: `OpenAI*` + `Mock*` (default when `OPENAI_API_KEY` empty or `AI_PROVIDER=mock`).

## Prompts

```text
src/prompts/youtube/
  classify-comment.ts
  summarize-cluster.ts
  generate-knowledge.ts
  generate-capability.ts
  translate-comment.ts
```

Each exports `{ promptVersion, model, buildMessages(input), outputSchema }`.

## Cost guards

- Per-video max comments analyzed (default 500 of 1000 imported)
- Skip re-analysis when content hash + promptVersion unchanged
- Cache translations & embeddings
- Show estimated range before run (structure in Y6/Y7)

## Multilingual clustering

Embeddings should be multilingual (or translate-to-pivot then embed). Same semantic cluster can mix KO/EN/JA; UI shows original + selected translation view mode.

## Alternatives

- Single-shot LLM clustering only — cheaper to build, worse scale/cost. Deferred as optional heuristic after embeddings.

## Risks

- Hallucinated summaries without evidence — blocked by schema requiring `supportingCommentIds.length >= 1`
- Mock vs real drift — contract tests on Zod schemas
