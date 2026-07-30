import { createHash } from "crypto";
import type { CommentClassification, CommentSentiment } from "@prisma/client";

export type ClassifyResult = {
  classification: CommentClassification;
  sentiment: CommentSentiment;
  urgency: number;
  confidence: number;
};

const RULES: Array<{
  classification: CommentClassification;
  sentiment?: CommentSentiment;
  urgency?: number;
  patterns: RegExp[];
}> = [
  {
    classification: "SPAM",
    sentiment: "NEUTRAL",
    urgency: 1,
    patterns: [/subscribe/i, /구독/, /click here/i, /무료.*코인/, /http.*bit\.ly/i],
  },
  {
    classification: "BUG_REPORT",
    sentiment: "NEGATIVE",
    urgency: 4,
    patterns: [/bug/i, /crash/i, /error/i, /오류/, /버그/, /꺼져/, /죽어/, /안\s?돼/, /doesn't work/i],
  },
  {
    classification: "COMPLAINT",
    sentiment: "NEGATIVE",
    urgency: 3,
    patterns: [/너무/, /terrible/i, /worst/i, /hate/i, /광고.*많/, /실망/, /불만/],
  },
  {
    classification: "CHURN_RISK",
    sentiment: "NEGATIVE",
    urgency: 5,
    patterns: [/환불/, /refund/i, /cancel/i, /해지/, /그만둘/, /unsubscribe/i],
  },
  {
    classification: "PURCHASE_INTENT",
    sentiment: "POSITIVE",
    urgency: 3,
    patterns: [/buy/i, /구매/, /가격/, /price/i, /how much/i, /얼마/],
  },
  {
    classification: "REQUEST",
    sentiment: "NEUTRAL",
    urgency: 3,
    patterns: [/주세요/, /please/i, /링크/, /link/i, /알려/, /how (do|can) i/i],
  },
  {
    classification: "QUESTION",
    sentiment: "NEUTRAL",
    urgency: 2,
    patterns: [/\?/, /어떻게/, /뭐예요/, /why/i, /what/i, /언제/, /어디/],
  },
  {
    classification: "SUGGESTION",
    sentiment: "NEUTRAL",
    urgency: 2,
    patterns: [/suggest/i, /했으면/, /추가해/, /would be better/i, /개선/],
  },
  {
    classification: "CONFUSION",
    sentiment: "MIXED",
    urgency: 3,
    patterns: [/헷갈/, /confused/i, /모르겠/, /이해가\s?안/, /unclear/i],
  },
  {
    classification: "PRAISE",
    sentiment: "POSITIVE",
    urgency: 1,
    patterns: [/도움/, /thanks/i, /감사/, /great/i, /awesome/i, /최고/, /love/i, /helpful/i],
  },
];

export function hashCommentContent(text: string): string {
  return createHash("sha256").update(text.trim()).digest("hex").slice(0, 32);
}

export function classifyCommentHeuristic(text: string): ClassifyResult {
  const normalized = text.trim();
  if (!normalized) {
    return {
      classification: "UNKNOWN",
      sentiment: "UNKNOWN",
      urgency: 1,
      confidence: 0.2,
    };
  }

  for (const rule of RULES) {
    if (rule.patterns.some((p) => p.test(normalized))) {
      return {
        classification: rule.classification,
        sentiment: rule.sentiment ?? "NEUTRAL",
        urgency: rule.urgency ?? 2,
        confidence: 0.72,
      };
    }
  }

  return {
    classification: "OTHER",
    sentiment: "NEUTRAL",
    urgency: 2,
    confidence: 0.45,
  };
}

export function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((t) => t.length > 1),
  );
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter += 1;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

export type ClusterSeed = {
  commentIds: string[];
  texts: string[];
  classification: CommentClassification;
};

/** Group by classification, then merge similar texts (Jaccard ≥ threshold). */
export function formClusters(
  items: Array<{
    id: string;
    text: string;
    classification: CommentClassification;
  }>,
  threshold = 0.18,
): ClusterSeed[] {
  const byClass = new Map<CommentClassification, typeof items>();
  for (const item of items) {
    const list = byClass.get(item.classification) ?? [];
    list.push(item);
    byClass.set(item.classification, list);
  }

  const clusters: ClusterSeed[] = [];

  for (const [classification, group] of byClass) {
    const buckets: Array<{
      ids: string[];
      texts: string[];
      tokens: Set<string>;
    }> = [];

    for (const item of group) {
      const tokens = tokenize(item.text);
      let placed = false;
      for (const bucket of buckets) {
        if (jaccard(tokens, bucket.tokens) >= threshold) {
          bucket.ids.push(item.id);
          bucket.texts.push(item.text);
          for (const t of tokens) bucket.tokens.add(t);
          placed = true;
          break;
        }
      }
      if (!placed) {
        buckets.push({
          ids: [item.id],
          texts: [item.text],
          tokens,
        });
      }
    }

    for (const bucket of buckets) {
      if (bucket.ids.length === 0) continue;
      clusters.push({
        commentIds: bucket.ids,
        texts: bucket.texts,
        classification,
      });
    }
  }

  return clusters.sort((a, b) => b.commentIds.length - a.commentIds.length);
}

export function nameClusterTemplate(seed: ClusterSeed): {
  name: string;
  summary: string;
} {
  const label = seed.classification.replaceAll("_", " ").toLowerCase();
  const sample = seed.texts[0]?.slice(0, 60) ?? label;
  return {
    name: `${seed.classification}: ${sample}${sample.length >= 60 ? "…" : ""}`,
    summary: [
      `AI cluster (${label}) with ${seed.commentIds.length} comment(s).`,
      "",
      ...seed.texts.slice(0, 8).map((t, i) => `- [${i + 1}] ${t}`),
      seed.texts.length > 8 ? `- …and ${seed.texts.length - 8} more` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  };
}
