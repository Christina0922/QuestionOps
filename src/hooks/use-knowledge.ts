"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { PaginatedResult } from "@/types";
import { toast } from "sonner";

export function useKnowledge(params: Record<string, string | number | undefined> = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== "") search.set(k, String(v));
  });
  const qs = search.toString();
  return useQuery({
    queryKey: ["knowledge", params],
    queryFn: () =>
      apiFetch<PaginatedResult<Record<string, unknown>>>(
        `/api/knowledge${qs ? `?${qs}` : ""}`,
      ),
  });
}

export function useKnowledgeItem(id: string) {
  return useQuery({
    queryKey: ["knowledge", id],
    queryFn: () => apiFetch<Record<string, unknown>>(`/api/knowledge/${id}`),
    enabled: Boolean(id),
  });
}

export function useCreateKnowledge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: unknown) =>
      apiFetch("/api/knowledge", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["knowledge"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Knowledge created");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateKnowledge(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: unknown) =>
      apiFetch(`/api/knowledge/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["knowledge"] });
      toast.success("Knowledge updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteKnowledge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/knowledge/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["knowledge"] });
      toast.success("Knowledge deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useKnowledgeDraft() {
  return useMutation({
    mutationFn: (evidenceIds: string[]) =>
      apiFetch<{
        title: string;
        description: string;
        confidence: number;
        source: string;
      }>("/api/ai/knowledge-draft", {
        method: "POST",
        body: JSON.stringify({ evidenceIds }),
      }),
    onError: (e: Error) => toast.error(e.message),
  });
}
