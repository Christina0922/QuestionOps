"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { ListSkeleton } from "@/components/shared/list-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate } from "@/lib/utils";
import { useI18n } from "@/i18n";
import {
  useDeleteYouTubeVideo,
  useImportYouTubeVideo,
  useSyncYouTubeVideos,
  useYouTubeVideos,
} from "@/hooks/use-youtube-videos";
import { useYouTubeStatus } from "@/hooks/use-youtube";

export function YouTubeVideosView() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const status = useYouTubeStatus();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("newest");
  const [url, setUrl] = useState("");
  const { data, isLoading, error } = useYouTubeVideos({
    q: q || undefined,
    filter,
    sort,
    pageSize: 50,
  });
  const sync = useSyncYouTubeVideos();
  const importVideo = useImportYouTubeVideo();
  const remove = useDeleteYouTubeVideo();

  if (status.data && !status.data.connected && !status.data.reauthRequired) {
    return (
      <EmptyState
        title={t("youtube.videos.needConnection")}
        description={t("youtube.videos.needConnectionHint")}
        action={
          <Button asChild>
            <Link href="/settings/integrations/youtube">
              {t("youtube.connect")}
            </Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("youtube.videos.title")}
        description={t("youtube.videos.description")}
        action={
          <Button
            onClick={() => sync.mutate()}
            disabled={sync.isPending}
          >
            {sync.isPending
              ? t("youtube.videos.syncing")
              : t("youtube.videos.sync")}
          </Button>
        }
      />

      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={t("youtube.videos.urlPlaceholder")}
          />
          <Button
            disabled={importVideo.isPending || !url.trim()}
            onClick={async () => {
              const video = await importVideo.mutateAsync(url.trim());
              setUrl("");
              router.push(`/youtube/videos/${video.id}`);
            }}
          >
            {t("youtube.videos.import")}
          </Button>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("youtube.videos.filterSearch")}
          className="sm:flex-1"
        />
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("youtube.videos.filter.all")}</SelectItem>
            <SelectItem value="never">
              {t("youtube.videos.filter.never")}
            </SelectItem>
            <SelectItem value="synced">
              {t("youtube.videos.filter.synced")}
            </SelectItem>
            <SelectItem value="no_comments">
              {t("youtube.videos.filter.noComments")}
            </SelectItem>
            <SelectItem value="comments_disabled">
              {t("youtube.videos.filter.disabled")}
            </SelectItem>
            <SelectItem value="error">
              {t("youtube.videos.filter.error")}
            </SelectItem>
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">
              {t("youtube.videos.sort.newest")}
            </SelectItem>
            <SelectItem value="oldest">
              {t("youtube.videos.sort.oldest")}
            </SelectItem>
            <SelectItem value="comments">
              {t("youtube.videos.sort.comments")}
            </SelectItem>
            <SelectItem value="views">
              {t("youtube.videos.sort.views")}
            </SelectItem>
            <SelectItem value="unsynced">
              {t("youtube.videos.sort.unsynced")}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? <ListSkeleton /> : null}
      {error ? (
        <EmptyState
          title={t("common.failedLoad")}
          description={(error as Error).message}
        />
      ) : null}
      {data && data.items.length === 0 ? (
        <EmptyState
          title={t("youtube.videos.empty")}
          description={t("youtube.videos.emptyHint")}
        />
      ) : null}

      <div className="space-y-3">
        {data?.items.map((video) => (
          <Card key={video.id}>
            <CardContent className="flex flex-col gap-4 p-4 sm:flex-row">
              {video.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={video.thumbnailUrl}
                  alt={video.title}
                  className="h-24 w-40 shrink-0 rounded-md object-cover"
                />
              ) : (
                <div className="flex h-24 w-40 shrink-0 items-center justify-center rounded-md bg-muted text-xs">
                  No thumb
                </div>
              )}
              <div className="min-w-0 flex-1 space-y-2">
                <Link
                  href={`/youtube/videos/${video.id}`}
                  className="text-base font-semibold hover:text-primary"
                >
                  {video.title}
                </Link>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{video.syncStatus}</Badge>
                  {!video.commentsEnabled ? (
                    <Badge variant="warning">
                      {t("youtube.videos.commentsDisabled")}
                    </Badge>
                  ) : null}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatDate(video.publishedAt, locale)} ·{" "}
                  {t("youtube.videos.views")}: {video.viewCount ?? "0"} ·{" "}
                  {t("youtube.videos.likes")}: {video.likeCount ?? 0} ·{" "}
                  {t("youtube.videos.comments")}: {video.commentCount ?? 0}
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/youtube/videos/${video.id}`}>
                    {t("common.open")}
                  </Link>
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    if (confirm(t("youtube.videos.confirmDelete"))) {
                      remove.mutate(video.id);
                    }
                  }}
                >
                  {t("common.delete")}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
