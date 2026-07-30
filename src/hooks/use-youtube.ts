"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";
import { tStatic } from "@/i18n";

export type YouTubeStatus = {
  configured: boolean;
  missingEnv: string[];
  mockMode: boolean;
  connected: boolean;
  status: string | null;
  googleAccountEmail: string | null;
  channel: {
    id: string;
    youtubeChannelId: string;
    title: string;
    description: string | null;
    thumbnailUrl: string | null;
    customUrl: string | null;
    subscriberCount: number | null;
    videoCount: number | null;
    viewCount: string | null;
    lastSyncedAt: string | null;
  } | null;
  lastConnectedAt: string | null;
  lastRefreshedAt: string | null;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
  reauthRequired: boolean;
};

export function useYouTubeStatus() {
  return useQuery({
    queryKey: ["youtube-status"],
    queryFn: () => apiFetch<YouTubeStatus>("/api/integrations/youtube/status"),
  });
}

export function useDisconnectYouTube() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<YouTubeStatus>("/api/integrations/youtube/disconnect", {
        method: "POST",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["youtube-status"] });
      toast.success(tStatic("youtube.disconnected"));
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
