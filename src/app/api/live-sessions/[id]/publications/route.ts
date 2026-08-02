import { createApiHandler, parseJsonBody } from "@/lib/api-handler";
import { liveSessionService } from "@/services/live/live-session-service";
import { z } from "zod";

export const GET = createApiHandler(async ({ auth, params }) => {
  const { prisma } = await import("@/lib/prisma");
  return prisma.publication.findMany({
    where: {
      organizationId: auth.organizationId,
      liveSessionId: params.id,
    },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });
});

export const POST = createApiHandler(async ({ auth, params, request }) => {
  const body = await parseJsonBody(
    request,
    z.object({
      title: z.string().min(1),
      introduction: z.string().optional(),
      closing: z.string().optional(),
      channelType: z.enum([
        "YOUTUBE_COMMUNITY",
        "KAKAO_GROUP",
        "EMAIL",
        "OTHER",
      ]),
      formatType: z.enum([
        "SHORT_QA",
        "FAQ",
        "KAKAO_MESSAGE",
        "EMAIL",
        "DETAILED_QA",
      ]),
      questionIds: z.array(z.string()).min(1),
    }),
  );
  return liveSessionService.createPublication(auth, params.id, body);
});
