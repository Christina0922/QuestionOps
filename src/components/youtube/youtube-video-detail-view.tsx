"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/page-header";
import { ListSkeleton } from "@/components/shared/list-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate } from "@/lib/utils";
import { apiFetch } from "@/lib/api-client";
import { useI18n } from "@/i18n";
import { useProblems } from "@/hooks/use-problems";
import {
  useDeleteYouTubeVideo,
  useYouTubeVideo,
} from "@/hooks/use-youtube-videos";
import { YouTubeAnalysisPanel } from "@/components/youtube/youtube-analysis-panel";
import type { PaginatedResult } from "@/types";
import { toast } from "sonner";

type CommentRow = {
  id: string;
  youtubeCommentId: string;
  authorDisplayName?: string | null;
  textOriginal: string;
  translatedTextKo?: string | null;
  translatedTextEn?: string | null;
  detectedLanguage?: string | null;
  likeCount: number;
  replyCount: number;
  isTopLevel: boolean;
  publishedAt?: string | null;
  evidenceId?: string | null;
};

type JobRow = {
  id: string;
  status: string;
  processedCount: number;
  createdCount: number;
  updatedCount: number;
  totalExpected?: number | null;
  errorMessage?: string | null;
};

type TextMode = "original" | "ko" | "en";

function displayText(c: CommentRow, mode: TextMode) {
  if (mode === "ko" && c.translatedTextKo) return c.translatedTextKo;
  if (mode === "en" && c.translatedTextEn) return c.translatedTextEn;
  return c.textOriginal;
}

