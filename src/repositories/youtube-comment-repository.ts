import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type CommentUpsertInput = {
  organizationId: string;
  videoId: string;
  channelId?: string | null;
  youtubeCommentId: string;
  parentYoutubeCommentId?: string | null;
  authorDisplayName?: string | null;
  authorChannelId?: string | null;
  authorProfileImageUrl?: string | null;
  textOriginal: string;
  textDisplay?: string | null;
  likeCount?: number;
  replyCount?: number;
  publishedAt?: Date | null;
  updatedAtSource?: Date | null;
  moderationStatus?: string | null;
  isTopLevel?: boolean;
  sourceUrl?: string | null;
  rawPayload?: Prisma.InputJsonValue | null;
  detectedLanguage?: string | null;
  translatedTextKo?: string | null;
  translatedTextEn?: string | null;
  translationStatus?: string | null;
};

export class YouTubeCommentRepository {
  upsert(data: CommentUpsertInput) {
    const rawPayload =
      data.rawPayload === null
        ? Prisma.JsonNull
        : data.rawPayload === undefined
          ? undefined
          : data.rawPayload;

    return prisma.youTubeComment.upsert({
      where: {
        organizationId_youtubeCommentId: {
          organizationId: data.organizationId,
          youtubeCommentId: data.youtubeCommentId,
        },
      },
      create: {
        organizationId: data.organizationId,
        videoId: data.videoId,
        channelId: data.channelId,
        youtubeCommentId: data.youtubeCommentId,
        parentYoutubeCommentId: data.parentYoutubeCommentId,
        authorDisplayName: data.authorDisplayName,
        authorChannelId: data.authorChannelId,
        authorProfileImageUrl: data.authorProfileImageUrl,
        textOriginal: data.textOriginal,
        textDisplay: data.textDisplay,
        likeCount: data.likeCount ?? 0,
        replyCount: data.replyCount ?? 0,
        publishedAt: data.publishedAt,
        updatedAtSource: data.updatedAtSource,
        moderationStatus: data.moderationStatus,
        isTopLevel: data.isTopLevel ?? true,
        sourceUrl: data.sourceUrl,
        rawPayload,
        detectedLanguage: data.detectedLanguage,
        translatedTextKo: data.translatedTextKo,
        translatedTextEn: data.translatedTextEn,
        translationStatus: data.translationStatus,
        lastSeenAt: new Date(),
        deletedAt: null,
        sourceUnavailableAt: null,
      },
      update: {
        textOriginal: data.textOriginal,
        textDisplay: data.textDisplay,
        likeCount: data.likeCount,
        replyCount: data.replyCount,
        updatedAtSource: data.updatedAtSource,
        moderationStatus: data.moderationStatus,
        authorDisplayName: data.authorDisplayName,
        authorProfileImageUrl: data.authorProfileImageUrl,
        lastSeenAt: new Date(),
        deletedAt: null,
        sourceUnavailableAt: null,
        ...(data.detectedLanguage !== undefined
          ? { detectedLanguage: data.detectedLanguage }
          : {}),
        ...(data.translatedTextKo !== undefined
          ? { translatedTextKo: data.translatedTextKo }
          : {}),
        ...(data.translatedTextEn !== undefined
          ? { translatedTextEn: data.translatedTextEn }
          : {}),
        ...(data.translationStatus !== undefined
          ? { translationStatus: data.translationStatus }
          : {}),
        ...(rawPayload !== undefined ? { rawPayload } : {}),
      },
    });
  }

  listByVideo(
    organizationId: string,
    videoId: string,
    options: {
      page: number;
      pageSize: number;
      includeDeleted?: boolean;
      q?: string;
      topLevelOnly?: boolean;
      language?: string;
      converted?: "any" | "yes" | "no";
    },
  ) {
    const where: Prisma.YouTubeCommentWhereInput = {
      organizationId,
      videoId,
      ...(options.includeDeleted ? {} : { deletedAt: null }),
      ...(options.topLevelOnly ? { isTopLevel: true } : {}),
      ...(options.language && options.language !== "all"
        ? { detectedLanguage: options.language }
        : {}),
      ...(options.q
        ? {
            OR: [
              { textOriginal: { contains: options.q, mode: "insensitive" } },
              { translatedTextKo: { contains: options.q, mode: "insensitive" } },
              { translatedTextEn: { contains: options.q, mode: "insensitive" } },
              {
                authorDisplayName: {
                  contains: options.q,
                  mode: "insensitive",
                },
              },
            ],
          }
        : {}),
      ...(options.converted === "yes"
        ? { evidences: { some: { deletedAt: null } } }
        : options.converted === "no"
          ? { evidences: { none: { deletedAt: null } } }
          : {}),
    };

    return Promise.all([
      prisma.youTubeComment.findMany({
        where,
        include: {
          evidences: {
            where: { deletedAt: null },
            select: { id: true, problemId: true },
            take: 1,
          },
        },
        orderBy: [{ isTopLevel: "desc" }, { publishedAt: "desc" }],
        skip: (options.page - 1) * options.pageSize,
        take: options.pageSize,
      }),
      prisma.youTubeComment.count({ where }),
    ]).then(([items, total]) => ({ items, total }));
  }

  findById(organizationId: string, id: string) {
    return prisma.youTubeComment.findFirst({
      where: { id, organizationId, deletedAt: null },
    });
  }

  findManyByIds(organizationId: string, ids: string[]) {
    return prisma.youTubeComment.findMany({
      where: { organizationId, id: { in: ids }, deletedAt: null },
    });
  }

  countByVideo(organizationId: string, videoId: string) {
    return prisma.youTubeComment.count({
      where: { organizationId, videoId, deletedAt: null },
    });
  }
}

export const youTubeCommentRepository = new YouTubeCommentRepository();
