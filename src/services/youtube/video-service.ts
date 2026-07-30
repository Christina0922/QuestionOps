import { z } from "zod";
import { ApiError } from "@/lib/api-error";
import {
  fetchMineChannel,
  fetchUploadsPlaylistPage,
  fetchVideosByIds,
  type YoutubeVideoApiResult,
} from "@/lib/youtube/google-oauth";
import { extractYouTubeVideoId, buildYouTubeWatchUrl } from "@/lib/youtube/url-parse";
import { activityRepository } from "@/repositories/activity-repository";
import {
  youTubeChannelRepository,
  youTubeConnectionRepository,
  youTubeSyncJobRepository,
  youTubeVideoRepository,
} from "@/repositories/youtube-repository";
import { youTubeConnectionService } from "@/services/youtube/connection-service";
import { paginationSchema } from "@/schemas/common";
import type { AuthContext, PaginatedResult } from "@/types";

export const listYouTubeVideosSchema = paginationSchema.extend({
  q: z.string().optional(),
  filter: z
    .enum([
      "all",
      "never",
      "synced",
      "no_comments",
      "comments_disabled",
      "error",
    ])
    .default("all"),
  sort: z
    .enum(["newest", "oldest", "comments", "views", "unsynced"])
    .default("newest"),
});

export const importYouTubeVideoSchema = z.object({
  url: z.string().min(1),
});

function isMockMode() {
  return process.env.YOUTUBE_MOCK_OAUTH === "true";
}

function allowExternalVideos() {
  return process.env.YOUTUBE_ALLOW_EXTERNAL_VIDEOS === "true";
}

function serializeVideo<T extends {
  viewCount?: bigint | null;
  publishedAt?: Date | null;
  lastCommentSyncedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}>(video: T) {
  return {
    ...video,
    viewCount:
      video.viewCount === null || video.viewCount === undefined
        ? null
        : video.viewCount.toString(),
    publishedAt: video.publishedAt?.toISOString() ?? null,
    lastCommentSyncedAt: video.lastCommentSyncedAt?.toISOString() ?? null,
    createdAt: video.createdAt.toISOString(),
    updatedAt: video.updatedAt.toISOString(),
    watchUrl: buildYouTubeWatchUrl(
      (video as { youtubeVideoId?: string }).youtubeVideoId || "",
    ),
  };
}

function mapApiVideo(
  organizationId: string,
  connectionId: string,
  channelId: string,
  video: YoutubeVideoApiResult,
  source: string,
) {
  return youTubeVideoRepository.upsert({
    organizationId,
    connectionId,
    channelId,
    youtubeVideoId: video.id,
    title: video.title,
    description: video.description ?? null,
    thumbnailUrl: video.thumbnailUrl ?? null,
    publishedAt: video.publishedAt ? new Date(video.publishedAt) : null,
    duration: video.duration ?? null,
    viewCount: video.viewCount ?? null,
    likeCount: video.likeCount ?? null,
    commentCount: video.commentCount ?? null,
    commentsEnabled: video.commentsEnabled,
    source,
  });
}

const MOCK_VIDEOS: Array<Omit<YoutubeVideoApiResult, "channelId"> & { channelId?: string }> = [
  {
    id: "mockvid00001",
    title: "로그인 오류 해결 방법",
    description: "시청자 질문에 답하는 튜토리얼",
    thumbnailUrl: "https://via.placeholder.com/320x180?text=Video+1",
    publishedAt: "2026-06-01T10:00:00.000Z",
    duration: "PT12M3S",
    viewCount: BigInt(15200),
    likeCount: 430,
    commentCount: 128,
    commentsEnabled: true,
  },
  {
    id: "mockvid00002",
    title: "결제 중복 청구 FAQ",
    description: "Billing issues walkthrough",
    thumbnailUrl: "https://via.placeholder.com/320x180?text=Video+2",
    publishedAt: "2026-06-15T10:00:00.000Z",
    duration: "PT8M20S",
    viewCount: BigInt(9800),
    likeCount: 210,
    commentCount: 86,
    commentsEnabled: true,
  },
  {
    id: "mockvid00003",
    title: "모바일 앱 크래시 디버깅",
    description: "Crash reports and fixes",
    thumbnailUrl: "https://via.placeholder.com/320x180?text=Video+3",
    publishedAt: "2026-07-01T10:00:00.000Z",
    duration: "PT15M1S",
    viewCount: BigInt(22100),
    likeCount: 610,
    commentCount: 0,
    commentsEnabled: true,
  },
  {
    id: "mockvid00004",
    title: "댓글 비활성 테스트 영상",
    description: "Comments disabled sample",
    thumbnailUrl: "https://via.placeholder.com/320x180?text=Disabled",
    publishedAt: "2026-07-10T10:00:00.000Z",
    duration: "PT3M0S",
    viewCount: BigInt(1200),
    likeCount: 12,
    commentCount: 0,
    commentsEnabled: false,
  },
  {
    id: "mockvid00005",
    title: "Performance tips for large exports",
    description: "English comments expected",
    thumbnailUrl: "https://via.placeholder.com/320x180?text=Video+5",
    publishedAt: "2026-07-20T10:00:00.000Z",
    duration: "PT9M45S",
    viewCount: BigInt(5400),
    likeCount: 95,
    commentCount: 54,
    commentsEnabled: true,
  },
];

