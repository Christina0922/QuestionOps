"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { PaginatedResult } from "@/types";
import { tStatic } from "@/i18n";
import { toast } from "sonner";

export function useEvidence(params: Record<string, string | number | undefined> = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== "") search.set(k, String(v));
  });
  const qs = search.toString();
  return useQuery({
    queryKey: ["evidence", params],
    queryFn: () =>
      apiFetch<PaginatedResult<Record<string, unknown>>>(
        `/api/evidence${qs ? `?${qs}` : ""}`,
      ),
  });
}

export function useEvidenceItem(id: string) {
  return useQuery({
    queryKey: ["evidence", id],
    queryFn: () => apiFetch<Record<string, unknown>>(`/api/evidence/${id}`),
    enabled: Boolean(id),
  });
}

export function useCreateEvidence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: unknown) =>
      apiFetch("/api/evidence", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["evidence"] });
      qc.invalidateQueries({ queryKey: ["problems"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success(tStatic("evidence.created"));
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateEvidence(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: unknown) =>
      apiFetch(`/api/evidence/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["evidence"] });
      qc.invalidateQueries({ queryKey: ["problems"] });
      toast.success(tStatic("evidence.updated"));
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteEvidence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/evidence/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["evidence"] });
      qc.invalidateQueries({ queryKey: ["problems"] });
      toast.success(tStatic("evidence.deleted"));
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
