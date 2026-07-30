import type {
  Activity,
  Capability,
  Cluster,
  Evidence,
  Knowledge,
  Problem,
  ProblemPriority,
  ProblemStatus,
  Tag,
  User,
} from "@prisma/client";

export type AuthContext = {
  userId: string;
  organizationId: string;
  clerkUserId: string;
  email: string;
  name: string | null;
};

export type ApiSuccess<T> = { data: T };
export type ApiErrorBody = {
  error: { message: string; code: string; details?: unknown };
};

export type PaginationParams = {
  page?: number;
  pageSize?: number;
};

export type PaginatedResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type TagSummary = Pick<Tag, "id" | "name">;

export type ProblemWithRelations = Problem & {
  tags: TagSummary[];
  reporter?: Pick<User, "id" | "name" | "email"> | null;
  _count?: {
    evidences: number;
    knowledge: number;
    capabilities: number;
    clusters: number;
  };
};

export type EvidenceWithRelations = Evidence & {
  tags: TagSummary[];
  author?: Pick<User, "id" | "name" | "email"> | null;
  problem?: Pick<Problem, "id" | "title"> | null;
};

export type ClusterWithRelations = Cluster & {
  problem?: Pick<Problem, "id" | "title"> | null;
  evidences: Array<{
    evidence: Pick<Evidence, "id" | "observation" | "confidence" | "createdAt">;
  }>;
  _count?: { evidences: number };
};

export type KnowledgeWithRelations = Knowledge & {
  tags: TagSummary[];
  author?: Pick<User, "id" | "name" | "email"> | null;
  problem?: Pick<Problem, "id" | "title"> | null;
  clusters: Array<{ cluster: Pick<Cluster, "id" | "name"> }>;
  evidences: Array<{
    evidence: Pick<Evidence, "id" | "observation" | "confidence">;
  }>;
  _count?: { capabilities: number };
};

export type CapabilityWithRelations = Capability & {
  tags: TagSummary[];
  author?: Pick<User, "id" | "name" | "email"> | null;
  problem?: Pick<Problem, "id" | "title"> | null;
  knowledge?: Pick<Knowledge, "id" | "title"> | null;
  checklist: string[];
};

export type ActivityWithUser = Activity & {
  user?: Pick<User, "id" | "name" | "email"> | null;
};

export type SearchEntityType =
  | "problem"
  | "evidence"
  | "knowledge"
  | "capability";

export type SearchHit = {
  id: string;
  entityType: SearchEntityType;
  title: string;
  snippet: string;
  score: number;
  href: string;
  updatedAt: string;
};

export type DashboardStats = {
  totals: {
    problems: number;
    evidences: number;
    knowledge: number;
    capabilities: number;
    clusters: number;
  };
  recentCreated: Array<{
    id: string;
    entityType: string;
    title: string;
    createdAt: string;
    href: string;
  }>;
  recentUpdated: Array<{
    id: string;
    entityType: string;
    title: string;
    updatedAt: string;
    href: string;
  }>;
};

export type { ProblemPriority, ProblemStatus };
