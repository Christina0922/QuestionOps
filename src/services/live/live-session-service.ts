import { z } from "zod";
import type { QuestionStatus } from "@prisma/client";
import { ApiError } from "@/lib/api-error";
import { detectMessageType } from "@/lib/live/detect-question";
import { assertTransition } from "@/lib/live/question-transitions";
import { activityRepository } from "@/repositories/activity-repository";
import { prisma } from "@/lib/prisma";
import { createOpenAIClient } from "@/services/ai/openai-client";
import type { AuthContext } from "@/types";

export const createSessionSchema = z.object({
  title: z.string().trim().min(1).max(300),
  description: z.string().trim().max(5000).optional().nullable(),
  youtubeVideoId: z.string().optional().nullable(),
  youtubeConnectionId: z.string().optional().nullable(),
  scheduledStartAt: z.string().datetime().optional().nullable(),
});

export const importSubmissionsSchema = z.object({
  source: z.enum(["mock", "youtube_comments"]).default("mock"),
  youtubeVideoDbId: z.string().optional(),
  maxItems: z.coerce.number().int().min(1).max(1000).default(100),
});

async function log(
  auth: AuthContext,
  liveSessionId: string,
  entityType: string,
  entityId: string,
  summary: string,
  action: "CREATE" | "UPDATE" | "DELETE" = "UPDATE",
) {
  await activityRepository.create({
    organizationId: auth.organizationId,
    userId: auth.userId,
    action,
    entityType,
    entityId,
    summary,
    metadata: { liveSessionId },
  });
}

async function refreshSessionCounts(sessionId: string) {
  const [totalSubmissions, totalQuestions, answeredLiveCount, partiallyAnsweredCount, unansweredCount, publishedAnswerCount] =
    await Promise.all([
      prisma.submission.count({
        where: { liveSessionId: sessionId, deletedAt: null },
      }),
      prisma.question.count({
        where: { liveSessionId: sessionId, deletedAt: null },
      }),
      prisma.question.count({
        where: {
          liveSessionId: sessionId,
          deletedAt: null,
          status: "ANSWERED_LIVE",
        },
      }),
      prisma.question.count({
        where: {
          liveSessionId: sessionId,
          deletedAt: null,
          status: "PARTIALLY_ANSWERED_LIVE",
        },
      }),
      prisma.question.count({
        where: {
          liveSessionId: sessionId,
          deletedAt: null,
          status: { in: ["UNANSWERED", "POST_REVIEW_PENDING"] },
        },
      }),
      prisma.question.count({
        where: {
          liveSessionId: sessionId,
          deletedAt: null,
          status: "PUBLISHED",
        },
      }),
    ]);

  return prisma.liveSession.update({
    where: { id: sessionId },
    data: {
      totalSubmissions,
      totalQuestions,
      answeredLiveCount,
      partiallyAnsweredCount,
      unansweredCount,
      publishedAnswerCount,
    },
  });
}

async function getSession(organizationId: string, id: string) {
  const session = await prisma.liveSession.findFirst({
    where: { id, organizationId, deletedAt: null },
  });
  if (!session) throw ApiError.notFound("Live session not found");
  return session;
}

async function transitionQuestion(
  auth: AuthContext,
  sessionId: string,
  questionId: string,
  to: QuestionStatus,
  extra: Record<string, unknown> = {},
) {
  const q = await prisma.question.findFirst({
    where: {
      id: questionId,
      organizationId: auth.organizationId,
      liveSessionId: sessionId,
      deletedAt: null,
    },
  });
  if (!q) throw ApiError.notFound("Question not found");
  try {
    assertTransition(q.status, to);
  } catch (e) {
    throw ApiError.badRequest(e instanceof Error ? e.message : "Bad transition");
  }

  const now = new Date();
  const data: Record<string, unknown> = { status: to, ...extra };
  if (to === "ACCEPTED") data.acceptedAt = now;
  if (to === "PRESENTED_TO_SPEAKER") data.presentedAt = now;
  if (to === "ANSWERING_LIVE") data.answeringStartedAt = now;
  if (to === "ANSWERED_LIVE" || to === "PARTIALLY_ANSWERED_LIVE") {
    data.answeredAt = now;
  }
  if (to === "PUBLISHED") data.publishedAt = now;
  if (to === "RESOLVED") data.resolvedAt = now;

  const updated = await prisma.question.update({
    where: { id: q.id },
    data,
  });
  await refreshSessionCounts(sessionId);
  await log(
    auth,
    sessionId,
    "question",
    q.id,
    `Question ${q.status} → ${to}`,
  );
  return updated;
}

