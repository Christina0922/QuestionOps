import { ApiError } from "@/lib/api-error";
import {
  decryptSecret,
  encryptSecret,
  generateOAuthNonce,
  signPayload,
  verifySignedPayload,
} from "@/lib/youtube/crypto";
import {
  buildGoogleAuthUrl,
  exchangeCodeForTokens,
  fetchGoogleAccountEmail,
  fetchMineChannel,
  isYouTubeOAuthConfigured,
  refreshAccessToken,
  revokeGoogleToken,
} from "@/lib/youtube/google-oauth";
import { getMissingYouTubeEnv } from "@/lib/youtube/env";
import { activityRepository } from "@/repositories/activity-repository";
import {
  youTubeChannelRepository,
  youTubeConnectionRepository,
  youTubeSyncJobRepository,
} from "@/repositories/youtube-repository";
import type { AuthContext } from "@/types";

const STATE_TTL_MS = 10 * 60 * 1000;

export type YouTubeStatusDto = {
  configured: boolean;
  missingEnv: string[];
  mockMode: boolean;
  connected: boolean;
  status: string | null;
  googleAccountEmail: string | null;
  channel: {
    id: string;
    youtubeChannelId: string;
    title: string;
    description: string | null;
    thumbnailUrl: string | null;
    customUrl: string | null;
    subscriberCount: number | null;
    videoCount: number | null;
    viewCount: string | null;
    lastSyncedAt: string | null;
  } | null;
  lastConnectedAt: string | null;
  lastRefreshedAt: string | null;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
  reauthRequired: boolean;
};

function isMockMode() {
  return process.env.YOUTUBE_MOCK_OAUTH === "true";
}

export class YouTubeConnectionService {
  getStatus = async (organizationId: string): Promise<YouTubeStatusDto> => {
    const missingEnv = getMissingYouTubeEnv();
    const configured = isYouTubeOAuthConfigured();
    const mockMode = isMockMode();
    const connection =
      await youTubeConnectionRepository.findByOrganization(organizationId);

    const channel = connection?.channels[0] ?? null;
    const status = connection?.status ?? null;
    const connected = status === "CONNECTED" || status === "ERROR";

    return {
      configured: configured || mockMode,
      missingEnv,
      mockMode,
      connected: Boolean(connection && connected),
      status,
      googleAccountEmail: connection?.googleAccountEmail ?? null,
      channel: channel
        ? {
            id: channel.id,
            youtubeChannelId: channel.youtubeChannelId,
            title: channel.title,
            description: channel.description,
            thumbnailUrl: channel.thumbnailUrl,
            customUrl: channel.customUrl,
            subscriberCount: channel.subscriberCount,
            videoCount: channel.videoCount,
            viewCount:
              channel.viewCount === null || channel.viewCount === undefined
                ? null
                : channel.viewCount.toString(),
            lastSyncedAt: channel.lastSyncedAt?.toISOString() ?? null,
          }
        : null,
      lastConnectedAt: connection?.lastConnectedAt?.toISOString() ?? null,
      lastRefreshedAt: connection?.lastRefreshedAt?.toISOString() ?? null,
      lastErrorCode: connection?.lastErrorCode ?? null,
      lastErrorMessage: connection?.lastErrorMessage ?? null,
      reauthRequired: status === "REAUTH_REQUIRED" || status === "REVOKED",
    };
  };

  createConnectState(auth: AuthContext, forceConsent = false) {
    if (!isYouTubeOAuthConfigured() && !isMockMode()) {
      throw ApiError.badRequest(
        "YouTube OAuth is not configured. Ask the operator to set Google OAuth environment variables.",
        { missingEnv: getMissingYouTubeEnv() },
      );
    }

    if (isMockMode() && !isYouTubeOAuthConfigured()) {
      return { mode: "mock" as const };
    }

    const nonce = generateOAuthNonce();
    const payload = JSON.stringify({
      nonce,
      organizationId: auth.organizationId,
      userId: auth.userId,
      ts: Date.now(),
      forceConsent,
    });
    const state = `${Buffer.from(payload).toString("base64url")}.${signPayload(payload)}`;
    const url = buildGoogleAuthUrl(state, forceConsent);
    return { mode: "oauth" as const, state, url, nonce };
  }

