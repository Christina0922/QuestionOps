import { z } from "zod";
import { ApiError } from "@/lib/api-error";
import { detectCommentLanguage } from "@/lib/youtube/language";
import { youtubeApiGet } from "@/lib/youtube/google-oauth";
import { buildYouTubeWatchUrl } from "@/lib/youtube/url-parse";
import { activityRepository } from "@/repositories/activity-repository";
import { evidenceRepository } from "@/repositories/evidence-repository";
import { problemRepository } from "@/repositories/problem-repository";
import { tagRepository } from "@/repositories/tag-repository";
import { youTubeCommentRepository } from "@/repositories/youtube-comment-repository";
import {
  youTubeConnectionRepository,
  youTubeSyncJobRepository,
  youTubeVideoRepository,
} from "@/repositories/youtube-repository";
import { youTubeConnectionService } from "@/services/youtube/connection-service";
import { paginationSchema, tagNamesSchema } from "@/schemas/common";
import { recordYouTubeQuota } from "@/lib/youtube/quota";
import { youtubeJobQueue } from "@/jobs/youtube/queue";
import { prisma } from "@/lib/prisma";
import type { AuthContext, PaginatedResult } from "@/types";

export const listYouTubeCommentsSchema = paginationSchema.extend({
  includeDeleted: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
  q: z.string().trim().optional(),
  topLevelOnly: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
  language: z
    .enum(["all", "ko", "en", "ja", "unknown"])
    .optional()
    .default("all"),
  converted: z.enum(["any", "yes", "no"]).optional().default("any"),
});

export const importCommentsSchema = z.object({
  maxComments: z.coerce.number().int().min(1).max(1000).default(1000),
  includeReplies: z.boolean().default(true),
  mode: z.enum(["full", "fast"]).default("full"),
});

export const convertCommentsSchema = z.object({
  commentIds: z.array(z.string().min(1)).min(1).max(50),
  problemId: z.string().min(1),
  confidence: z.number().min(0).max(1).default(0.6),
  tags: tagNamesSchema.optional().default([]),
  textMode: z.enum(["original", "ko", "en"]).default("original"),
});

function isMockMode() {
  return process.env.YOUTUBE_MOCK_OAUTH === "true";
}

function serializeComment<
  T extends {
    publishedAt?: Date | null;
    updatedAtSource?: Date | null;
    importedAt: Date;
    lastSeenAt: Date;
    deletedAt?: Date | null;
    createdAt: Date;
    updatedAt: Date;
    evidences?: Array<{ id: string; problemId: string }>;
  },
>(comment: T) {
  const { evidences, ...rest } = comment;
  return {
    ...rest,
    publishedAt: comment.publishedAt?.toISOString() ?? null,
    updatedAtSource: comment.updatedAtSource?.toISOString() ?? null,
    importedAt: comment.importedAt.toISOString(),
    lastSeenAt: comment.lastSeenAt.toISOString(),
    deletedAt: comment.deletedAt?.toISOString() ?? null,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
    evidenceId: evidences?.[0]?.id ?? null,
    evidenceProblemId: evidences?.[0]?.problemId ?? null,
  };
}