export class LiveSessionService {
  async list(organizationId: string) {
    return prisma.liveSession.findMany({
      where: { organizationId, deletedAt: null },
      orderBy: { updatedAt: "desc" },
    });
  }

  async get(organizationId: string, id: string) {
    const session = await getSession(organizationId, id);
    const [queue, current, recent] = await Promise.all([
      prisma.queueItem.findMany({
        where: {
          liveSessionId: id,
          status: { in: ["WAITING", "NEXT", "PRESENTED", "ANSWERING"] },
        },
        include: { question: true },
        orderBy: [{ manualPosition: "asc" }, { defaultPosition: "asc" }],
      }),
      prisma.question.findFirst({
        where: {
          liveSessionId: id,
          status: { in: ["PRESENTED_TO_SPEAKER", "ANSWERING_LIVE"] },
          deletedAt: null,
        },
        include: { submission: true, childQuestions: true },
      }),
      prisma.question.findMany({
        where: {
          liveSessionId: id,
          status: {
            in: [
              "ANSWERED_LIVE",
              "PARTIALLY_ANSWERED_LIVE",
              "UNANSWERED",
              "EXCLUDED",
              "DUPLICATE",
            ],
          },
          deletedAt: null,
        },
        orderBy: { updatedAt: "desc" },
        take: 10,
      }),
    ]);
    return { ...session, queue, currentQuestion: current, recentQuestions: recent };
  }

  async create(auth: AuthContext, input: z.infer<typeof createSessionSchema>) {
    const session = await prisma.liveSession.create({
      data: {
        organizationId: auth.organizationId,
        title: input.title,
        description: input.description ?? null,
        youtubeVideoId: input.youtubeVideoId ?? null,
        youtubeConnectionId: input.youtubeConnectionId ?? null,
        scheduledStartAt: input.scheduledStartAt
          ? new Date(input.scheduledStartAt)
          : null,
        status: "DRAFT",
        moderatorId: auth.userId,
      },
    });
    await log(auth, session.id, "live_session", session.id, `Created session "${session.title}"`, "CREATE");
    return session;
  }

  async updateStatus(
    auth: AuthContext,
    id: string,
    status: z.infer<typeof createSessionSchema> extends never ? never : string,
  ) {
    await getSession(auth.organizationId, id);
    const session = await prisma.liveSession.update({
      where: { id },
      data: {
        status: status as never,
        ...(status === "LIVE" ? { actualStartAt: new Date() } : {}),
        ...(status === "ENDED" || status === "PROCESSING"
          ? { actualEndAt: new Date() }
          : {}),
      },
    });
    await log(auth, id, "live_session", id, `Session status → ${status}`);
    return session;
  }