  async completeMockConnect(auth: AuthContext) {
    const connection = await youTubeConnectionRepository.upsertConnection({
      organizationId: auth.organizationId,
      userId: auth.userId,
      googleAccountId: "mock-google-account",
      googleAccountEmail: "mock-youtube@example.com",
      encryptedAccessToken: null,
      encryptedRefreshToken: null,
      accessTokenExpiresAt: null,
      scope: "mock",
      status: "CONNECTED",
      lastErrorCode: null,
      lastErrorMessage: null,
      lastConnectedAt: new Date(),
      revokedAt: null,
    });

    const channel = await youTubeChannelRepository.upsert({
      organizationId: auth.organizationId,
      connectionId: connection.id,
      youtubeChannelId: "UC_MOCK_CHANNEL",
      title: "Mock YouTube Channel",
      description: "Seeded mock channel for local development",
      thumbnailUrl: "https://via.placeholder.com/88",
      customUrl: "@mockchannel",
      publishedAt: new Date("2024-01-01"),
      subscriberCount: 1234,
      videoCount: 42,
      viewCount: BigInt(567890),
      uploadsPlaylistId: "UU_MOCK_UPLOADS",
      lastSyncedAt: new Date(),
    });

    await youTubeSyncJobRepository.create({
      organizationId: auth.organizationId,
      connectionId: connection.id,
      channelId: channel.id,
      jobType: "CHANNEL_SYNC",
      status: "COMPLETED",
    });

    await activityRepository.create({
      organizationId: auth.organizationId,
      userId: auth.userId,
      action: "CREATE",
      entityType: "youtube_connection",
      entityId: connection.id,
      summary: "Connected YouTube channel (mock)",
    });

    return this.getStatus(auth.organizationId);
  }

  parseAndValidateState(state: string, expectedOrganizationId?: string) {
    const [payloadB64, signature] = state.split(".");
    if (!payloadB64 || !signature) {
      throw ApiError.badRequest("Invalid OAuth state");
    }
    let payload: string;
    try {
      payload = Buffer.from(payloadB64, "base64url").toString("utf8");
    } catch {
      throw ApiError.badRequest("Invalid OAuth state encoding");
    }
    if (!verifySignedPayload(payload, signature)) {
      throw ApiError.badRequest("OAuth state signature mismatch");
    }

    const data = JSON.parse(payload) as {
      nonce: string;
      organizationId: string;
      userId: string;
      ts: number;
      forceConsent?: boolean;
    };

    if (Date.now() - data.ts > STATE_TTL_MS) {
      throw ApiError.badRequest("OAuth state expired. Please try connecting again.");
    }
    if (
      expectedOrganizationId &&
      data.organizationId !== expectedOrganizationId
    ) {
      throw ApiError.forbidden("OAuth state does not match organization");
    }
    return data;
  }

  async handleCallback(input: {
    code?: string | null;
    state?: string | null;
    error?: string | null;
    auth: AuthContext;
  }) {
    if (input.error === "access_denied") {
      throw ApiError.badRequest("YouTube connection was cancelled.");
    }
    if (!input.code || !input.state) {
      throw ApiError.badRequest("Missing OAuth code or state");
    }

    const stateData = this.parseAndValidateState(
      input.state,
      input.auth.organizationId,
    );

    if (stateData.userId !== input.auth.userId) {
      throw ApiError.forbidden("OAuth state does not match user");
    }

    const tokens = await exchangeCodeForTokens(input.code);
    const account = await fetchGoogleAccountEmail(tokens.access_token);
    const channel = await fetchMineChannel(tokens.access_token);

    if (!channel) {
      throw ApiError.badRequest(
        "No YouTube channel was found for this Google account.",
      );
    }

    const existing = await youTubeConnectionRepository.findByOrganization(
      input.auth.organizationId,
    );

    const encryptedAccessToken = encryptSecret(tokens.access_token);
    const encryptedRefreshToken = tokens.refresh_token
      ? encryptSecret(tokens.refresh_token)
      : existing?.encryptedRefreshToken ?? null;

    if (!encryptedRefreshToken) {
      // Still connect but flag reauth for long-term refresh
    }

    const connection = await youTubeConnectionRepository.upsertConnection({
      organizationId: input.auth.organizationId,
      userId: input.auth.userId,
      googleAccountId: account.id ?? null,
      googleAccountEmail: account.email ?? null,
      encryptedAccessToken,
      encryptedRefreshToken,
      accessTokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      scope: tokens.scope ?? null,
      status: encryptedRefreshToken ? "CONNECTED" : "REAUTH_REQUIRED",
      lastErrorCode: encryptedRefreshToken ? null : "MISSING_REFRESH_TOKEN",
      lastErrorMessage: encryptedRefreshToken
        ? null
        : "Refresh token was not issued. Reconnect with consent to enable long-lived sync.",
      lastConnectedAt: new Date(),
      lastRefreshedAt: new Date(),
      revokedAt: null,
    });

    const savedChannel = await youTubeChannelRepository.upsert({
      organizationId: input.auth.organizationId,
      connectionId: connection.id,
      youtubeChannelId: channel.id,
      title: channel.title,
      description: channel.description ?? null,
      thumbnailUrl: channel.thumbnailUrl ?? null,
      customUrl: channel.customUrl ?? null,
      publishedAt: channel.publishedAt ? new Date(channel.publishedAt) : null,
      subscriberCount: channel.subscriberCount ?? null,
      videoCount: channel.videoCount ?? null,
      viewCount: channel.viewCount ?? null,
      uploadsPlaylistId: channel.uploadsPlaylistId ?? null,
      lastSyncedAt: new Date(),
    });

    const job = await youTubeSyncJobRepository.create({
      organizationId: input.auth.organizationId,
      connectionId: connection.id,
      channelId: savedChannel.id,
      jobType: "CHANNEL_SYNC",
      status: "RUNNING",
    });
    await youTubeSyncJobRepository.complete(job.id, input.auth.organizationId, {
      status: "COMPLETED",
      processedCount: 1,
    });

    await activityRepository.create({
      organizationId: input.auth.organizationId,
      userId: input.auth.userId,
      action: "CREATE",
      entityType: "youtube_connection",
      entityId: connection.id,
      summary: `Connected YouTube channel "${channel.title}"`,
    });

    return this.getStatus(input.auth.organizationId);
  }

