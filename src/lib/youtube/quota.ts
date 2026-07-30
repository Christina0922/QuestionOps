import { prisma } from "@/lib/prisma";

/** Rough YouTube Data API v3 quota costs (units). */
export const YOUTUBE_QUOTA_UNITS = {
  channels_list: 1,
  playlistItems_list: 1,
  videos_list: 1,
  commentThreads_list: 1,
  comments_list: 1,
} as const;

export type YouTubeQuotaOperation = keyof typeof YOUTUBE_QUOTA_UNITS | string;

export async function recordYouTubeQuota(opts: {
  organizationId: string;
  connectionId?: string | null;
  operation: YouTubeQuotaOperation;
  units?: number;
  videoId?: string | null;
  jobId?: string | null;
}) {
  const estimatedUnits =
    opts.units ??
    (opts.operation in YOUTUBE_QUOTA_UNITS
      ? YOUTUBE_QUOTA_UNITS[opts.operation as keyof typeof YOUTUBE_QUOTA_UNITS]
      : 1);

  try {
    await prisma.youTubeApiQuotaEvent.create({
      data: {
        organizationId: opts.organizationId,
        connectionId: opts.connectionId ?? null,
        operation: opts.operation,
        estimatedUnits,
        videoId: opts.videoId ?? null,
        jobId: opts.jobId ?? null,
      },
    });
  } catch {
    // Never fail the main flow because of quota accounting.
  }
}

export async function summarizeYouTubeQuota(
  organizationId: string,
  sinceHours = 24,
) {
  const since = new Date(Date.now() - sinceHours * 3600_000);
  const events = await prisma.youTubeApiQuotaEvent.findMany({
    where: { organizationId, createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  const totalUnits = events.reduce((sum, e) => sum + e.estimatedUnits, 0);
  const byOperation: Record<string, number> = {};
  for (const e of events) {
    byOperation[e.operation] = (byOperation[e.operation] ?? 0) + e.estimatedUnits;
  }
  return {
    sinceHours,
    totalUnits,
    byOperation,
    recent: events.slice(0, 20).map((e) => ({
      ...e,
      createdAt: e.createdAt.toISOString(),
    })),
    dailyCapHint: 10_000,
  };
}