  async importSubmissions(
    auth: AuthContext,
    sessionId: string,
    input: z.infer<typeof importSubmissionsSchema>,
  ) {
    const session = await getSession(auth.organizationId, sessionId);
    const samples = [
      "초보자도 가능한가요?",
      "비용은 얼마인가요?",
      "준비물은 무엇인가요?",
      "오늘 강의 정말 유익해요!",
      "환불은 어떻게 하나요?",
      "다음 일정은 언제인가요?",
      "화면이 안 보여요 오류나요",
      "ㅋㅋㅋ 맞아요",
      "구독하고 무료 코인 받기 bit.ly/spam",
      "강의 자료 링크 주세요",
      "결제했는데 접속이 안 돼요",
      "질문이 있습니다. API는 어떻게 쓰나요?",
    ];

    let created = 0;
    let questions = 0;

    if (input.source === "youtube_comments" && input.youtubeVideoDbId) {
      const comments = await prisma.youTubeComment.findMany({
        where: {
          organizationId: auth.organizationId,
          videoId: input.youtubeVideoDbId,
          deletedAt: null,
        },
        take: input.maxItems,
        orderBy: { publishedAt: "desc" },
      });
      for (const c of comments) {
        const detection = detectMessageType(c.textOriginal);
        const sub = await prisma.submission.upsert({
          where: {
            organizationId_sourceType_externalId: {
              organizationId: auth.organizationId,
              sourceType: "YOUTUBE_COMMENT",
              externalId: c.youtubeCommentId,
            },
          },
          create: {
            organizationId: auth.organizationId,
            liveSessionId: session.id,
            sourceType: "YOUTUBE_COMMENT",
            externalId: c.youtubeCommentId,
            authorDisplayName: c.authorDisplayName,
            authorExternalId: c.authorChannelId,
            originalText: c.textOriginal,
            normalizedText: c.textOriginal.trim(),
            detectedLanguage: c.detectedLanguage,
            publishedAt: c.publishedAt ?? new Date(),
            likeCount: c.likeCount,
            replyCount: c.replyCount,
            sourceUrl: c.sourceUrl,
            messageType: detection.messageType,
            lastSeenAt: new Date(),
          },
          update: {
            lastSeenAt: new Date(),
            likeCount: c.likeCount,
            messageType: detection.messageType,
          },
        });
        created += 1;
        if (detection.isQuestionCandidate) {
          const existing = await prisma.question.findFirst({
            where: { submissionId: sub.id },
          });
          if (!existing) {
            await prisma.question.create({
              data: {
                organizationId: auth.organizationId,
                liveSessionId: session.id,
                submissionId: sub.id,
                questionText: c.textOriginal,
                normalizedQuestion: c.textOriginal.trim(),
                detectedLanguage: c.detectedLanguage,
                status: "NEEDS_REVIEW",
                priority: detection.messageType === "TECHNICAL_ISSUE" ? "HIGH" : "NORMAL",
              },
            });
            questions += 1;
          }
        }
      }
    } else {
      for (let i = 0; i < Math.min(input.maxItems, samples.length * 5); i++) {
        const text = samples[i % samples.length]!;
        const externalId = `mock_${session.id}_${i + 1}`;
        const detection = detectMessageType(text);
        const sub = await prisma.submission.upsert({
          where: {
            organizationId_sourceType_externalId: {
              organizationId: auth.organizationId,
              sourceType: "YOUTUBE_LIVE_CHAT",
              externalId,
            },
          },
          create: {
            organizationId: auth.organizationId,
            liveSessionId: session.id,
            sourceType: "YOUTUBE_LIVE_CHAT",
            externalId,
            authorDisplayName: `Viewer${(i % 20) + 1}`,
            originalText: text,
            normalizedText: text,
            publishedAt: new Date(Date.now() - i * 60_000),
            messageType: detection.messageType,
            lastSeenAt: new Date(),
          },
          update: { lastSeenAt: new Date(), messageType: detection.messageType },
        });
        created += 1;
        if (detection.isQuestionCandidate) {
          const existing = await prisma.question.findFirst({
            where: { submissionId: sub.id },
          });
          if (!existing) {
            await prisma.question.create({
              data: {
                organizationId: auth.organizationId,
                liveSessionId: session.id,
                submissionId: sub.id,
                questionText: text,
                normalizedQuestion: text,
                status: "NEEDS_REVIEW",
                priority:
                  detection.messageType === "TECHNICAL_ISSUE" ? "HIGH" : "NORMAL",
              },
            });
            questions += 1;
          }
        }
      }
    }

    await refreshSessionCounts(session.id);
    await log(
      auth,
      session.id,
      "submission_import",
      session.id,
      `Imported submissions (+${created}, questions ${questions})`,
      "CREATE",
    );
    return { created, questionsDetected: questions };
  }

  async listQuestions(
    organizationId: string,
    sessionId: string,
    status?: string,
  ) {
    await getSession(organizationId, sessionId);
    return prisma.question.findMany({
      where: {
        organizationId,
        liveSessionId: sessionId,
        deletedAt: null,
        ...(status ? { status: status as QuestionStatus } : {}),
      },
      include: { submission: true, cluster: true, queueItem: true },
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    });
  }

  async listSubmissions(organizationId: string, sessionId: string) {
    await getSession(organizationId, sessionId);
    return prisma.submission.findMany({
      where: { organizationId, liveSessionId: sessionId, deletedAt: null },
      include: { question: true },
      orderBy: { publishedAt: "desc" },
      take: 200,
    });
  }

  async acceptQuestion(auth: AuthContext, sessionId: string, questionId: string) {
    const q = await transitionQuestion(auth, sessionId, questionId, "ACCEPTED");
    const queued = await transitionQuestion(auth, sessionId, questionId, "QUEUED");
    const maxPos = await prisma.queueItem.aggregate({
      where: { liveSessionId: sessionId },
      _max: { defaultPosition: true },
    });
    await prisma.queueItem.upsert({
      where: { questionId },
      create: {
        organizationId: auth.organizationId,
        liveSessionId: sessionId,
        questionId,
        defaultPosition: (maxPos._max.defaultPosition ?? 0) + 1,
        status: "WAITING",
      },
      update: { status: "WAITING", removedAt: null },
    });
    return queued ?? q;
  }

