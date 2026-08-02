import type { MessageType } from "@prisma/client";

export type DetectionResult = {
  messageType: MessageType;
  isQuestionCandidate: boolean;
  confidence: number;
};

const SPAM = [/subscribe/i, /구독/, /http.*bit\.ly/i, /무료.*코인/];
const TECH = [/오류/, /버그/, /error/i, /crash/i, /안\s?돼/, /접속/];
const PRAISE = [/감사/, /thanks/i, /최고/, /great/i, /도움/];
const COMPLAINT = [/불만/, /실망/, /terrible/i, /환불/, /refund/i];
const QUESTION = [
  /\?/,
  /인가요/,
  /인가요\?/,
  /어떻게/,
  /얼마/,
  /언제/,
  /뭐예요/,
  /무엇/,
  /possible/i,
  /how (do|can|much)/i,
  /what/i,
  /when/i,
  /why/i,
];

export function detectMessageType(text: string): DetectionResult {
  const t = text.trim();
  if (!t) {
    return {
      messageType: "OTHER",
      isQuestionCandidate: false,
      confidence: 0.2,
    };
  }
  if (SPAM.some((p) => p.test(t))) {
    return { messageType: "SPAM", isQuestionCandidate: false, confidence: 0.85 };
  }
  if (TECH.some((p) => p.test(t))) {
    return {
      messageType: "TECHNICAL_ISSUE",
      isQuestionCandidate: true,
      confidence: 0.75,
    };
  }
  if (COMPLAINT.some((p) => p.test(t))) {
    return {
      messageType: "COMPLAINT",
      isQuestionCandidate: /환불|refund|\?/.test(t),
      confidence: 0.7,
    };
  }
  if (PRAISE.some((p) => p.test(t)) && !QUESTION.some((p) => p.test(t))) {
    return {
      messageType: "PRAISE",
      isQuestionCandidate: false,
      confidence: 0.7,
    };
  }
  if (QUESTION.some((p) => p.test(t))) {
    return {
      messageType: "QUESTION",
      isQuestionCandidate: true,
      confidence: 0.8,
    };
  }
  return {
    messageType: "CHAT",
    isQuestionCandidate: false,
    confidence: 0.55,
  };
}
