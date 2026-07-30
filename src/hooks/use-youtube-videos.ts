"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { PaginatedResult } from "@/types";
import { toast } from "sonner";
import { tStatic } from "@/i18n";

export type YouTubeVideo = {
  id: string;
  youtubeVideoId: string;
  title: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  publishedAt?: string | null;
  duration?: string | null;
  viewCount?: string | null;
  likeCount?: number | null;
  commentCount?: number | null;
  commentsEnabled: boolean;
  syncStatus: string;
  analysisStatus: string;
  lastCommentSyncedAt?: string | null;
  watchUrl: string;
  channel?: {
    id: string;
    title: string;
    youtubeChannelId: string;
    thumbnailUrl?: string | null;
  };
};

export function useYouTubeVideos(
  params: Record<string, string | number | undefined> = {},
) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== "") search.set(k, String(v));
  });
  const qs = search.toString();
  return useQuery({
    queryKey: ["youtube-videos", params],
    queryFn: () =>
      apiFetch<PaginatedResult<YouTubeVideo>>(
        `/api/youtube/videos${qs ? `?${qs}` : ""}`,
      ),
  });
}

export function useYouTubeVideo(id: string) {
  return useQuery({
    queryKey: ["youtube-videos", id],
    queryFn: () => apiFetch<YouTubeVideo>(`/api/youtube/videos/${id}`),
    enabled: Boolean(id),
  });
}

export function useSyncYouTubeVideos() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<{ created: number; updated: number }>(
        "/api/youtube/videos/sync",
        { method: "POST" },
      ),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["youtube-videos"] });
      toast.success(
        tStatic("youtube.videos.synced", {
          created: data.created,
          updated: data.updated,
        }),
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useImportYouTubeVideo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (url: string) =>
      apiFetch<YouTubeVideo>("/api/youtube/videos/import", {
        method: "POST",
        body: JSON.stringify({ url }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["youtube-videos"] });
      toast.success(tStatic("youtube.videos.imported"));
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteYouTubeVideo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/youtube/videos/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["youtube-videos"] });
      toast.success(tStatic("youtube.videos.deleted"));
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
