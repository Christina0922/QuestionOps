import "dotenv/config";
import { PrismaClient, type ProblemPriority, type ProblemStatus } from "@prisma/client";

const prisma = new PrismaClient();

const TAGS = [
  "Billing",
  "Login",
  "Refund",
  "API",
  "Performance",
  "Onboarding",
  "Notifications",
  "Permissions",
  "Mobile",
  "Integrations",
];

const PROBLEM_TITLES = [
  "Duplicate payment charged on renewal",
  "Users cannot reset password via email",
  "Checkout fails on Safari mobile",
  "Webhook deliveries are delayed",
  "Invoice PDF missing line items",
  "SSO login loops for enterprise orgs",
  "Search results ignore recent updates",
  "CSV export times out for large datasets",
  "Notification emails land in spam",
  "Role change does not update permissions",
  "Dashboard charts show stale metrics",
  "Mobile app crashes on offline sync",
  "Refund status stuck in pending",
  "API rate limit errors during peak",
  "Customer cannot invite teammates",
  "Audit log missing delete events",
  "Trial conversion banner never dismisses",
  "File uploads fail over 25MB",
  "Timezone displayed incorrectly",
  "Support ticket replies not threading",
];

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length]!;
}

function priority(i: number): ProblemPriority {
  return pick(["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const, i);
}

function status(i: number): ProblemStatus {
  return pick(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const, i);
}

async function main() {
  console.log("Seeding QuestionOps…");

  await prisma.publicationItem.deleteMany();
  await prisma.publication.deleteMany();
  await prisma.textAnswer.deleteMany();
  await prisma.liveAnswer.deleteMany();
  await prisma.questionAnswerMatch.deleteMany();
  await prisma.transcriptSegment.deleteMany();
  await prisma.queueItem.deleteMany();
  await prisma.question.deleteMany();
  await prisma.questionCluster.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.liveSession.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.youTubeCapabilityCandidate.deleteMany();
  await prisma.youTubeKnowledgeCandidate.deleteMany();
  await prisma.youTubeAnalysisCluster.deleteMany();
  await prisma.youTubeVideoAnalysis.deleteMany();
  await prisma.youTubeApiQuotaEvent.deleteMany();
  await prisma.youTubeComment.deleteMany();
  await prisma.youTubeSyncJob.deleteMany();
  await prisma.youTubeVideo.deleteMany();
  await prisma.youTubeChannel.deleteMany();
  await prisma.youTubeConnection.deleteMany();
  await prisma.capabilityTag.deleteMany();
  await prisma.knowledgeTag.deleteMany();
  await prisma.evidenceTag.deleteMany();
  await prisma.problemTag.deleteMany();
  await prisma.knowledgeEvidence.deleteMany();
  await prisma.knowledgeCluster.deleteMany();
  await prisma.clusterEvidence.deleteMany();
  await prisma.capability.deleteMany();
  await prisma.knowledge.deleteMany();
  await prisma.cluster.deleteMany();
  await prisma.evidence.deleteMany();
  await prisma.problem.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.organizationMember.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.user.deleteMany();

  const user = await prisma.user.upsert({
    where: { clerkId: process.env.DEV_USER_ID ?? "dev_user_1" },
    update: {
      email: process.env.DEV_USER_EMAIL ?? "dev@questionops.local",
      name: process.env.DEV_USER_NAME ?? "Dev User",
      deletedAt: null,
    },
    create: {
      clerkId: process.env.DEV_USER_ID ?? "dev_user_1",
      email: process.env.DEV_USER_EMAIL ?? "dev@questionops.local",
      name: process.env.DEV_USER_NAME ?? "Dev User",
    },
  });

  const org = await prisma.organization.upsert({
    where: { clerkOrgId: process.env.DEV_ORG_ID ?? "dev_org_1" },
    update: {
      name: process.env.DEV_ORG_NAME ?? "QuestionOps Demo",
      slug: "questionops-demo",
      deletedAt: null,
    },
    create: {
      clerkOrgId: process.env.DEV_ORG_ID ?? "dev_org_1",
      name: process.env.DEV_ORG_NAME ?? "QuestionOps Demo",
      slug: "questionops-demo",
    },
  });

  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: org.id,
        userId: user.id,
      },
    },
    update: { role: "admin" },
    create: {
      organizationId: org.id,
      userId: user.id,
      role: "admin",
    },
  });

  const tags = await Promise.all(
    TAGS.map((name) =>
      prisma.tag.create({
        data: { organizationId: org.id, name },
      }),
    ),
  );

  const problems = [];
  for (let i = 0; i < 20; i++) {
    const problem = await prisma.problem.create({
      data: {
        organizationId: org.id,
        title: PROBLEM_TITLES[i]!,
        description: `Customer-reported issue #${i + 1}: ${PROBLEM_TITLES[i]}. Captured for evidence-driven triage.`,
        source: pick(["Intercom", "Zendesk", "Sales call", "NPS follow-up"], i),
        customer: `Customer ${String.fromCharCode(65 + (i % 26))}`,
        reporterId: user.id,
        priority: priority(i),
        status: status(i),
        tags: {
          create: [
            { tagId: pick(tags, i).id },
            { tagId: pick(tags, i + 3).id },
          ],
        },
      },
    });
    problems.push(problem);
  }

  const evidences = [];
  for (let i = 0; i < 100; i++) {
    const problem = pick(problems, i);
    const evidence = await prisma.evidence.create({
      data: {
        organizationId: org.id,
        problemId: problem.id,
        observation: `Observation ${i + 1} for "${problem.title}": reproducible friction seen in session notes.`,
        transcript:
          i % 3 === 0
            ? `Customer: We keep hitting this.\nAgent: Can you share steps?\nCustomer: Sure, here they are for case ${i + 1}.`
            : null,
        link: i % 5 === 0 ? `https://example.com/tickets/${i + 1}` : null,
        confidence: 0.35 + ((i % 13) / 20),
        authorId: user.id,
        tags: {
          create: [{ tagId: pick(tags, i).id }],
        },
      },
    });
    evidences.push(evidence);
  }

  const clusters = [];
  for (let i = 0; i < 10; i++) {
    const problem = problems[i]!;
    const related = evidences.filter((e) => e.problemId === problem.id).slice(0, 3);
    if (related.length === 0) continue;
    const cluster = await prisma.cluster.create({
      data: {
        organizationId: org.id,
        problemId: problem.id,
        name: `${problem.title.split(" ").slice(0, 3).join(" ")} cluster`,
        summary: `Grouped evidence for recurring pattern around ${problem.title}.`,
        evidences: {
          create: related.map((e) => ({ evidenceId: e.id })),
        },
      },
    });
    clusters.push(cluster);
  }

  const knowledgeItems = [];
  for (let i = 0; i < 20; i++) {
    const problem = problems[i]!;
    const relatedEvidence = evidences
      .filter((e) => e.problemId === problem.id)
      .slice(0, 2);
    const relatedCluster = clusters.find((c) => c.problemId === problem.id);
    const knowledge = await prisma.knowledge.create({
      data: {
        organizationId: org.id,
        problemId: problem.id,
        title: `Knowledge: ${problem.title}`,
        description: `Synthesized understanding of "${problem.title}". Root cause appears tied to process/system mismatch. Validate before operationalizing.`,
        confidence: 0.45 + ((i % 10) / 20),
        authorId: user.id,
        tags: {
          create: [{ tagId: pick(tags, i).id }],
        },
        evidences: {
          create: relatedEvidence.map((e) => ({ evidenceId: e.id })),
        },
        clusters: relatedCluster
          ? { create: [{ clusterId: relatedCluster.id }] }
          : undefined,
      },
    });
    knowledgeItems.push(knowledge);
  }

  for (let i = 0; i < 10; i++) {
    const knowledge = knowledgeItems[i]!;
    await prisma.capability.create({
      data: {
        organizationId: org.id,
        knowledgeId: knowledge.id,
        problemId: knowledge.problemId,
        name: `Capability for ${knowledge.title.replace("Knowledge: ", "")}`,
        description: `Repeatable response playbook derived from ${knowledge.title}.`,
        standardProcedure: [
          "1. Confirm the customer context and product area.",
          "2. Reproduce or gather the latest evidence.",
          "3. Apply the known remediation steps.",
          "4. Document outcome and link new evidence.",
        ].join("\n"),
        checklist: [
          "Acknowledge the report",
          "Attach supporting evidence",
          "Apply standard remediation",
          "Confirm resolution with customer",
          "Update knowledge if pattern changed",
        ],
        expectedOutcome:
          "Customer issue resolved consistently and knowledge base stays current.",
        authorId: user.id,
        tags: {
          create: [{ tagId: pick(tags, i).id }],
        },
      },
    });
  }

  const entitySamples = [
    ...problems.slice(0, 5).map((p) => ({
      action: "CREATE" as const,
      entityType: "problem",
      entityId: p.id,
      summary: `Seeded problem "${p.title}"`,
    })),
    ...evidences.slice(0, 5).map((e) => ({
      action: "CREATE" as const,
      entityType: "evidence",
      entityId: e.id,
      summary: `Seeded evidence`,
    })),
    ...knowledgeItems.slice(0, 5).map((k) => ({
      action: "CREATE" as const,
      entityType: "knowledge",
      entityId: k.id,
      summary: `Seeded knowledge "${k.title}"`,
    })),
  ];

  for (const sample of entitySamples) {
    await prisma.activity.create({
      data: {
        organizationId: org.id,
        userId: user.id,
        ...sample,
      },
    });
  }

  // Live lecture Q&A seed (product core)
  const liveSession = await prisma.liveSession.create({
    data: {
      organizationId: org.id,
      title: "8월 온라인 설명회",
      description: "초보자 대상 라이브 세션 시드",
      status: "PREPARING",
      moderatorId: user.id,
      speakerId: user.id,
    },
  });

  const chatSamples = [
    "초보자도 가능한가요?",
    "비용은 얼마인가요?",
    "준비물은 무엇인가요?",
    "오늘 강의 정말 유익해요!",
    "환불은 어떻게 하나요?",
    "ㅋㅋ 맞아요",
    "화면이 안 보여요",
    "강의 자료 링크 주세요",
  ];

  for (let i = 0; i < chatSamples.length; i++) {
    const text = chatSamples[i]!;
    const isQ = /[?？]|인가요|어떻게|얼마|무엇|준비|환불|링크|보여/.test(text);
    const sub = await prisma.submission.create({
      data: {
        organizationId: org.id,
        liveSessionId: liveSession.id,
        sourceType: "YOUTUBE_LIVE_CHAT",
        externalId: `seed_chat_${i + 1}`,
        authorDisplayName: `시청자${i + 1}`,
        originalText: text,
        normalizedText: text,
        publishedAt: new Date(Date.now() - i * 120_000),
        messageType: isQ ? "QUESTION" : text.includes("유익") ? "PRAISE" : "CHAT",
      },
    });
    if (isQ) {
      await prisma.question.create({
        data: {
          organizationId: org.id,
          liveSessionId: liveSession.id,
          submissionId: sub.id,
          questionText: text,
          status: "NEEDS_REVIEW",
          priority: text.includes("안 보여") ? "HIGH" : "NORMAL",
        },
      });
    }
  }

  await prisma.liveSession.update({
    where: { id: liveSession.id },
    data: {
      totalSubmissions: chatSamples.length,
      totalQuestions: await prisma.question.count({
        where: { liveSessionId: liveSession.id },
      }),
    },
  });

  if (process.env.YOUTUBE_SEED_MOCK === "true") {
    const connection = await prisma.youTubeConnection.create({
      data: {
        organizationId: org.id,
        userId: user.id,
        googleAccountId: "seed-google",
        googleAccountEmail: "creator@example.com",
        status: "CONNECTED",
        scope: "mock",
        lastConnectedAt: new Date(),
      },
    });
    await prisma.youTubeChannel.create({
      data: {
        organizationId: org.id,
        connectionId: connection.id,
        youtubeChannelId: "UC_SEED_CHANNEL",
        title: "Seed Demo Channel",
        description: "Mock channel from seed",
        thumbnailUrl: "https://via.placeholder.com/88",
        customUrl: "@seeddemo",
        subscriberCount: 10000,
        videoCount: 120,
        viewCount: BigInt(1_000_000),
        lastSyncedAt: new Date(),
      },
    });
  }

  console.log("Seed complete:", {
    liveSession: liveSession.id,
    problems: problems.length,
    evidences: evidences.length,
    clusters: clusters.length,
    knowledge: knowledgeItems.length,
    capabilities: 10,
    tags: tags.length,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
