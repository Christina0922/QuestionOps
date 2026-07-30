import { describe, expect, it } from "vitest";
import { detectCommentLanguage } from "@/lib/youtube/language";

describe("detectCommentLanguage", () => {
  it("detects Korean", () => {
    expect(detectCommentLanguage("자막이 너무 빨라요")).toBe("ko");
  });

  it("detects English", () => {
    expect(detectCommentLanguage("The subtitles move too fast.")).toBe("en");
  });

  it("handles empty", () => {
    expect(detectCommentLanguage("")).toBe("unknown");
  });
});
