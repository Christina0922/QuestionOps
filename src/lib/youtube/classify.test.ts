import { describe, expect, it } from "vitest";
import {
  classifyCommentHeuristic,
  formClusters,
  hashCommentContent,
} from "@/lib/youtube/classify";

describe("classifyCommentHeuristic", () => {
  it("detects bug reports", () => {
    expect(classifyCommentHeuristic("앱이 자꾸 꺼져요").classification).toBe(
      "BUG_REPORT",
    );
  });

  it("detects questions", () => {
    expect(classifyCommentHeuristic("다음 영상은 언제 나오나요?").classification).toBe(
      "QUESTION",
    );
  });

  it("hashes content stably", () => {
    expect(hashCommentContent("a")).toBe(hashCommentContent("a"));
  });
});

describe("formClusters", () => {
  it("groups similar comments", () => {
    const clusters = formClusters([
      { id: "1", text: "login error happens", classification: "BUG_REPORT" },
      { id: "2", text: "login error again", classification: "BUG_REPORT" },
      { id: "3", text: "great video thanks", classification: "PRAISE" },
    ]);
    expect(clusters.length).toBeGreaterThanOrEqual(2);
    const bug = clusters.find((c) => c.classification === "BUG_REPORT");
    expect(bug?.commentIds.length).toBeGreaterThanOrEqual(1);
  });
});