function mockCommentsForVideo(youtubeVideoId: string, max: number) {
  const samples = [
    { ko: "자막이 너무 빨라요", en: "The subtitles move too fast." },
    { ko: "로그인할 때 오류가 나요", en: "I get an error when logging in" },
    { ko: "이 영상 정말 도움이 됐어요!", en: "This video helped a lot!" },
    { ko: "환불은 어떻게 하나요?", en: "How do I get a refund?" },
    { ko: "앱이 자꾸 꺼져요", en: "The app keeps crashing" },
    { ko: "다음 영상도 기대할게요", en: "Looking forward to the next one" },
    { ko: "광고가 너무 많아요", en: "Too many ads" },
    { ko: "API 문서 링크 주세요", en: "Please share the API docs link" },
  ];

  const items = [];
  for (let i = 0; i < max; i++) {
    const sample = samples[i % samples.length]!;
    const useKo = i % 3 !== 1;
    const text = useKo ? sample.ko : sample.en;
    const id = `${youtubeVideoId}_c_${i + 1}`;
    items.push({
      youtubeCommentId: id,
      parentYoutubeCommentId: null as string | null,
      authorDisplayName: useKo ? `시청자${i + 1}` : `Viewer${i + 1}`,
      authorChannelId: `UC_AUTHOR_${i + 1}`,
      textOriginal: text,
      textDisplay: text,
      likeCount: (i * 3) % 40,
      replyCount: i % 7 === 0 ? 1 : 0,
      publishedAt: new Date(Date.now() - i * 3600_000),
      isTopLevel: true,
      sourceUrl: `${buildYouTubeWatchUrl(youtubeVideoId)}&lc=${id}`,
      detectedLanguage: useKo ? "ko" : "en",
      translatedTextKo: sample.ko,
      translatedTextEn: sample.en,
      translationStatus: "READY",
    });
    if (i % 7 === 0 && items.length < max) {
      const replyId = `${id}_r1`;
      items.push({
        youtubeCommentId: replyId,
        parentYoutubeCommentId: id,
        authorDisplayName: "CreatorReply",
        authorChannelId: "UC_CREATOR",
        textOriginal: useKo ? "확인해볼게요!" : "Thanks, we'll check!",
        textDisplay: useKo ? "확인해볼게요!" : "Thanks, we'll check!",
        likeCount: 2,
        replyCount: 0,
        publishedAt: new Date(Date.now() - i * 3600_000 + 60_000),
        isTopLevel: false,
        sourceUrl: `${buildYouTubeWatchUrl(youtubeVideoId)}&lc=${replyId}`,
        detectedLanguage: useKo ? "ko" : "en",
        translatedTextKo: "확인해볼게요!",
        translatedTextEn: "Thanks, we'll check!",
        translationStatus: "READY",
      });
    }
  }
  return items.slice(0, max);
}

type ThreadItem = {
  id: string;
  snippet?: {
    topLevelComment?: {
      id?: string;
      snippet?: {
        authorDisplayName?: string;
        authorChannelId?: string;
        authorProfileImageUrl?: string;
        textOriginal?: string;
        textDisplay?: string;
        likeCount?: number;
        publishedAt?: string;
        updatedAt?: string;
        moderationStatus?: string;
        videoId?: string;
      };
    };
    totalReplyCount?: number;
  };
  replies?: {
    comments?: Array<{
      id: string;
      snippet?: {
        parentId?: string;
        authorDisplayName?: string;
        authorChannelId?: string;
        authorProfileImageUrl?: string;
        textOriginal?: string;
        textDisplay?: string;
        likeCount?: number;
        publishedAt?: string;
        updatedAt?: string;
        moderationStatus?: string;
      };
    }>;
  };
};

function translationFieldsForText(text: string) {
  const lang = detectCommentLanguage(text);
  return {
    detectedLanguage: lang,
    translatedTextKo: lang === "ko" ? text : null,
    translatedTextEn: lang === "en" ? text : null,
    translationStatus: lang === "ko" || lang === "en" ? "PARTIAL" : "NONE",
  };
}

export class YouTubeCommentService {
  async list(
    organizationId: string,
    videoId: string,
    input: z.infer<typeof listYouTubeCommentsSchema>,
  ) {
    const video = await youTubeVideoRepository.findById(organizationId, videoId);
    if (!video) throw ApiError.notFound("Video not found");

    const { items, total } = await youTubeCommentRepository.listByVideo(
      organizationId,
      videoId,
      {
        page: input.page,
        pageSize: input.pageSize,
        includeDeleted: input.includeDeleted,
        q: input.q,
        topLevelOnly: input.topLevelOnly,
        language: input.language,
        converted: input.converted,
      },
    );

    const result: PaginatedResult<ReturnType<typeof serializeComment>> = {
      items: items.map(serializeComment),
      total,
      page: input.page,
      pageSize: input.pageSize,
      totalPages: Math.max(1, Math.ceil(total / input.pageSize)),
    };
    return result;
  }

  async getJob(organizationId: string, jobId: string) {
    const job = await prisma.youTubeSyncJob.findFirst({
      where: { id: jobId, organizationId },
    });
    if (!job) throw ApiError.notFound("Sync job not found");
    return {
      ...job,
      startedAt: job.startedAt?.toISOString() ?? null,
      completedAt: job.completedAt?.toISOString() ?? null,
      cancelledAt: job.cancelledAt?.toISOString() ?? null,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
    };
  }