export function YouTubeVideoDetailView({ id }: { id: string }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const qc = useQueryClient();
  const { data, isLoading, error, refetch } = useYouTubeVideo(id);
  const remove = useDeleteYouTubeVideo();
  const problems = useProblems({ pageSize: 100 });
  const [jobId, setJobId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [language, setLanguage] = useState("all");
  const [converted, setConverted] = useState("any");
  const [topLevelOnly, setTopLevelOnly] = useState(false);
  const [textMode, setTextMode] = useState<TextMode>("original");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [problemId, setProblemId] = useState("");

  const commentQuery = useMemo(() => {
    const params = new URLSearchParams({ pageSize: "50" });
    if (q.trim()) params.set("q", q.trim());
    if (language !== "all") params.set("language", language);
    if (converted !== "any") params.set("converted", converted);
    if (topLevelOnly) params.set("topLevelOnly", "true");
    return params.toString();
  }, [q, language, converted, topLevelOnly]);

  const comments = useQuery({
    queryKey: ["youtube-comments", id, commentQuery],
    queryFn: () =>
      apiFetch<PaginatedResult<CommentRow>>(
        `/api/youtube/videos/${id}/comments?${commentQuery}`,
      ),
    enabled: Boolean(id),
  });

  const job = useQuery({
    queryKey: ["youtube-job", jobId],
    queryFn: () => apiFetch<JobRow>(`/api/youtube/jobs/${jobId}`),
    enabled: Boolean(jobId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "RUNNING" || status === "PENDING" ? 1000 : false;
    },
  });

  useEffect(() => {
    if (
      job.data &&
      (job.data.status === "COMPLETED" ||
        job.data.status === "PARTIAL" ||
        job.data.status === "FAILED")
    ) {
      qc.invalidateQueries({ queryKey: ["youtube-comments", id] });
      refetch();
      if (job.data.status !== "FAILED") {
        toast.success(t("youtube.comments.importDone"));
      }
    }
  }, [job.data, id, qc, refetch, t]);

  useEffect(() => {
    const first = problems.data?.items?.[0] as { id?: string } | undefined;
    if (!problemId && first?.id) setProblemId(first.id);
  }, [problems.data, problemId]);

  const startImport = useMutation({
    mutationFn: () =>
      apiFetch<{ jobId: string }>(`/api/youtube/videos/${id}/comments`, {
        method: "POST",
        body: JSON.stringify({
          maxComments: 200,
          includeReplies: true,
          mode: "full",
        }),
      }),
    onSuccess: (res) => {
      setJobId(res.jobId);
      toast.success(t("youtube.comments.importStarted"));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const incremental = useMutation({
    mutationFn: () =>
      apiFetch<{ jobId: string }>(`/api/youtube/videos/${id}/comments`, {
        method: "POST",
        body: JSON.stringify({
          maxComments: 200,
          includeReplies: true,
          mode: "fast",
        }),
      }),
    onSuccess: (res) => {
      setJobId(res.jobId);
      toast.success(t("youtube.comments.incrementalStarted"));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const convert = useMutation({
    mutationFn: () =>
      apiFetch<{ createdCount: number; skippedCount: number }>(
        `/api/youtube/videos/${id}/comments/to-evidence`,
        {
          method: "POST",
          body: JSON.stringify({
            commentIds: Array.from(selected),
            problemId,
            textMode,
            confidence: 0.6,
          }),
        },
      ),
    onSuccess: (res) => {
      toast.success(
        t("youtube.comments.convertDone", {
          created: res.createdCount,
          skipped: res.skippedCount,
        }),
      );
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["youtube-comments", id] });
      qc.invalidateQueries({ queryKey: ["evidence"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <ListSkeleton rows={4} />;
  if (error || !data) {
    return <EmptyState title={t("youtube.videos.notFound")} />;
  }

  const progress =
    job.data && job.data.totalExpected
      ? Math.min(
          100,
          Math.round(
            (job.data.processedCount / Math.max(job.data.totalExpected, 1)) *
              100,
          ),
        )
      : null;

  const toggle = (commentId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) next.delete(commentId);
      else next.add(commentId);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={data.title}
        description={data.youtubeVideoId}
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => startImport.mutate()}
              disabled={
                startImport.isPending ||
                !data.commentsEnabled ||
                job.data?.status === "RUNNING"
              }
            >
              {t("youtube.comments.import")}
            </Button>
            <Button
              variant="outline"
              onClick={() => incremental.mutate()}
              disabled={
                incremental.isPending ||
                !data.commentsEnabled ||
                job.data?.status === "RUNNING"
              }
            >
              {t("youtube.comments.incremental")}
            </Button>
            <Button variant="outline" asChild>
              <a href={data.watchUrl} target="_blank" rel="noreferrer">
                {t("youtube.videos.openOnYouTube")}
              </a>
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!confirm(t("youtube.videos.confirmDelete"))) return;
                await remove.mutateAsync(id);
                router.push("/youtube/videos");
              }}
            >
              {t("common.delete")}
            </Button>
          </div>
        }
      />

      {job.data ? (
        <Card>
          <CardContent className="space-y-2 p-4 text-sm">
            <div className="flex items-center justify-between">
              <span>{t("youtube.comments.progress")}</span>
              <Badge variant="outline">{job.data.status}</Badge>
            </div>
            <p className="text-muted-foreground">
              {t("youtube.comments.progressDetail", {
                processed: job.data.processedCount,
                total: job.data.totalExpected ?? "?",
              })}
            </p>
            {progress !== null ? (
              <div className="h-2 overflow-hidden rounded bg-muted">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            ) : null}
            {job.data.errorMessage ? (
              <p className="text-destructive">{job.data.errorMessage}</p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {data.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={data.thumbnailUrl}
            alt={data.title}
            className="w-full rounded-lg object-cover"
          />
        ) : null}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("youtube.videos.overview")}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <div className="text-xs uppercase text-muted-foreground">
                {t("youtube.videos.published")}
              </div>
              <div>{formatDate(data.publishedAt, locale)}</div>
            </div>
            <div>
              <div className="text-xs uppercase text-muted-foreground">
                {t("youtube.videos.syncStatus")}
              </div>
              <Badge variant="outline">{data.syncStatus}</Badge>
            </div>
            <div>
              <div className="text-xs uppercase text-muted-foreground">
                {t("youtube.videos.views")}
              </div>
              <div>{data.viewCount ?? "0"}</div>
            </div>
            <div>
              <div className="text-xs uppercase text-muted-foreground">
                {t("youtube.videos.comments")}
              </div>
              <div>{data.commentCount ?? 0}</div>
            </div>
            <div className="sm:col-span-2">
              <div className="text-xs uppercase text-muted-foreground">
                {t("common.description")}
              </div>
              <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
                {data.description || t("common.none")}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base">
              {t("youtube.comments.title")}
            </CardTitle>
            <Badge variant="secondary">{comments.data?.total ?? 0}</Badge>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("youtube.comments.search")}
            />
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t("youtube.comments.filter.langAll")}
                </SelectItem>
                <SelectItem value="ko">KO</SelectItem>
                <SelectItem value="en">EN</SelectItem>
                <SelectItem value="ja">JA</SelectItem>
                <SelectItem value="unknown">
                  {t("youtube.comments.filter.langUnknown")}
                </SelectItem>
              </SelectContent>
            </Select>
            <Select value={converted} onValueChange={setConverted}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">
                  {t("youtube.comments.filter.convertedAny")}
                </SelectItem>
                <SelectItem value="yes">
                  {t("youtube.comments.filter.convertedYes")}
                </SelectItem>
                <SelectItem value="no">
                  {t("youtube.comments.filter.convertedNo")}
                </SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={textMode}
              onValueChange={(v) => setTextMode(v as TextMode)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="original">
                  {t("youtube.comments.view.original")}
                </SelectItem>
                <SelectItem value="ko">
                  {t("youtube.comments.view.ko")}
                </SelectItem>
                <SelectItem value="en">
                  {t("youtube.comments.view.en")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={topLevelOnly}
                onChange={(e) => setTopLevelOnly(e.target.checked)}
              />
              {t("youtube.comments.filter.topLevel")}
            </label>
            <Select value={problemId} onValueChange={setProblemId}>
              <SelectTrigger className="w-56">
                <SelectValue
                  placeholder={t("youtube.comments.selectProblem")}
                />
              </SelectTrigger>
              <SelectContent>
                {(problems.data?.items ?? []).map((p) => {
                  const row = p as { id: string; title: string };
                  return (
                    <SelectItem key={row.id} value={row.id}>
                      {row.title}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              disabled={
                selected.size === 0 || !problemId || convert.isPending
              }
              onClick={() => convert.mutate()}
            >
              {t("youtube.comments.convert", { count: selected.size })}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {comments.isLoading ? <ListSkeleton rows={3} /> : null}
          {comments.data?.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("youtube.comments.empty")}
            </p>
          ) : null}
          {comments.data?.items.map((c) => (
            <div
              key={c.id}
              className={`rounded-md border p-3 text-sm ${
                c.isTopLevel ? "" : "ml-6 border-dashed"
              }`}
            >
              <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={selected.has(c.id)}
                  onChange={() => toggle(c.id)}
                  disabled={Boolean(c.evidenceId)}
                />
                <span className="font-medium text-foreground">
                  {c.authorDisplayName || t("common.none")}
                </span>
                <span>{formatDate(c.publishedAt, locale)}</span>
                {c.detectedLanguage ? (
                  <Badge variant="outline">{c.detectedLanguage}</Badge>
                ) : null}
                <span>
                  ♥ {c.likeCount}
                  {c.replyCount ? ` · ↩ ${c.replyCount}` : ""}
                </span>
                {c.evidenceId ? (
                  <Link
                    href={`/evidence/${c.evidenceId}`}
                    className="text-primary underline"
                  >
                    {t("youtube.comments.viewEvidence")}
                  </Link>
                ) : null}
              </div>
              <p className="whitespace-pre-wrap">{displayText(c, textMode)}</p>
              {textMode !== "original" &&
              displayText(c, textMode) !== c.textOriginal ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("youtube.comments.originalLabel")}: {c.textOriginal}
                </p>
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>

      <YouTubeAnalysisPanel videoId={id} />
    </div>
  );
}
