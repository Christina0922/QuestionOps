import type { QuestionStatus } from "@prisma/client";

const ALLOWED: Record<string, QuestionStatus[]> = {
  DETECTED: ["NEEDS_REVIEW", "ACCEPTED", "REJECTED", "EXCLUDED", "DUPLICATE"],
  NEEDS_REVIEW: ["ACCEPTED", "REJECTED", "EXCLUDED", "DUPLICATE"],
  ACCEPTED: ["WAITING", "QUEUED", "EXCLUDED"],
  WAITING: ["QUEUED", "UNANSWERED", "EXCLUDED"],
  QUEUED: [
    "ASSIGNED",
    "PRESENTED_TO_SPEAKER",
    "UNANSWERED",
    "EXCLUDED",
    "DUPLICATE",
  ],
  ASSIGNED: ["PRESENTED_TO_SPEAKER", "QUEUED", "UNANSWERED"],
  PRESENTED_TO_SPEAKER: ["ANSWERING_LIVE", "QUEUED", "UNANSWERED"],
  ANSWERING_LIVE: [
    "ANSWERED_LIVE",
    "PARTIALLY_ANSWERED_LIVE",
    "UNANSWERED",
  ],
  ANSWERED_LIVE: ["POST_REVIEW_PENDING", "RESOLVED", "ARCHIVED"],
  PARTIALLY_ANSWERED_LIVE: [
    "POST_REVIEW_PENDING",
    "ANSWER_DRAFTED",
    "UNANSWERED",
    "ANSWERED_LIVE",
  ],
  UNANSWERED: [
    "POST_REVIEW_PENDING",
    "ANSWER_DRAFTED",
    "QUEUED",
    "EXCLUDED",
  ],
  POST_REVIEW_PENDING: [
    "ANSWERED_LIVE",
    "PARTIALLY_ANSWERED_LIVE",
    "UNANSWERED",
    "ANSWER_DRAFTED",
  ],
  ANSWER_DRAFTED: ["ANSWER_IN_REVIEW", "UNANSWERED"],
  ANSWER_IN_REVIEW: ["ANSWER_APPROVED", "ANSWER_DRAFTED", "UNANSWERED"],
  ANSWER_APPROVED: ["READY_TO_PUBLISH", "ANSWER_IN_REVIEW"],
  READY_TO_PUBLISH: ["PUBLISHED", "ANSWER_APPROVED"],
  PUBLISHED: ["RESOLVED", "ARCHIVED"],
  RESOLVED: ["ARCHIVED"],
  REJECTED: ["ARCHIVED", "NEEDS_REVIEW"],
  DUPLICATE: ["ARCHIVED", "NEEDS_REVIEW"],
  EXCLUDED: ["ARCHIVED", "NEEDS_REVIEW"],
  ARCHIVED: [],
};

export function canTransition(
  from: QuestionStatus,
  to: QuestionStatus,
): boolean {
  if (from === to) return true;
  return (ALLOWED[from] ?? []).includes(to);
}

export function assertTransition(from: QuestionStatus, to: QuestionStatus) {
  if (!canTransition(from, to)) {
    throw new Error(`Illegal question transition: ${from} → ${to}`);
  }
}
