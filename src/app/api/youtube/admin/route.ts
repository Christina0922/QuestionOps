import { createApiHandler, getSearchParams } from "@/lib/api-handler";
import { summarizeYouTubeQuota } from "@/lib/youtube/quota";
import { prisma } from "@/lib/prisma";

export const GET = createApiHandler(async ({ auth, request }) => {
  const params = getSearchParams(request);
  const sinceHours = Number(params.get("sinceHours") ?? "24");
  const quota = await summarizeYouTubeQuota(
    auth.organizationId,
    Number.isFinite(sinceHours) ? sinceHours : 24,
  );

  const jobs = await prisma.youTubeSyncJob.findMany({
    where: { organizationId: auth.organizationId },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: {
      id: true,
      jobType: true,
      status: true,
      processedCount: true,
      createdCount: true,
      totalExpected: true,
      errorMessage: true,
      videoId: true,
      startedAt: true,
      completedAt: true,
      createdAt: true,
    },
  });

  return {
    quota,
    jobs: jobs.map((j) => ({
      ...j,
      startedAt: j.startedAt?.toISOString() ?? null,
      completedAt: j.completedAt?.toISOString() ?? null,
      createdAt: j.createdAt.toISOString(),
    })),
    caps: {
      maxCommentsImport: 1000,
      maxCommentsAnalyze: Number(process.env.YOUTUBE_MAX_ANALYZE_COMMENTS ?? 500),
      incrementalStopAfterKnown: 20,
    },
  };
});
