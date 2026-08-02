import { describe, expect, it } from "vitest";
import { canTransition } from "@/lib/live/question-transitions";
import { detectMessageType } from "@/lib/live/detect-question";

describe("question transitions", () => {
  it("allows answering live from answering", () => {
    expect(canTransition("ANSWERING_LIVE", "ANSWERED_LIVE")).toBe(true);
    expect(canTransition("ANSWERING_LIVE", "PARTIALLY_ANSWERED_LIVE")).toBe(
      true,
    );
  });

  it("forbids publish from detected", () => {
    expect(canTransition("DETECTED", "PUBLISHED")).toBe(false);
    expect(canTransition("REJECTED", "ANSWERED_LIVE")).toBe(false);
  });
});

describe("detectMessageType", () => {
  it("flags questions", () => {
    const r = detectMessageType("초보자도 가능한가요?");
    expect(r.isQuestionCandidate).toBe(true);
    expect(r.messageType).toBe("QUESTION");
  });

  it("flags spam", () => {
    expect(detectMessageType("구독하고 무료 코인 받기").messageType).toBe(
      "SPAM",
    );
  });
});