  async disconnect(auth: AuthContext) {
    const connection = await youTubeConnectionRepository.findByOrganization(
      auth.organizationId,
    );
    if (!connection) {
      throw ApiError.notFound("No YouTube connection found");
    }

    // Best-effort revoke — never log token values
    try {
      if (connection.encryptedRefreshToken) {
        await revokeGoogleToken(decryptSecret(connection.encryptedRefreshToken));
      } else if (connection.encryptedAccessToken) {
        await revokeGoogleToken(decryptSecret(connection.encryptedAccessToken));
      }
    } catch {
      // ignore
    }

    await youTubeConnectionRepository.updateStatus(auth.organizationId, {
      status: "DISCONNECTED",
      encryptedAccessToken: null,
      encryptedRefreshToken: null,
      accessTokenExpiresAt: null,
      revokedAt: new Date(),
      lastErrorCode: null,
      lastErrorMessage: null,
    });

    await activityRepository.create({
      organizationId: auth.organizationId,
      userId: auth.userId,
      action: "DELETE",
      entityType: "youtube_connection",
      entityId: connection.id,
      summary: "Disconnected YouTube channel",
    });

    return this.getStatus(auth.organizationId);
  }

  /** Used by later phases — refreshes token and returns plaintext access token in-memory only. */
  async getValidAccessToken(organizationId: string): Promise<string> {
    const connection =
      await youTubeConnectionRepository.findByOrganization(organizationId);
    if (!connection || connection.status === "DISCONNECTED") {
      throw ApiError.badRequest("YouTube is not connected");
    }
    if (!connection.encryptedAccessToken) {
      throw new ApiError(
        403,
        "REAUTH_REQUIRED",
        "YouTube re-authentication is required",
      );
    }

    const expiresAt = connection.accessTokenExpiresAt?.getTime() ?? 0;
    if (expiresAt > Date.now() + 60_000) {
      return decryptSecret(connection.encryptedAccessToken);
    }

    if (!connection.encryptedRefreshToken) {
      await youTubeConnectionRepository.updateStatus(organizationId, {
        status: "REAUTH_REQUIRED",
        lastErrorCode: "MISSING_REFRESH_TOKEN",
        lastErrorMessage: "Reconnect YouTube to continue syncing.",
      });
      throw new ApiError(
        403,
        "REAUTH_REQUIRED",
        "YouTube connection expired. Please reconnect your channel.",
      );
    }

    try {
      const refreshed = await refreshAccessToken(
        decryptSecret(connection.encryptedRefreshToken),
      );
      await youTubeConnectionRepository.updateStatus(organizationId, {
        status: "CONNECTED",
        encryptedAccessToken: encryptSecret(refreshed.access_token),
        accessTokenExpiresAt: new Date(Date.now() + refreshed.expires_in * 1000),
        lastRefreshedAt: new Date(),
        lastErrorCode: null,
        lastErrorMessage: null,
      });
      return refreshed.access_token;
    } catch (error) {
      await youTubeConnectionRepository.updateStatus(organizationId, {
        status: "REAUTH_REQUIRED",
        lastErrorCode: "REFRESH_FAILED",
        lastErrorMessage: "YouTube connection expired. Please reconnect.",
      });
      throw error;
    }
  }
}

export const youTubeConnectionService = new YouTubeConnectionService();
