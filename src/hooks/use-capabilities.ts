"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { PaginatedResult } from "@/types";
import { tStatic } from "@/i18n";
import { toast } from "sonner";

export function useCapabilities(
  params: Record<string, string | number | undefined> = {},
) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== "") search.set(k, String(v));
  });
  const qs = search.toString();
  return useQuery({
    queryKey: ["capabilities", params],
    queryFn: () =>
      apiFetch<PaginatedResult<Record<string, unknown>>>(
        `/api/capabilities${qs ? `?${qs}` : ""}`,
      ),
  });
}

export function useCapability(id: string) {
  return useQuery({
    queryKey: ["capabilities", id],
    queryFn: () =>
      apiFetch<Record<string, unknown>>(`/api/capabilities/${id}`),
    enabled: Boolean(id),
  });
}

export function useCreateCapability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: unknown) =>
      apiFetch("/api/capabilities", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["capabilities"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success(tStatic("capabilities.created"));
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateCapability(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: unknown) =>
      apiFetch(`/api/capabilities/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["capabilities"] });
      toast.success(tStatic("capabilities.updated"));
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteCapability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/capabilities/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["capabilities"] });
      toast.success(tStatic("capabilities.deleted"));
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