  async convertToEvidence(
    auth: AuthContext,
    videoId: string,
    input: z.infer<typeof convertCommentsSchema>,
  ) {
    const video = await youTubeVideoRepository.findById(
      auth.organizationId,
      videoId,
    );
    if (!video) throw ApiError.notFound("Video not found");

    const problem = await problemRepository.findById(
      auth.organizationId,
      input.problemId,
    );
    if (!problem) throw ApiError.badRequest("Problem not found");

    const comments = await youTubeCommentRepository.findManyByIds(
      auth.organizationId,
      input.commentIds,
    );
    if (comments.length === 0) {
      throw ApiError.badRequest("No comments found");
    }
    for (const c of comments) {
      if (c.videoId !== videoId) {
        throw ApiError.badRequest("Comment does not belong to this video");
      }
    }

    const tags = await tagRepository.findOrCreateMany(auth.organizationId, [
      "youtube",
      ...(input.tags ?? []),
    ]);
    const tagIds = tags.map((t) => t.id);

    const created: string[] = [];
    const skipped: string[] = [];

    for (const comment of comments) {
      const existing = await evidenceRepository.findBySource(
        auth.organizationId,
        "YOUTUBE_COMMENT",
        comment.youtubeCommentId,
      );
      if (existing) {
        skipped.push(existing.id);
        continue;
      }

      let observation = comment.textOriginal;
      if (input.textMode === "ko" && comment.translatedTextKo) {
        observation = comment.translatedTextKo;
      } else if (input.textMode === "en" && comment.translatedTextEn) {
        observation = comment.translatedTextEn;
      }

      const transcriptParts = [
        comment.textOriginal !== observation
          ? `Original: ${comment.textOriginal}`
          : null,
        comment.translatedTextKo && comment.translatedTextKo !== observation
          ? `KO: ${comment.translatedTextKo}`
          : null,
        comment.translatedTextEn && comment.translatedTextEn !== observation
          ? `EN: ${comment.translatedTextEn}`
          : null,
      ].filter(Boolean);

      const evidence = await evidenceRepository.create({
        organizationId: auth.organizationId,
        problemId: input.problemId,
        observation,
        transcript: transcriptParts.length
          ? transcriptParts.join("\n")
          : comment.textOriginal,
        link: comment.sourceUrl || null,
        confidence: input.confidence,
        authorId: auth.userId,
        tagIds,
        sourceType: "YOUTUBE_COMMENT",
        sourceExternalId: comment.youtubeCommentId,
        sourceUrl: comment.sourceUrl,
        youtubeCommentId: comment.id,
      });
      created.push(evidence.id);
    }

    await activityRepository.create({
      organizationId: auth.organizationId,
      userId: auth.userId,
      action: "CREATE",
      entityType: "evidence",
      entityId: created[0] ?? videoId,
      summary: `Converted ${created.length} YouTube comment(s) to evidence (skipped ${skipped.length})`,
    });

    return {
      createdCount: created.length,
      skippedCount: skipped.length,
      evidenceIds: created,
      skippedEvidenceIds: skipped,
    };
  }

  async startImport(
    auth: AuthContext,
    videoId: string,
    input: z.infer<typeof importCommentsSchema>,
  ) {
    const video = await youTubeVideoRepository.findById(
      auth.organizationId,
      videoId,
    );
    if (!video) throw ApiError.notFound("Video not found");
    if (!video.commentsEnabled) {
      throw ApiError.badRequest("이 영상은 댓글이 비활성화되어 있습니다.");
    }

    const connection = await youTubeConnectionRepository.findByOrganization(
      auth.organizationId,
    );
    if (!connection || connection.status === "DISCONNECTED") {
      throw ApiError.badRequest("YouTube is not connected");
    }

    const job = await youTubeSyncJobRepository.create({
      organizationId: auth.organizationId,
      connectionId: connection.id,
      channelId: video.channelId,
      videoId: video.id,
      jobType:
        input.mode === "fast" ? "COMMENT_INCREMENTAL_SYNC" : "COMMENT_IMPORT",
      status: "RUNNING",
    });

    void this.runImportJob({
      auth,
      jobId: job.id,
      videoId: video.id,
      youtubeVideoId: video.youtubeVideoId,
      channelId: video.channelId,
      connectionId: connection.id,
      maxComments: input.maxComments,
      includeReplies: input.includeReplies,
      mode: input.mode,
    }).catch(async (error) => {
      await youTubeSyncJobRepository.complete(job.id, auth.organizationId, {
        status: "FAILED",
        errorCode: "COMMENT_IMPORT_FAILED",
        errorMessage: error instanceof Error ? error.message : "Import failed",
      });
      await prisma.youTubeVideo.update({
        where: { id: video.id },
        data: {
          syncStatus: "ERROR",
          lastErrorCode: "COMMENT_IMPORT_FAILED",
          lastErrorMessage:
            error instanceof Error ? error.message : "Import failed",
        },
      });
    });

    return { jobId: job.id, status: "RUNNING", queueMode: youtubeJobQueue.mode };
  }

