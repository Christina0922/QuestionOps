import { describe, expect, it } from "vitest";
import { extractYouTubeVideoId } from "@/lib/youtube/url-parse";

describe("extractYouTubeVideoId", () => {
  it("parses watch, short, and bare ids", () => {
    expect(
      extractYouTubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ"),
    ).toBe("dQw4w9WgXcQ");
    expect(extractYouTubeVideoId("https://youtu.be/dQw4w9WgXcQ")).toBe(
      "dQw4w9WgXcQ",
    );
    expect(
      extractYouTubeVideoId("https://www.youtube.com/shorts/dQw4w9WgXcQ"),
    ).toBe("dQw4w9WgXcQ");
    expect(extractYouTubeVideoId("dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("rejects unsupported hosts", () => {
    expect(() =>
      extractYouTubeVideoId("https://vimeo.com/123456"),
    ).toThrow(/Only YouTube/);
  });
});