  async rejectQuestion(
    auth: AuthContext,
    sessionId: string,
    questionId: string,
    reason?: string,
  ) {
    return transitionQuestion(auth, sessionId, questionId, "REJECTED", {
      rejectionReason: reason ?? null,
    });
  }

  async excludeQuestion(
    auth: AuthContext,
    sessionId: string,
    questionId: string,
    reason?: string,
  ) {
    await prisma.queueItem.updateMany({
      where: { questionId },
      data: { status: "REMOVED", removedAt: new Date() },
    });
    return transitionQuestion(auth, sessionId, questionId, "EXCLUDED", {
      exclusionReason: reason ?? null,
    });
  }

  async markDuplicate(
    auth: AuthContext,
    sessionId: string,
    questionId: string,
  ) {
    await prisma.queueItem.updateMany({
      where: { questionId },
      data: { status: "REMOVED", removedAt: new Date() },
    });
    return transitionQuestion(auth, sessionId, questionId, "DUPLICATE");
  }

  async present(auth: AuthContext, sessionId: string, questionId: string) {
    await prisma.queueItem.updateMany({
      where: { questionId },
      data: { status: "PRESENTED", presentedAt: new Date() },
    });
    return transitionQuestion(
      auth,
      sessionId,
      questionId,
      "PRESENTED_TO_SPEAKER",
    );
  }

  async startAnswer(auth: AuthContext, sessionId: string, questionId: string) {
    await prisma.queueItem.updateMany({
      where: { questionId },
      data: { status: "ANSWERING" },
    });
    return transitionQuestion(auth, sessionId, questionId, "ANSWERING_LIVE");
  }

  async answerLive(auth: AuthContext, sessionId: string, questionId: string) {
    await prisma.liveAnswer.create({
      data: {
        organizationId: auth.organizationId,
        liveSessionId: sessionId,
        questionId,
        answeredBy: auth.userId,
        completeness: "COMPLETE",
        reviewStatus: "UNREVIEWED",
      },
    });
    await prisma.queueItem.updateMany({
      where: { questionId },
      data: { status: "COMPLETED" },
    });
    return transitionQuestion(auth, sessionId, questionId, "ANSWERED_LIVE");
  }

  async partialAnswer(
    auth: AuthContext,
    sessionId: string,
    questionId: string,
    childTexts?: string[],
  ) {
    const parent = await prisma.question.findFirst({
      where: { id: questionId, liveSessionId: sessionId },
    });
    if (!parent) throw ApiError.notFound("Question not found");

    await prisma.liveAnswer.create({
      data: {
        organizationId: auth.organizationId,
        liveSessionId: sessionId,
        questionId,
        answeredBy: auth.userId,
        completeness: "PARTIAL",
        reviewStatus: "UNREVIEWED",
      },
    });

    const children = childTexts?.length
      ? childTexts
      : parent.questionText
          .split(/[?\n]/)
          .map((s) => s.trim())
          .filter((s) => s.length > 2)
          .slice(1);

    for (const text of children) {
      await prisma.question.create({
        data: {
          organizationId: auth.organizationId,
          liveSessionId: sessionId,
          parentQuestionId: questionId,
          questionText: text.endsWith("?") ? text : `${text}?`,
          status: "UNANSWERED",
          priority: parent.priority,
        },
      });
    }

    if (children.length === 0) {
      // still mark partial without children
    } else {
      // first child answered if we had split from compound - leave unanswered
    }

    await prisma.queueItem.updateMany({
      where: { questionId },
      data: { status: "COMPLETED" },
    });
    return transitionQuestion(
      auth,
      sessionId,
      questionId,
      "PARTIALLY_ANSWERED_LIVE",
    );
  }

  async defer(auth: AuthContext, sessionId: string, questionId: string) {
    await prisma.queueItem.updateMany({
      where: { questionId },
      data: { status: "DEFERRED" },
    });
    return transitionQuestion(auth, sessionId, questionId, "UNANSWERED");
  }

  async setImportant(
    auth: AuthContext,
    sessionId: string,
    questionId: string,
    important: boolean,
  ) {
    await getSession(auth.organizationId, sessionId);
    return prisma.question.update({
      where: { id: questionId },
      data: {
        isImportant: important,
        priority: important ? "HIGH" : "NORMAL",
      },
    });
  }

