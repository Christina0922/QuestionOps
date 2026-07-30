"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { DashboardStats, PaginatedResult, SearchHit } from "@/types";

export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: () => apiFetch<DashboardStats>("/api/dashboard"),
  });
}

export function useSearch(q: string, enabled = true) {
  return useQuery({
    queryKey: ["search", q],
    queryFn: () =>
      apiFetch<PaginatedResult<SearchHit> & { query: string }>(
        `/api/search?q=${encodeURIComponent(q)}`,
      ),
    enabled: enabled && q.trim().length > 0,
  });
}

export function useActivity(
  page = 1,
  filters: { entityType?: string; entityId?: string } = {},
) {
  const search = new URLSearchParams({
    page: String(page),
    pageSize: "30",
  });
  if (filters.entityType) search.set("entityType", filters.entityType);
  if (filters.entityId) search.set("entityId", filters.entityId);

  return useQuery({
    queryKey: ["activity", page, filters],
    queryFn: () =>
      apiFetch<PaginatedResult<Record<string, unknown>>>(
        `/api/activity?${search.toString()}`,
      ),
  });
}

export function useTags() {
  return useQuery({
    queryKey: ["tags"],
    queryFn: () => apiFetch<Array<{ id: string; name: string }>>("/api/tags"),
  });
}
