import { describe, expect, it, vi, beforeEach } from "vitest";

const mockActivityCreate = vi.fn();
const mockFindOrCreateMany = vi.fn();
const mockProblemCreate = vi.fn();
const mockProblemFindById = vi.fn();
const mockProblemUpdate = vi.fn();
const mockProblemSoftDelete = vi.fn();
const mockProblemList = vi.fn();

vi.mock("@/repositories/activity-repository", () => ({
  activityRepository: {
    create: (...args: unknown[]) => mockActivityCreate(...args),
  },
}));

vi.mock("@/repositories/tag-repository", () => ({
  tagRepository: {
    findOrCreateMany: (...args: unknown[]) => mockFindOrCreateMany(...args),
  },
}));

vi.mock("@/repositories/problem-repository", () => ({
  problemRepository: {
    create: (...args: unknown[]) => mockProblemCreate(...args),
    findById: (...args: unknown[]) => mockProblemFindById(...args),
    update: (...args: unknown[]) => mockProblemUpdate(...args),
    softDelete: (...args: unknown[]) => mockProblemSoftDelete(...args),
    list: (...args: unknown[]) => mockProblemList(...args),
  },
}));

describe("ProblemService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindOrCreateMany.mockResolvedValue([{ id: "tag_1", name: "Billing" }]);
    mockProblemCreate.mockResolvedValue({
      id: "prob_1",
      title: "Duplicate charge",
      tags: [{ id: "tag_1", name: "Billing" }],
    });
    mockProblemFindById.mockResolvedValue({
      id: "prob_1",
      title: "Duplicate charge",
    });
    mockProblemUpdate.mockResolvedValue({
      id: "prob_1",
      title: "Duplicate charge updated",
    });
    mockProblemSoftDelete.mockResolvedValue({ id: "prob_1" });
    mockProblemList.mockResolvedValue({
      items: [{ id: "prob_1", title: "Duplicate charge" }],
      total: 1,
    });
    mockActivityCreate.mockResolvedValue({});
  });

  it("creates a problem and logs activity", async () => {
    const { problemService } = await import("@/services/problem-service");
    const auth = {
      userId: "user_1",
      organizationId: "org_1",
      clerkUserId: "clerk_1",
      email: "dev@example.com",
      name: "Dev",
    };

    const result = await problemService.create(auth, {
      title: "Duplicate charge",
      description: "Customer billed twice",
      priority: "HIGH",
      status: "OPEN",
      tags: ["Billing"],
    });

    expect(result.id).toBe("prob_1");
    expect(mockProblemCreate).toHaveBeenCalled();
    expect(mockActivityCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "CREATE",
        entityType: "problem",
        entityId: "prob_1",
      }),
    );
  });

  it("lists problems with pagination metadata", async () => {
    const { problemService } = await import("@/services/problem-service");
    const result = await problemService.list("org_1", {
      page: 1,
      pageSize: 20,
    });
    expect(result.total).toBe(1);
    expect(result.totalPages).toBe(1);
    expect(result.items).toHaveLength(1);
  });

  it("soft-deletes and logs activity", async () => {
    const { problemService } = await import("@/services/problem-service");
    const auth = {
      userId: "user_1",
      organizationId: "org_1",
      clerkUserId: "clerk_1",
      email: "dev@example.com",
      name: "Dev",
    };

    await problemService.remove(auth, "prob_1");
    expect(mockProblemSoftDelete).toHaveBeenCalledWith("org_1", "prob_1");
    expect(mockActivityCreate).toHaveBeenCalledWith(
      expect.objectContaining({ action: "DELETE", entityType: "problem" }),
    );
  });
});

describe("ProblemRepository mapping helpers", () => {
  it("exposes repository module", async () => {
    const mod = await import("@/repositories/problem-repository");
    expect(mod.problemRepository).toBeDefined();
    expect(typeof mod.problemRepository.list).toBe("function");
    expect(typeof mod.problemRepository.softDelete).toBe("function");
  });
});