export class YouTubeVideoService {
  async list(
    organizationId: string,
    input: z.infer<typeof listYouTubeVideosSchema>,
  ) {
    const { items, total } = await youTubeVideoRepository.list(organizationId, {
      page: input.page,
      pageSize: input.pageSize,
      q: input.q,
      filter: input.filter,
      sort: input.sort,
    });

    const result: PaginatedResult<ReturnType<typeof serializeVideo>> = {
      items: items.map(serializeVideo),
      total,
      page: input.page,
      pageSize: input.pageSize,
      totalPages: Math.max(1, Math.ceil(total / input.pageSize)),
    };
    return result;
  }

  async get(organizationId: string, id: string) {
    const video = await youTubeVideoRepository.findById(organizationId, id);
    if (!video) throw ApiError.notFound("Video not found");
    return serializeVideo(video);
  }

  async syncChannelVideos(auth: AuthContext) {
    const connection = await youTubeConnectionRepository.findByOrganization(
      auth.organizationId,
    );
    if (!connection || connection.status === "DISCONNECTED") {
      throw ApiError.badRequest("Connect YouTube before syncing videos");
    }
    const channel = connection.channels[0];
    if (!channel) {
      throw ApiError.badRequest("No YouTube channel found for this connection");
    }

    const job = await youTubeSyncJobRepository.create({
      organizationId: auth.organizationId,
      connectionId: connection.id,
      channelId: channel.id,
      jobType: "VIDEO_SYNC",
      status: "RUNNING",
    });

    let created = 0;
    let updated = 0;

    try {
      if (isMockMode() && !connection.encryptedAccessToken) {
        for (const mock of MOCK_VIDEOS) {
          const existing = await youTubeVideoRepository.findByYoutubeId(
            auth.organizationId,
            mock.id,
          );
          await mapApiVideo(
            auth.organizationId,
            connection.id,
            channel.id,
            { ...mock, channelId: channel.youtubeChannelId },
            "CHANNEL",
          );
          if (existing) updated += 1;
          else created += 1;
        }
      } else {
        const accessToken = await youTubeConnectionService.getValidAccessToken(
          auth.organizationId,
        );

        // Refresh channel + uploads playlist id
        const mine = await fetchMineChannel(accessToken);
        if (mine?.uploadsPlaylistId) {
          await youTubeChannelRepository.upsert({
            organizationId: auth.organizationId,
            connectionId: connection.id,
            youtubeChannelId: channel.youtubeChannelId,
            title: channel.title,
            uploadsPlaylistId: mine.uploadsPlaylistId,
            lastSyncedAt: new Date(),
          });
        }

        const playlistId =
          mine?.uploadsPlaylistId || channel.uploadsPlaylistId;
        if (!playlistId) {
          throw ApiError.badRequest(
            "Could not resolve the channel uploads playlist",
          );
        }

        let pageToken: string | undefined;
        let pages = 0;
        const maxPages = Number(process.env.YOUTUBE_VIDEO_SYNC_MAX_PAGES || 5);

        do {
          const page = await fetchUploadsPlaylistPage(
            accessToken,
            playlistId,
            pageToken,
          );
          const details = await fetchVideosByIds(accessToken, page.videoIds);
          for (const video of details) {
            if (
              !allowExternalVideos() &&
              video.channelId &&
              video.channelId !== channel.youtubeChannelId
            ) {
              continue;
            }
            const existing = await youTubeVideoRepository.findByYoutubeId(
              auth.organizationId,
              video.id,
            );
            await mapApiVideo(
              auth.organizationId,
              connection.id,
              channel.id,
              video,
              "CHANNEL",
            );
            if (existing) updated += 1;
            else created += 1;
          }
          pageToken = page.nextPageToken;
          pages += 1;
        } while (pageToken && pages < maxPages);
      }

      await youTubeSyncJobRepository.complete(job.id, auth.organizationId, {
        status: "COMPLETED",
        processedCount: created + updated,
      });

      await activityRepository.create({
        organizationId: auth.organizationId,
        userId: auth.userId,
        action: "UPDATE",
        entityType: "youtube_channel",
        entityId: channel.id,
        summary: `Synced YouTube videos (+${created} / ~${updated} updated)`,
      });

      return {
        created,
        updated,
        jobId: job.id,
      };
    } catch (error) {
      await youTubeSyncJobRepository.complete(job.id, auth.organizationId, {
        status: "FAILED",
        errorCode: "VIDEO_SYNC_FAILED",
        errorMessage:
          error instanceof Error ? error.message : "Video sync failed",
      });
      throw error;
    }
  }

