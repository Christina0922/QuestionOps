import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api-error";
import { shouldBypassClerkAuth } from "@/lib/clerk-config";
import type { AuthContext } from "@/types";

async function ensureDevAuthContext(): Promise<AuthContext> {
  const clerkUserId = process.env.DEV_USER_ID ?? "dev_user_1";
  const clerkOrgId = process.env.DEV_ORG_ID ?? "dev_org_1";
  const email = process.env.DEV_USER_EMAIL ?? "dev@questionops.local";
  const name = process.env.DEV_USER_NAME ?? "Dev User";
  const orgName = process.env.DEV_ORG_NAME ?? "QuestionOps Demo";

  const user = await prisma.user.upsert({
    where: { clerkId: clerkUserId },
    update: {
      email,
      name,
      deletedAt: null,
    },
    create: {
      clerkId: clerkUserId,
      email,
      name,
    },
  });

  const organization = await prisma.organization.upsert({
    where: { clerkOrgId },
    update: {
      name: orgName,
      deletedAt: null,
    },
    create: {
      clerkOrgId,
      name: orgName,
      slug: "questionops-demo",
    },
  });

  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: organization.id,
        userId: user.id,
      },
    },
    update: { role: "admin" },
    create: {
      organizationId: organization.id,
      userId: user.id,
      role: "admin",
    },
  });

  return {
    userId: user.id,
    organizationId: organization.id,
    clerkUserId: user.clerkId,
    email: user.email,
    name: user.name,
  };
}

async function syncClerkAuthContext(): Promise<AuthContext> {
  const session = await auth();
  const userId = session.userId;
  const orgId = session.orgId;

  if (!userId) {
    throw ApiError.unauthorized();
  }

  if (!orgId) {
    throw ApiError.forbidden(
      "An active organization is required. Select or create an organization in Clerk.",
    );
  }

  const clerkUser = await currentUser();
  if (!clerkUser) {
    throw ApiError.unauthorized();
  }

  const email =
    clerkUser.emailAddresses.find(
      (e) => e.id === clerkUser.primaryEmailAddressId,
    )?.emailAddress ??
    clerkUser.emailAddresses[0]?.emailAddress ??
    `${clerkUser.id}@users.clerk.local`;

  const name =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
    clerkUser.username ||
    null;

  const user = await prisma.user.upsert({
    where: { clerkId: userId },
    update: {
      email,
      name,
      imageUrl: clerkUser.imageUrl,
      deletedAt: null,
    },
    create: {
      clerkId: userId,
      email,
      name,
      imageUrl: clerkUser.imageUrl,
    },
  });

  const organization = await prisma.organization.upsert({
    where: { clerkOrgId: orgId },
    update: { deletedAt: null },
    create: {
      clerkOrgId: orgId,
      name: session.orgSlug ?? "Organization",
      slug: session.orgSlug ?? undefined,
    },
  });

  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: organization.id,
        userId: user.id,
      },
    },
    update: {},
    create: {
      organizationId: organization.id,
      userId: user.id,
      role: session.orgRole ?? "member",
    },
  });

  return {
    userId: user.id,
    organizationId: organization.id,
    clerkUserId: user.clerkId,
    email: user.email,
    name: user.name,
  };
}

export async function getAuthContext(): Promise<AuthContext> {
  if (shouldBypassClerkAuth()) {
    return ensureDevAuthContext();
  }
  return syncClerkAuthContext();
}

export function isDevAuthBypass() {
  return shouldBypassClerkAuth();
}