  private async runImportJob(opts: {
    auth: AuthContext;
    jobId: string;
    videoId: string;
    youtubeVideoId: string;
    channelId: string;
    connectionId: string;
    maxComments: number;
    includeReplies: boolean;
    mode: "full" | "fast";
  }) {
    let created = 0;
    let updated = 0;
    let processed = 0;

    await prisma.youTubeVideo.update({
      where: { id: opts.videoId },
      data: {
        syncStatus: "SYNCING",
        lastErrorCode: null,
        lastErrorMessage: null,
      },
    });

    const connection = await youTubeConnectionRepository.findByOrganization(
      opts.auth.organizationId,
    );
    const useMock = isMockMode() && !connection?.encryptedAccessToken;

    if (useMock) {
      const mocks = mockCommentsForVideo(opts.youtubeVideoId, opts.maxComments);
      for (const item of mocks) {
        const existing = await prisma.youTubeComment.findFirst({
          where: {
            organizationId: opts.auth.organizationId,
            youtubeCommentId: item.youtubeCommentId,
          },
        });
        await youTubeCommentRepository.upsert({
          organizationId: opts.auth.organizationId,
          videoId: opts.videoId,
          channelId: opts.channelId,
          ...item,
          rawPayload: { mock: true },
        });
        if (existing) updated += 1;
        else created += 1;
        processed += 1;
        if (processed % 25 === 0) {
          await prisma.youTubeSyncJob.update({
            where: { id: opts.jobId },
            data: {
              processedCount: processed,
              createdCount: created,
              updatedCount: updated,
              totalExpected: opts.maxComments,
            },
          });
        }
      }
    } else {
      const accessToken = await youTubeConnectionService.getValidAccessToken(
        opts.auth.organizationId,
      );
      let pageToken: string | undefined;
      let consecutiveKnown = 0;

      while (processed < opts.maxComments) {
        const query: Record<string, string> = {
          part: "snippet,replies",
          videoId: opts.youtubeVideoId,
          maxResults: "100",
          textFormat: "plainText",
          order: "time",
        };
        if (pageToken) query.pageToken = pageToken;

        let data: {
          nextPageToken?: string;
          items?: ThreadItem[];
        };
        try {
          data = await youtubeApiGet("/commentThreads", accessToken, query);
          await recordYouTubeQuota({
            organizationId: opts.auth.organizationId,
            connectionId: opts.connectionId,
            operation: "commentThreads_list",
            videoId: opts.videoId,
            jobId: opts.jobId,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : "";
          if (/disabled|commentsDisabled/i.test(message)) {
            await prisma.youTubeVideo.update({
              where: { id: opts.videoId },
              data: {
                commentsEnabled: false,
                syncStatus: "COMMENTS_DISABLED",
              },
            });
            throw ApiError.badRequest(
              "이 영상은 댓글이 비활성화되어 있습니다.",
            );
          }
          throw error;
        }

        const items = data.items ?? [];
        if (items.length === 0) break;

        for (const thread of items) {
          if (processed >= opts.maxComments) break;
          const top = thread.snippet?.topLevelComment;
          const topId = top?.id || thread.id;
          const sn = top?.snippet;
          if (!sn?.textOriginal) continue;

          const existing = await prisma.youTubeComment.findFirst({
            where: {
              organizationId: opts.auth.organizationId,
              youtubeCommentId: topId,
            },
          });

          if (opts.mode === "fast" && existing) {
            consecutiveKnown += 1;
            if (consecutiveKnown >= 20) {
              pageToken = undefined;
              break;
            }
          } else {
            consecutiveKnown = 0;
          }

          const topLang = translationFieldsForText(sn.textOriginal);
          await youTubeCommentRepository.upsert({
            organizationId: opts.auth.organizationId,
            videoId: opts.videoId,
            channelId: opts.channelId,
            youtubeCommentId: topId,
            authorDisplayName: sn.authorDisplayName,
            authorChannelId: sn.authorChannelId,
            authorProfileImageUrl: sn.authorProfileImageUrl,
            textOriginal: sn.textOriginal,
            textDisplay: sn.textDisplay,
            likeCount: sn.likeCount ?? 0,
            replyCount: thread.snippet?.totalReplyCount ?? 0,
            publishedAt: sn.publishedAt ? new Date(sn.publishedAt) : null,
            updatedAtSource: sn.updatedAt ? new Date(sn.updatedAt) : null,
            moderationStatus: sn.moderationStatus,
            isTopLevel: true,
            sourceUrl: `${buildYouTubeWatchUrl(opts.youtubeVideoId)}&lc=${topId}`,
            rawPayload: {
              id: topId,
              likeCount: sn.likeCount,
              publishedAt: sn.publishedAt,
            },
            ...topLang,
          });
          if (existing) updated += 1;
          else created += 1;
          processed += 1;

          if (opts.includeReplies) {
            const replyItems = thread.replies?.comments ?? [];
            for (const reply of replyItems) {
              if (processed >= opts.maxComments) break;
              const r = reply.snippet;
              if (!r?.textOriginal) continue;
              const replyExisting = await prisma.youTubeComment.findFirst({
                where: {
                  organizationId: opts.auth.organizationId,
                  youtubeCommentId: reply.id,
                },
              });
              const replyLang = translationFieldsForText(r.textOriginal);
              await youTubeCommentRepository.upsert({
                organizationId: opts.auth.organizationId,
                videoId: opts.videoId,
                channelId: opts.channelId,
                youtubeCommentId: reply.id,
                parentYoutubeCommentId: r.parentId || topId,
                authorDisplayName: r.authorDisplayName,
                authorChannelId: r.authorChannelId,
                authorProfileImageUrl: r.authorProfileImageUrl,
                textOriginal: r.textOriginal,
                textDisplay: r.textDisplay,
                likeCount: r.likeCount ?? 0,
                publishedAt: r.publishedAt ? new Date(r.publishedAt) : null,
                updatedAtSource: r.updatedAt ? new Date(r.updatedAt) : null,
                moderationStatus: r.moderationStatus,
                isTopLevel: false,
                sourceUrl: `${buildYouTubeWatchUrl(opts.youtubeVideoId)}&lc=${reply.id}`,
                rawPayload: { id: reply.id, parentId: r.parentId },
                ...replyLang,
              });
              if (replyExisting) updated += 1;
              else created += 1;
              processed += 1;
            }
          }
        }

        await prisma.youTubeSyncJob.update({
          where: { id: opts.jobId },
          data: {
            processedCount: processed,
            createdCount: created,
            updatedCount: updated,
            totalExpected: opts.maxComments,
            nextPageToken: data.nextPageToken ?? null,
          },
        });

        if (opts.mode === "fast" && consecutiveKnown >= 20) break;
        pageToken = data.nextPageToken;
        if (!pageToken) break;
      }
    }

    await youTubeSyncJobRepository.complete(
      opts.jobId,
      opts.auth.organizationId,
      {
        status: processed >= opts.maxComments ? "PARTIAL" : "COMPLETED",
        processedCount: processed,
        createdCount: created,
        updatedCount: updated,
      },
    );

    await prisma.youTubeVideo.update({
      where: { id: opts.videoId },
      data: {
        syncStatus: processed >= opts.maxComments ? "PARTIAL" : "SYNCED",
        lastCommentSyncedAt: new Date(),
        commentCount: await youTubeCommentRepository.countByVideo(
          opts.auth.organizationId,
          opts.videoId,
        ),
      },
    });

    await activityRepository.create({
      organizationId: opts.auth.organizationId,
      userId: opts.auth.userId,
      action: "CREATE",
      entityType: "youtube_comment_import",
      entityId: opts.videoId,
      summary: `Imported YouTube comments (+${created} / ${updated} updated)`,
    });
  }
}

export const youTubeCommentService = new YouTubeCommentService();
