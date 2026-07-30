import type {
  Prisma,
  YouTubeConnectionStatus,
  YouTubeSyncJobStatus,
  YouTubeSyncJobType,
  YouTubeVideoSyncStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

export class YouTubeConnectionRepository {
  findByOrganization(organizationId: string) {
    return prisma.youTubeConnection.findUnique({
      where: { organizationId },
      include: {
        channels: {
          where: { deletedAt: null },
          orderBy: { updatedAt: "desc" },
          take: 1,
        },
      },
    });
  }

  upsertConnection(data: {
    organizationId: string;
    userId: string;
    googleAccountId?: string | null;
    googleAccountEmail?: string | null;
    encryptedAccessToken?: string | null;
    encryptedRefreshToken?: string | null;
    accessTokenExpiresAt?: Date | null;
    scope?: string | null;
    status: YouTubeConnectionStatus;
    lastErrorCode?: string | null;
    lastErrorMessage?: string | null;
    lastConnectedAt?: Date | null;
    lastRefreshedAt?: Date | null;
    revokedAt?: Date | null;
  }) {
    return prisma.youTubeConnection.upsert({
      where: { organizationId: data.organizationId },
      create: {
        organizationId: data.organizationId,
        userId: data.userId,
        googleAccountId: data.googleAccountId,
        googleAccountEmail: data.googleAccountEmail,
        encryptedAccessToken: data.encryptedAccessToken,
        encryptedRefreshToken: data.encryptedRefreshToken,
        accessTokenExpiresAt: data.accessTokenExpiresAt,
        scope: data.scope,
        status: data.status,
        lastErrorCode: data.lastErrorCode,
        lastErrorMessage: data.lastErrorMessage,
        lastConnectedAt: data.lastConnectedAt,
        lastRefreshedAt: data.lastRefreshedAt,
        revokedAt: data.revokedAt,
      },
      update: {
        userId: data.userId,
        googleAccountId: data.googleAccountId,
        googleAccountEmail: data.googleAccountEmail,
        encryptedAccessToken: data.encryptedAccessToken,
        encryptedRefreshToken: data.encryptedRefreshToken,
        accessTokenExpiresAt: data.accessTokenExpiresAt,
        scope: data.scope,
        status: data.status,
        lastErrorCode: data.lastErrorCode,
        lastErrorMessage: data.lastErrorMessage,
        lastConnectedAt: data.lastConnectedAt,
        lastRefreshedAt: data.lastRefreshedAt,
        revokedAt: data.revokedAt,
      },
    });
  }

  updateStatus(
    organizationId: string,
    data: Partial<{
      status: YouTubeConnectionStatus;
      encryptedAccessToken: string | null;
      encryptedRefreshToken: string | null;
      accessTokenExpiresAt: Date | null;
      lastErrorCode: string | null;
      lastErrorMessage: string | null;
      lastRefreshedAt: Date | null;
      revokedAt: Date | null;
    }>,
  ) {
    return prisma.youTubeConnection.update({
      where: { organizationId },
      data,
    });
  }
}

export class YouTubeChannelRepository {
  upsert(data: {
    organizationId: string;
    connectionId: string;
    youtubeChannelId: string;
    title: string;
    description?: string | null;
    thumbnailUrl?: string | null;
    customUrl?: string | null;
    publishedAt?: Date | null;
    subscriberCount?: number | null;
    videoCount?: number | null;
    viewCount?: bigint | null;
    uploadsPlaylistId?: string | null;
    lastSyncedAt?: Date | null;
  }) {
    return prisma.youTubeChannel.upsert({
      where: {
        organizationId_youtubeChannelId: {
          organizationId: data.organizationId,
          youtubeChannelId: data.youtubeChannelId,
        },
      },
      create: {
        ...data,
        deletedAt: null,
      },
      update: {
        connectionId: data.connectionId,
        title: data.title,
        description: data.description,
        thumbnailUrl: data.thumbnailUrl,
        customUrl: data.customUrl,
        publishedAt: data.publishedAt,
        subscriberCount: data.subscriberCount,
        videoCount: data.videoCount,
        viewCount: data.viewCount,
        uploadsPlaylistId: data.uploadsPlaylistId,
        lastSyncedAt: data.lastSyncedAt,
        deletedAt: null,
      },
    });
  }
}

export class YouTubeVideoRepository {
  list(
    organizationId: string,
    options: {
      page: number;
      pageSize: number;
      q?: string;
      filter?:
        | "all"
        | "never"
        | "synced"
        | "no_comments"
        | "comments_disabled"
        | "error";
      sort?: "newest" | "oldest" | "comments" | "views" | "unsynced";
    },
  ) {
    const where: Prisma.YouTubeVideoWhereInput = {
      organizationId,
      deletedAt: null,
      ...(options.q
        ? {
            OR: [
              { title: { contains: options.q, mode: "insensitive" } },
              { description: { contains: options.q, mode: "insensitive" } },
              { youtubeVideoId: { contains: options.q, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    switch (options.filter) {
      case "never":
        where.syncStatus = "NEVER";
        break;
      case "synced":
        where.syncStatus = { in: ["SYNCED", "PARTIAL"] };
        break;
      case "no_comments":
        where.AND = [
          ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
          { OR: [{ commentCount: 0 }, { commentCount: null }] },
        ];
        break;
      case "comments_disabled":
        where.commentsEnabled = false;
        break;
      case "error":
        where.syncStatus = "ERROR";
        break;
      default:
        break;
    }

    const orderBy: Prisma.YouTubeVideoOrderByWithRelationInput =
      options.sort === "oldest"
        ? { publishedAt: "asc" }
        : options.sort === "comments"
          ? { commentCount: "desc" }
          : options.sort === "views"
            ? { viewCount: "desc" }
            : options.sort === "unsynced"
              ? { syncStatus: "asc" }
              : { publishedAt: "desc" };

    return Promise.all([
      prisma.youTubeVideo.findMany({
        where,
        orderBy,
        skip: (options.page - 1) * options.pageSize,
        take: options.pageSize,
      }),
      prisma.youTubeVideo.count({ where }),
    ]).then(([items, total]) => ({ items, total }));
  }

  findById(organizationId: string, id: string) {
    return prisma.youTubeVideo.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: {
        channel: {
          select: {
            id: true,
            title: true,
            youtubeChannelId: true,
            thumbnailUrl: true,
          },
        },
      },
    });
  }

  findByYoutubeId(organizationId: string, youtubeVideoId: string) {
    return prisma.youTubeVideo.findFirst({
      where: { organizationId, youtubeVideoId, deletedAt: null },
    });
  }

  upsert(data: {
    organizationId: string;
    connectionId?: string | null;
    channelId: string;
    youtubeVideoId: string;
    title: string;
    description?: string | null;
    thumbnailUrl?: string | null;
    publishedAt?: Date | null;
    duration?: string | null;
    viewCount?: bigint | null;
    likeCount?: number | null;
    commentCount?: number | null;
    commentsEnabled?: boolean;
    source?: string;
    syncStatus?: YouTubeVideoSyncStatus;
  }) {
    return prisma.youTubeVideo.upsert({
      where: {
        organizationId_youtubeVideoId: {
          organizationId: data.organizationId,
          youtubeVideoId: data.youtubeVideoId,
        },
      },
      create: {
        organizationId: data.organizationId,
        connectionId: data.connectionId,
        channelId: data.channelId,
        youtubeVideoId: data.youtubeVideoId,
        title: data.title,
        description: data.description,
        thumbnailUrl: data.thumbnailUrl,
        publishedAt: data.publishedAt,
        duration: data.duration,
        viewCount: data.viewCount,
        likeCount: data.likeCount,
        commentCount: data.commentCount,
        commentsEnabled: data.commentsEnabled ?? true,
        source: data.source ?? "CHANNEL",
        syncStatus: data.syncStatus ?? "NEVER",
        deletedAt: null,
      },
      update: {
        connectionId: data.connectionId,
        channelId: data.channelId,
        title: data.title,
        description: data.description,
        thumbnailUrl: data.thumbnailUrl,
        publishedAt: data.publishedAt,
        duration: data.duration,
        viewCount: data.viewCount,
        likeCount: data.likeCount,
        commentCount: data.commentCount,
        commentsEnabled: data.commentsEnabled,
        source: data.source,
        deletedAt: null,
      },
    });
  }

  softDelete(organizationId: string, id: string) {
    return prisma.youTubeVideo.updateMany({
      where: { id, organizationId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }
}

export class YouTubeSyncJobRepository {
  create(data: {
    organizationId: string;
    connectionId?: string | null;
    channelId?: string | null;
    videoId?: string | null;
    jobType: YouTubeSyncJobType;
    status?: YouTubeSyncJobStatus;
  }) {
    return prisma.youTubeSyncJob.create({
      data: {
        organizationId: data.organizationId,
        connectionId: data.connectionId,
        channelId: data.channelId,
        videoId: data.videoId,
        jobType: data.jobType,
        status: data.status ?? "PENDING",
        startedAt: data.status === "RUNNING" ? new Date() : undefined,
      },
    });
  }

  complete(
    id: string,
    organizationId: string,
    data: Partial<{
      status: YouTubeSyncJobStatus;
      processedCount: number;
      createdCount: number;
      updatedCount: number;
      errorCode: string | null;
      errorMessage: string | null;
    }>,
  ) {
    return prisma.youTubeSyncJob.updateMany({
      where: { id, organizationId },
      data: {
        ...data,
        completedAt: new Date(),
      },
    });
  }
}

export const youTubeConnectionRepository = new YouTubeConnectionRepository();
export const youTubeChannelRepository = new YouTubeChannelRepository();
export const youTubeVideoRepository = new YouTubeVideoRepository();
export const youTubeSyncJobRepository = new YouTubeSyncJobRepository();