  async mergeQuestions(
    auth: AuthContext,
    sessionId: string,
    questionIds: string[],
    representativeText?: string,
  ) {
    if (questionIds.length < 2) {
      throw ApiError.badRequest("Need at least 2 questions to merge");
    }
    const questions = await prisma.question.findMany({
      where: {
        id: { in: questionIds },
        liveSessionId: sessionId,
        organizationId: auth.organizationId,
      },
    });
    if (questions.length !== questionIds.length) {
      throw ApiError.badRequest("Some questions not found");
    }
    const rep = representativeText ?? questions[0]!.questionText;
    const cluster = await prisma.questionCluster.create({
      data: {
        organizationId: auth.organizationId,
        liveSessionId: sessionId,
        representativeQuestion: rep,
        summary: `Merged ${questions.length} questions`,
        status: "APPROVED",
        questionCount: questions.length,
        uniqueAuthorCount: questions.length,
        createdBy: auth.userId,
        approvedBy: auth.userId,
        approvedAt: new Date(),
      },
    });
    await prisma.question.updateMany({
      where: { id: { in: questionIds } },
      data: { clusterId: cluster.id },
    });
    await prisma.question.update({
      where: { id: questions[0]!.id },
      data: { isRepresentative: true, questionText: rep },
    });
    for (const q of questions.slice(1)) {
      await transitionQuestion(auth, sessionId, q.id, "DUPLICATE");
    }
    await log(
      auth,
      sessionId,
      "question_cluster",
      cluster.id,
      `Merged ${questionIds.length} questions`,
      "CREATE",
    );
    return cluster;
  }

  async prepareReview(auth: AuthContext, sessionId: string) {
    const session = await getSession(auth.organizationId, sessionId);
    await prisma.liveSession.update({
      where: { id: sessionId },
      data: { status: "PROCESSING", transcriptStatus: "PROCESSING" },
    });

    // Mock transcript segments
    const answered = await prisma.question.findMany({
      where: {
        liveSessionId: sessionId,
        status: { in: ["ANSWERED_LIVE", "PARTIALLY_ANSWERED_LIVE"] },
      },
      take: 20,
    });

    let t = 60;
    for (const q of answered) {
      const seg = await prisma.transcriptSegment.create({
        data: {
          organizationId: auth.organizationId,
          liveSessionId: sessionId,
          source: "AUTOMATIC_SPEECH_RECOGNITION",
          speakerLabel: "Instructor",
          startSeconds: t,
          endSeconds: t + 45,
          originalText: `네, ${q.questionText}에 대해 말씀드리면...`,
          confidence: 0.7,
        },
      });
      await prisma.questionAnswerMatch.create({
        data: {
          organizationId: auth.organizationId,
          questionId: q.id,
          transcriptSegmentId: seg.id,
          matchScore: 0.72,
          matchReason: "keyword overlap (mock)",
          status: "AI_SUGGESTED",
        },
      });
      const videoId = session.youtubeVideoId || "VIDEO_ID";
      await prisma.liveAnswer.updateMany({
        where: { questionId: q.id },
        data: {
          startSeconds: t,
          endSeconds: t + 45,
          timestampUrl: `https://www.youtube.com/watch?v=${videoId}&t=${t}`,
          transcriptText: seg.originalText,
          reviewStatus: "AI_SUGGESTED",
        },
      });
      t += 90;
    }

    for (const q of answered) {
      await transitionQuestion(auth, sessionId, q.id, "POST_REVIEW_PENDING").catch(
        () => undefined,
      );
    }

    // Move leftover queued to unanswered
    const leftover = await prisma.question.findMany({
      where: {
        liveSessionId: sessionId,
        status: {
          in: [
            "QUEUED",
            "WAITING",
            "ACCEPTED",
            "PRESENTED_TO_SPEAKER",
            "ANSWERING_LIVE",
          ],
        },
      },
    });
    for (const q of leftover) {
      await transitionQuestion(auth, sessionId, q.id, "UNANSWERED").catch(
        async () => {
          await prisma.question.update({
            where: { id: q.id },
            data: { status: "UNANSWERED" },
          });
        },
      );
    }

    await prisma.liveSession.update({
      where: { id: sessionId },
      data: {
        status: "REVIEW_READY",
        transcriptStatus: "AVAILABLE",
        lastSyncedAt: new Date(),
      },
    });
    await refreshSessionCounts(sessionId);
    await log(auth, sessionId, "live_session", sessionId, "Post-live review prepared");
    return this.getReview(auth.organizationId, sessionId);
  }

