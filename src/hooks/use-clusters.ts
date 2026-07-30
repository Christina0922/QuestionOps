"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { PaginatedResult } from "@/types";
import { toast } from "sonner";

export function useClusters(params: Record<string, string | number | undefined> = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== "") search.set(k, String(v));
  });
  const qs = search.toString();
  return useQuery({
    queryKey: ["clusters", params],
    queryFn: () =>
      apiFetch<PaginatedResult<Record<string, unknown>>>(
        `/api/clusters${qs ? `?${qs}` : ""}`,
      ),
  });
}

export function useCluster(id: string) {
  return useQuery({
    queryKey: ["clusters", id],
    queryFn: () => apiFetch<Record<string, unknown>>(`/api/clusters/${id}`),
    enabled: Boolean(id),
  });
}

export function useCreateCluster() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: unknown) =>
      apiFetch("/api/clusters", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clusters"] });
      toast.success("Cluster created");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateCluster(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: unknown) =>
      apiFetch(`/api/clusters/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clusters"] });
      toast.success("Cluster updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteCluster() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/clusters/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clusters"] });
      toast.success("Cluster deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
