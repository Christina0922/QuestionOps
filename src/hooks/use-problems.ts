"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { PaginatedResult } from "@/types";
import { toast } from "sonner";

export function useProblems(params: Record<string, string | number | undefined> = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== "") search.set(k, String(v));
  });
  const qs = search.toString();
  return useQuery({
    queryKey: ["problems", params],
    queryFn: () =>
      apiFetch<PaginatedResult<Record<string, unknown>>>(
        `/api/problems${qs ? `?${qs}` : ""}`,
      ),
  });
}

export function useProblem(id: string) {
  return useQuery({
    queryKey: ["problems", id],
    queryFn: () => apiFetch<Record<string, unknown>>(`/api/problems/${id}`),
    enabled: Boolean(id),
  });
}

export function useCreateProblem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: unknown) =>
      apiFetch("/api/problems", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["problems"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Problem created");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateProblem(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: unknown) =>
      apiFetch(`/api/problems/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["problems"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Problem updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteProblem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/problems/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["problems"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Problem deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