  async getReview(organizationId: string, sessionId: string) {
    const session = await getSession(organizationId, sessionId);
    const questions = await prisma.question.findMany({
      where: { liveSessionId: sessionId, deletedAt: null },
      include: {
        submission: true,
        liveAnswers: true,
        questionAnswerMatches: { include: { transcriptSegment: true } },
        childQuestions: true,
      },
      orderBy: { createdAt: "asc" },
    });
    const counts = {
      total: questions.length,
      answeredLive: questions.filter((q) => q.status === "ANSWERED_LIVE").length,
      partial: questions.filter((q) => q.status === "PARTIALLY_ANSWERED_LIVE")
        .length,
      unanswered: questions.filter((q) =>
        ["UNANSWERED", "POST_REVIEW_PENDING"].includes(q.status),
      ).length,
      duplicate: questions.filter((q) => q.status === "DUPLICATE").length,
      needsReview: questions.filter((q) =>
        ["NEEDS_REVIEW", "POST_REVIEW_PENDING"].includes(q.status),
      ).length,
      excluded: questions.filter((q) => q.status === "EXCLUDED").length,
    };
    return { session, counts, questions };
  }

  async confirmReviewStatus(
    auth: AuthContext,
    sessionId: string,
    questionId: string,
    status: "ANSWERED_LIVE" | "PARTIALLY_ANSWERED_LIVE" | "UNANSWERED",
  ) {
    return transitionQuestion(auth, sessionId, questionId, status);
  }

  async listUnanswered(organizationId: string, sessionId: string) {
    await getSession(organizationId, sessionId);
    return prisma.question.findMany({
      where: {
        liveSessionId: sessionId,
        deletedAt: null,
        status: {
          in: [
            "UNANSWERED",
            "PARTIALLY_ANSWERED_LIVE",
            "POST_REVIEW_PENDING",
            "ANSWER_DRAFTED",
            "ANSWER_IN_REVIEW",
          ],
        },
      },
      include: { submission: true, textAnswers: true, liveAnswers: true },
      orderBy: [{ isImportant: "desc" }, { createdAt: "asc" }],
    });
  }

  async generateAnswerDraft(
    auth: AuthContext,
    sessionId: string,
    questionId: string,
  ) {
    const q = await prisma.question.findFirst({
      where: {
        id: questionId,
        liveSessionId: sessionId,
        organizationId: auth.organizationId,
      },
      include: { liveAnswers: true },
    });
    if (!q) throw ApiError.notFound("Question not found");

    const liveSummary = q.liveAnswers[0]?.transcriptText;
    let draft = `안녕하세요.\n\n질문: ${q.questionText}\n\n`;
    if (liveSummary) {
      draft += `생방송에서 안내드린 내용: ${liveSummary}\n\n`;
    }
    draft +=
      "자세한 일정/가격/정책은 운영 안내를 확인해 주세요. 추가 문의는 언제든 남겨 주세요.";

    let answerable = true;
    let missingInformation: string[] = [];
    let confidence = 0.55;
    const client = createOpenAIClient();
    if (client && process.env.AI_PROVIDER !== "mock") {
      try {
        const content = await client.complete([
          {
            role: "system",
            content:
              'Draft an instructor-facing answer in Korean. JSON: {"draft":"...","answerable":true,"confidence":0.5,"missingInformation":[],"warnings":[],"requiresInstructorReview":true}',
          },
          { role: "user", content: q.questionText },
        ]);
        const start = content.indexOf("{");
        const end = content.lastIndexOf("}");
        if (start >= 0 && end > start) {
          const parsed = JSON.parse(content.slice(start, end + 1)) as {
            draft?: string;
            answerable?: boolean;
            confidence?: number;
            missingInformation?: string[];
          };
          if (parsed.draft) draft = parsed.draft;
          if (typeof parsed.answerable === "boolean")
            answerable = parsed.answerable;
          if (typeof parsed.confidence === "number")
            confidence = parsed.confidence;
          if (Array.isArray(parsed.missingInformation))
            missingInformation = parsed.missingInformation;
        }
      } catch {
        /* template */
      }
    }

    if (/가격|비용|얼마|price/i.test(q.questionText)) {
      missingInformation.push("가격 정보 확인 필요");
      answerable = false;
      confidence = Math.min(confidence, 0.4);
    }

    const existing = await prisma.textAnswer.findFirst({
      where: { questionId, status: { not: "ARCHIVED" } },
    });
    const textAnswer = existing
      ? await prisma.textAnswer.update({
          where: { id: existing.id },
          data: {
            aiDraft: draft,
            currentDraft: draft,
            draftSource: "AI",
            status: "AI_GENERATED",
            evidenceSummary: missingInformation.join("; ") || null,
          },
        })
      : await prisma.textAnswer.create({
          data: {
            organizationId: auth.organizationId,
            questionId,
            draftSource: "AI",
            aiDraft: draft,
            currentDraft: draft,
            status: "AI_GENERATED",
            createdBy: auth.userId,
            evidenceSummary: missingInformation.join("; ") || null,
          },
        });

    await transitionQuestion(auth, sessionId, questionId, "ANSWER_DRAFTED").catch(
      () => undefined,
    );
    return {
      textAnswer,
      meta: {
        answerable,
        confidence,
        missingInformation,
        requiresInstructorReview: true,
      },
    };
  }

