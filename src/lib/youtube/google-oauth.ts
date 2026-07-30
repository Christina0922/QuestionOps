import { ApiError } from "@/lib/api-error";

const YOUTUBE_AUTH = "https://accounts.google.com/o/oauth2/v2/auth";
const YOUTUBE_TOKEN = "https://oauth2.googleapis.com/token";
const YOUTUBE_REVOKE = "https://oauth2.googleapis.com/revoke";
const YOUTUBE_API = "https://www.googleapis.com/youtube/v3";

/** Write endpoints must never be called in MVP. */
const WRITE_PATH_DENYLIST = [
  "/comments/insert",
  "/comments/update",
  "/comments/delete",
  "/comments/setModerationStatus",
  "/commentThreads/insert",
];

export const YOUTUBE_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/youtube.readonly",
  "https://www.googleapis.com/auth/youtube.force-ssl",
].join(" ");

export function isYouTubeOAuthConfigured() {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_REDIRECT_URI &&
      process.env.TOKEN_ENCRYPTION_KEY,
  );
}

export function getGoogleRedirectUri() {
  const uri = process.env.GOOGLE_REDIRECT_URI;
  if (!uri) throw ApiError.internal("GOOGLE_REDIRECT_URI is not configured");
  return uri;
}

export function buildGoogleAuthUrl(state: string, forceConsent = false) {
  if (!isYouTubeOAuthConfigured()) {
    throw ApiError.badRequest(
      "YouTube OAuth is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI, and TOKEN_ENCRYPTION_KEY.",
    );
  }

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: getGoogleRedirectUri(),
    response_type: "code",
    scope: YOUTUBE_SCOPES,
    access_type: "offline",
    include_granted_scopes: "true",
    state,
    prompt: forceConsent ? "consent" : "consent",
  });

  return `${YOUTUBE_AUTH}?${params.toString()}`;
}

export type GoogleTokenResponse = {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  token_type: string;
  id_token?: string;
};