  async importByUrl(auth: AuthContext, url: string) {
    const youtubeVideoId = extractYouTubeVideoId(url);
    const connection = await youTubeConnectionRepository.findByOrganization(
      auth.organizationId,
    );
    if (!connection || connection.status === "DISCONNECTED") {
      throw ApiError.badRequest("Connect YouTube before importing a video");
    }
    const channel = connection.channels[0];
    if (!channel) {
      throw ApiError.badRequest("No YouTube channel found");
    }

    if (isMockMode() && !connection.encryptedAccessToken) {
      const mock =
        MOCK_VIDEOS.find((v) => v.id === youtubeVideoId) || {
          id: youtubeVideoId,
          title: `Imported video ${youtubeVideoId}`,
          description: "Imported via URL in mock mode",
          thumbnailUrl: "https://via.placeholder.com/320x180?text=Imported",
          publishedAt: new Date().toISOString(),
          duration: "PT5M0S",
          viewCount: BigInt(0),
          likeCount: 0,
          commentCount: 10,
          commentsEnabled: true,
          channelId: channel.youtubeChannelId,
        };
      const saved = await mapApiVideo(
        auth.organizationId,
        connection.id,
        channel.id,
        { ...mock, channelId: channel.youtubeChannelId },
        "URL",
      );
      await activityRepository.create({
        organizationId: auth.organizationId,
        userId: auth.userId,
        action: "CREATE",
        entityType: "youtube_video",
        entityId: saved.id,
        summary: `Imported YouTube video "${saved.title}"`,
      });
      return serializeVideo(saved);
    }

    const accessToken = await youTubeConnectionService.getValidAccessToken(
      auth.organizationId,
    );
    const [video] = await fetchVideosByIds(accessToken, [youtubeVideoId]);
    if (!video) {
      throw ApiError.notFound(
        "Video not found or you do not have access to it",
      );
    }

    if (
      !allowExternalVideos() &&
      video.channelId &&
      video.channelId !== channel.youtubeChannelId
    ) {
      throw ApiError.forbidden(
        "This video belongs to another channel. External video import is disabled.",
      );
    }

    const saved = await mapApiVideo(
      auth.organizationId,
      connection.id,
      channel.id,
      video,
      "URL",
    );

    await activityRepository.create({
      organizationId: auth.organizationId,
      userId: auth.userId,
      action: "CREATE",
      entityType: "youtube_video",
      entityId: saved.id,
      summary: `Imported YouTube video "${saved.title}"`,
    });

    return serializeVideo(saved);
  }

  async remove(auth: AuthContext, id: string) {
    const video = await youTubeVideoRepository.findById(auth.organizationId, id);
    if (!video) throw ApiError.notFound("Video not found");
    await youTubeVideoRepository.softDelete(auth.organizationId, id);
    await activityRepository.create({
      organizationId: auth.organizationId,
      userId: auth.userId,
      action: "DELETE",
      entityType: "youtube_video",
      entityId: id,
      summary: `Deleted YouTube video "${video.title}"`,
    });
    return { ok: true };
  }
}

export const youTubeVideoService = new YouTubeVideoService();