  async updateTextAnswer(
    auth: AuthContext,
    answerId: string,
    currentDraft: string,
  ) {
    const answer = await prisma.textAnswer.findFirst({
      where: { id: answerId, organizationId: auth.organizationId },
    });
    if (!answer) throw ApiError.notFound("Text answer not found");
    return prisma.textAnswer.update({
      where: { id: answerId },
      data: {
        currentDraft,
        status: "DRAFT",
        reviewedBy: auth.userId,
      },
    });
  }

  async approveTextAnswer(auth: AuthContext, answerId: string) {
    const answer = await prisma.textAnswer.findFirst({
      where: { id: answerId, organizationId: auth.organizationId },
      include: { question: true },
    });
    if (!answer) throw ApiError.notFound("Text answer not found");
    const finalAnswer = answer.currentDraft || answer.aiDraft || "";
    const updated = await prisma.textAnswer.update({
      where: { id: answerId },
      data: {
        finalAnswer,
        status: "APPROVED",
        approvedBy: auth.userId,
        approvedAt: new Date(),
      },
    });
    await transitionQuestion(
      auth,
      answer.question.liveSessionId,
      answer.questionId,
      "ANSWER_APPROVED",
    ).catch(() => undefined);
    await transitionQuestion(
      auth,
      answer.question.liveSessionId,
      answer.questionId,
      "READY_TO_PUBLISH",
    ).catch(() => undefined);
    return updated;
  }

  async createPublication(
    auth: AuthContext,
    sessionId: string,
    input: {
      title: string;
      introduction?: string;
      closing?: string;
      channelType: "YOUTUBE_COMMUNITY" | "KAKAO_GROUP" | "EMAIL" | "OTHER";
      formatType: "SHORT_QA" | "FAQ" | "KAKAO_MESSAGE" | "EMAIL" | "DETAILED_QA";
      questionIds: string[];
    },
  ) {
    await getSession(auth.organizationId, sessionId);
    const questions = await prisma.question.findMany({
      where: {
        id: { in: input.questionIds },
        liveSessionId: sessionId,
        status: { in: ["ANSWER_APPROVED", "READY_TO_PUBLISH", "PUBLISHED"] },
      },
      include: {
        textAnswers: {
          where: { status: { in: ["APPROVED", "READY_TO_PUBLISH", "PUBLISHED"] } },
          take: 1,
        },
      },
    });
    if (questions.length === 0) {
      throw ApiError.badRequest("No approved answers selected");
    }

    const lines = questions.map((q, i) => {
      const a =
        q.textAnswers[0]?.finalAnswer ||
        q.textAnswers[0]?.currentDraft ||
        "(답변 없음)";
      return `Q${i + 1}. ${q.questionText}\nA. ${a}`;
    });
    const content = [
      input.introduction ?? "",
      "",
      ...lines,
      "",
      input.closing ?? "감사합니다.",
    ]
      .filter((x, idx, arr) => !(x === "" && arr[idx - 1] === ""))
      .join("\n");

    const publication = await prisma.publication.create({
      data: {
        organizationId: auth.organizationId,
        liveSessionId: sessionId,
        title: input.title,
        introduction: input.introduction,
        content,
        closing: input.closing,
        channelType: input.channelType,
        formatType: input.formatType,
        status: "READY",
        items: {
          create: questions.map((q, i) => ({
            questionId: q.id,
            textAnswerId: q.textAnswers[0]?.id,
            position: i + 1,
            questionText: q.questionText,
            answerText:
              q.textAnswers[0]?.finalAnswer ||
              q.textAnswers[0]?.currentDraft ||
              "",
          })),
        },
      },
      include: { items: true },
    });
    await log(
      auth,
      sessionId,
      "publication",
      publication.id,
      `Created publication "${publication.title}"`,
      "CREATE",
    );
    return publication;
  }

