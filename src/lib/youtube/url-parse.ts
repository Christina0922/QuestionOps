import { ApiError } from "@/lib/api-error";

const VIDEO_ID_RE = /^[a-zA-Z0-9_-]{11}$/;

/**
 * Extract a YouTube video ID from common URL forms or a bare ID.
 * Supports watch, youtu.be, shorts, embed, and live paths.
 */
export function extractYouTubeVideoId(input: string): string {
  const raw = input.trim();
  if (!raw) {
    throw ApiError.badRequest("Video URL or ID is required");
  }

  if (VIDEO_ID_RE.test(raw)) {
    return raw;
  }

  let url: URL;
  try {
    url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
  } catch {
    throw ApiError.badRequest("Unsupported or invalid YouTube URL");
  }

  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  const allowed = new Set([
    "youtube.com",
    "m.youtube.com",
    "music.youtube.com",
    "youtu.be",
    "youtube-nocookie.com",
  ]);

  if (!allowed.has(host)) {
    throw ApiError.badRequest("Only YouTube URLs are supported");
  }

  if (host === "youtu.be") {
    const id = url.pathname.split("/").filter(Boolean)[0] ?? "";
    if (!VIDEO_ID_RE.test(id)) {
      throw ApiError.badRequest("Could not find a valid video ID in the URL");
    }
    return id;
  }

  const v = url.searchParams.get("v");
  if (v && VIDEO_ID_RE.test(v)) {
    return v;
  }

  const parts = url.pathname.split("/").filter(Boolean);
  const markers = ["shorts", "embed", "live", "v"];
  for (let i = 0; i < parts.length - 1; i++) {
    if (markers.includes(parts[i]!) && VIDEO_ID_RE.test(parts[i + 1]!)) {
      return parts[i + 1]!;
    }
  }

  throw ApiError.badRequest("Could not find a valid video ID in the URL");
}

export function buildYouTubeWatchUrl(videoId: string) {
  return `https://www.youtube.com/watch?v=${videoId}`;
}