export async function exchangeCodeForTokens(code: string): Promise<GoogleTokenResponse> {
  const body = new URLSearchParams({
    code,
    client_id: process.env.GOOGLE_CLIENT_ID!,
    client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    redirect_uri: getGoogleRedirectUri(),
    grant_type: "authorization_code",
  });

  const res = await fetch(YOUTUBE_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const json = (await res.json()) as GoogleTokenResponse & { error?: string; error_description?: string };
  if (!res.ok) {
    throw ApiError.badRequest(
      json.error_description || json.error || "Failed to exchange OAuth code",
    );
  }
  return json;
}

export async function refreshAccessToken(refreshToken: string): Promise<GoogleTokenResponse> {
  const body = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const res = await fetch(YOUTUBE_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const json = (await res.json()) as GoogleTokenResponse & {
    error?: string;
    error_description?: string;
  };

  if (!res.ok) {
    if (json.error === "invalid_grant") {
      throw new ApiError(
        403,
        "REAUTH_REQUIRED",
        "YouTube connection expired. Please reconnect your channel.",
      );
    }
    throw ApiError.badRequest(
      json.error_description || json.error || "Failed to refresh YouTube token",
    );
  }
  return json;
}

export async function revokeGoogleToken(token: string): Promise<void> {
  try {
    await fetch(`${YOUTUBE_REVOKE}?token=${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
  } catch {
    // best-effort
  }
}

export type YoutubeChannelApiResult = {
  id: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  customUrl?: string;
  publishedAt?: string;
  subscriberCount?: number;
  videoCount?: number;
  viewCount?: bigint;
  uploadsPlaylistId?: string;
};

export type YoutubeVideoApiResult = {
  id: string;
  channelId: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  publishedAt?: string;
  duration?: string;
  viewCount?: bigint;
  likeCount?: number;
  commentCount?: number;
  commentsEnabled: boolean;
};

function assertNotWritePath(path: string) {
  const normalized = path.split("?")[0] ?? path;
  for (const denied of WRITE_PATH_DENYLIST) {
    if (normalized.includes(denied) || normalized.endsWith(denied.replace(/^\//, ""))) {
      throw ApiError.forbidden("YouTube write APIs are disabled in MVP");
    }
  }
}

export async function youtubeApiGet<T>(
  path: string,
  accessToken: string,
  query: Record<string, string>,
): Promise<T> {
  assertNotWritePath(path);
  const url = new URL(`${YOUTUBE_API}${path.startsWith("/") ? path : `/${path}`}`);
  Object.entries(query).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const json = (await res.json()) as T & {
    error?: { code?: number; message?: string; errors?: Array<{ reason?: string }> };
  };

  if (!res.ok) {
    const reason = json.error?.errors?.[0]?.reason;
    const message = json.error?.message || "YouTube API request failed";
    if (res.status === 401) {
      throw new ApiError(
        403,
        "REAUTH_REQUIRED",
        "YouTube connection expired. Please reconnect.",
        { reason },
      );
    }
    throw ApiError.badRequest(message, { code: reason || "YOUTUBE_API_ERROR" });
  }

  return json;
}

export async function fetchMineChannel(
  accessToken: string,
): Promise<YoutubeChannelApiResult | null> {
  const data = await youtubeApiGet<{
    items?: Array<{
      id: string;
      snippet?: {
        title?: string;
        description?: string;
        customUrl?: string;
        publishedAt?: string;
        thumbnails?: { default?: { url?: string }; medium?: { url?: string } };
      };
      statistics?: {
        subscriberCount?: string;
        videoCount?: string;
        viewCount?: string;
      };
      contentDetails?: {
        relatedPlaylists?: { uploads?: string };
      };
    }>;
  }>(
    "/channels",
    accessToken,
    { part: "snippet,statistics,contentDetails", mine: "true" },
  );

  const item = data.items?.[0];
  if (!item) return null;

  return {
    id: item.id,
    title: item.snippet?.title || "YouTube Channel",
    description: item.snippet?.description,
    thumbnailUrl:
      item.snippet?.thumbnails?.medium?.url ||
      item.snippet?.thumbnails?.default?.url,
    customUrl: item.snippet?.customUrl,
    publishedAt: item.snippet?.publishedAt,
    subscriberCount: item.statistics?.subscriberCount
      ? Number(item.statistics.subscriberCount)
      : undefined,
    videoCount: item.statistics?.videoCount
      ? Number(item.statistics.videoCount)
      : undefined,
    viewCount: item.statistics?.viewCount
      ? BigInt(item.statistics.viewCount)
      : undefined,
    uploadsPlaylistId: item.contentDetails?.relatedPlaylists?.uploads,
  };
}

function mapVideoItem(item: {
  id: string;
  snippet?: {
    channelId?: string;
    title?: string;
    description?: string;
    publishedAt?: string;
    thumbnails?: { medium?: { url?: string }; default?: { url?: string } };
  };
  contentDetails?: { duration?: string };
  statistics?: {
    viewCount?: string;
    likeCount?: string;
    commentCount?: string;
  };
  status?: { privacyStatus?: string };
}): YoutubeVideoApiResult {
  const commentsEnabled =
    item.statistics?.commentCount !== undefined ||
    item.status?.privacyStatus === "public";

  return {
    id: item.id,
    channelId: item.snippet?.channelId || "",
    title: item.snippet?.title || "Untitled video",
    description: item.snippet?.description,
    thumbnailUrl:
      item.snippet?.thumbnails?.medium?.url ||
      item.snippet?.thumbnails?.default?.url,
    publishedAt: item.snippet?.publishedAt,
    duration: item.contentDetails?.duration,
    viewCount: item.statistics?.viewCount
      ? BigInt(item.statistics.viewCount)
      : undefined,
    likeCount: item.statistics?.likeCount
      ? Number(item.statistics.likeCount)
      : undefined,
    commentCount: item.statistics?.commentCount
      ? Number(item.statistics.commentCount)
      : undefined,
    commentsEnabled:
      item.statistics?.commentCount !== undefined
        ? true
        : commentsEnabled,
  };
}

export async function fetchVideosByIds(
  accessToken: string,
  videoIds: string[],
): Promise<YoutubeVideoApiResult[]> {
  if (videoIds.length === 0) return [];
  const data = await youtubeApiGet<{
    items?: Array<Parameters<typeof mapVideoItem>[0]>;
  }>("/videos", accessToken, {
    part: "snippet,contentDetails,statistics,status",
    id: videoIds.join(","),
  });
  return (data.items ?? []).map(mapVideoItem);
}

export async function fetchUploadsPlaylistPage(
  accessToken: string,
  playlistId: string,
  pageToken?: string,
): Promise<{ videoIds: string[]; nextPageToken?: string }> {
  const query: Record<string, string> = {
    part: "contentDetails",
    playlistId,
    maxResults: "50",
  };
  if (pageToken) query.pageToken = pageToken;

  const data = await youtubeApiGet<{
    nextPageToken?: string;
    items?: Array<{ contentDetails?: { videoId?: string } }>;
  }>("/playlistItems", accessToken, query);

  const videoIds = (data.items ?? [])
    .map((i) => i.contentDetails?.videoId)
    .filter((id): id is string => Boolean(id));

  return { videoIds, nextPageToken: data.nextPageToken };
}

export async function fetchGoogleAccountEmail(accessToken: string): Promise<{
  id?: string;
  email?: string;
}> {
  const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return {};
  const json = (await res.json()) as { sub?: string; email?: string };
  return { id: json.sub, email: json.email };
}