  async markPublication(
    auth: AuthContext,
    publicationId: string,
    action: "copied" | "published",
    externalUrl?: string,
  ) {
    const pub = await prisma.publication.findFirst({
      where: { id: publicationId, organizationId: auth.organizationId },
      include: { items: true },
    });
    if (!pub) throw ApiError.notFound("Publication not found");
    const updated = await prisma.publication.update({
      where: { id: publicationId },
      data:
        action === "copied"
          ? { status: "COPIED", copiedAt: new Date() }
          : {
              status: "PUBLISHED",
              publishedAt: new Date(),
              publishedBy: auth.userId,
              externalUrl: externalUrl ?? null,
            },
    });
    if (action === "published") {
      for (const item of pub.items) {
        await transitionQuestion(
          auth,
          pub.liveSessionId,
          item.questionId,
          "PUBLISHED",
        ).catch(() => undefined);
        await transitionQuestion(
          auth,
          pub.liveSessionId,
          item.questionId,
          "RESOLVED",
        ).catch(() => undefined);
      }
      await refreshSessionCounts(pub.liveSessionId);
    }
    return updated;
  }

  async promoteKnowledge(
    auth: AuthContext,
    sessionId: string,
    questionId: string,
  ) {
    const q = await prisma.question.findFirst({
      where: {
        id: questionId,
        liveSessionId: sessionId,
        organizationId: auth.organizationId,
      },
      include: {
        textAnswers: { where: { status: "APPROVED" }, take: 1 },
      },
    });
    if (!q) throw ApiError.notFound("Question not found");
    const answer =
      q.textAnswers[0]?.finalAnswer ||
      q.textAnswers[0]?.currentDraft ||
      "";
    if (!answer) throw ApiError.badRequest("Approved answer required");

    const knowledge = await prisma.knowledge.create({
      data: {
        organizationId: auth.organizationId,
        title: q.questionText.slice(0, 200),
        description: answer,
        confidence: 0.8,
        authorId: auth.userId,
      },
    });
    await log(
      auth,
      sessionId,
      "knowledge",
      knowledge.id,
      `Promoted question to Knowledge`,
      "CREATE",
    );
    return knowledge;
  }

  async createCapabilityFromKnowledge(
    auth: AuthContext,
    knowledgeId: string,
  ) {
    const k = await prisma.knowledge.findFirst({
      where: { id: knowledgeId, organizationId: auth.organizationId },
    });
    if (!k) throw ApiError.notFound("Knowledge not found");
    return prisma.capability.create({
      data: {
        organizationId: auth.organizationId,
        knowledgeId: k.id,
        name: `운영 절차: ${k.title.slice(0, 80)}`,
        description: `반복 질문 "${k.title}"을 줄이기 위한 표준 절차`,
        standardProcedure: [
          "1. 방송 24시간 전 FAQ/준비물 안내 발송",
          "2. 고정 댓글·설명란에 핵심 정보 게시",
          "3. 방송 종료 후 미답변 검토",
          "4. 승인 답변을 Q&A 게시물로 발행",
        ].join("\n"),
        checklist: [
          "사전 안내 발송 여부",
          "고정 댓글 업데이트",
          "미답변 검토 완료",
        ],
        expectedOutcome: "동일 질문 유입 감소 및 사후 정리 시간 단축",
        authorId: auth.userId,
      },
    });
  }

  async dashboard(organizationId: string) {
    const sessions = await prisma.liveSession.findMany({
      where: { organizationId, deletedAt: null },
      orderBy: { updatedAt: "desc" },
      take: 10,
    });
    const today = sessions.filter((s) => {
      const d = s.actualStartAt || s.scheduledStartAt || s.createdAt;
      return d.toDateString() === new Date().toDateString();
    });
    const totals = sessions.reduce(
      (acc, s) => {
        acc.questions += s.totalQuestions;
        acc.answered += s.answeredLiveCount;
        acc.partial += s.partiallyAnsweredCount;
        acc.unanswered += s.unansweredCount;
        acc.published += s.publishedAnswerCount;
        return acc;
      },
      { questions: 0, answered: 0, partial: 0, unanswered: 0, published: 0 },
    );
    const draftCount = await prisma.textAnswer.count({
      where: {
        organizationId,
        status: { in: ["AI_GENERATED", "DRAFT", "IN_REVIEW"] },
      },
    });
    const reviewPending = await prisma.question.count({
      where: {
        organizationId,
        status: { in: ["NEEDS_REVIEW", "POST_REVIEW_PENDING"] },
        deletedAt: null,
      },
    });
    return {
      todaySessions: today.length,
      sessions,
      totals,
      draftCount,
      reviewPending,
    };
  }
}

export const liveSessionService = new LiveSessionService();
