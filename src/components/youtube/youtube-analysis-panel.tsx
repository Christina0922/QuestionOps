"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { apiFetch } from "@/lib/api-client";
import { useI18n } from "@/i18n";
import { useProblems } from "@/hooks/use-problems";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type AnalysisPayload = {
  id: string;
  status: string;
  processedCount: number;
  clusterCount: number;
  errorMessage?: string | null;
  clusters: Array<{
    id: string;
    name: string;
    summary?: string | null;
    reviewStatus: string;
    primaryClassification?: string | null;
    supportingCommentIds: string[];
    approvedClusterId?: string | null;
  }>;
  knowledgeCandidates: Array<{
    id: string;
    title: string;
    description: string;
    confidence: number;
    reviewStatus: string;
    approvedKnowledgeId?: string | null;
  }>;
  capabilityCandidates: Array<{
    id: string;
    name: string;
    description: string;
    reviewStatus: string;
    approvedCapabilityId?: string | null;
  }>;
  classifiedComments: Array<{
    id: string;
    textOriginal: string;
    classification?: string | null;
    sentiment?: string | null;
    urgency?: number | null;
  }>;
};

export function YouTubeAnalysisPanel({ videoId }: { videoId: string }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const problems = useProblems({ pageSize: 100 });
  const [problemId, setProblemId] = useState("");

  const analysis = useQuery({
    queryKey: ["youtube-analysis", videoId],
    queryFn: () =>
      apiFetch<AnalysisPayload | null>(
        `/api/youtube/videos/${videoId}/analysis`,
      ),
    refetchInterval: (q) =>
      q.state.data?.status === "RUNNING" ? 1500 : false,
  });

  useEffect(() => {
    const first = problems.data?.items?.[0] as { id?: string } | undefined;
    if (!problemId && first?.id) setProblemId(first.id);
  }, [problems.data, problemId]);

  const start = useMutation({
    mutationFn: () =>
      apiFetch(`/api/youtube/videos/${videoId}/analysis`, {
        method: "POST",
        body: JSON.stringify({ maxComments: 100 }),
      }),
    onSuccess: () => {
      toast.success(t("youtube.analysis.started"));
      qc.invalidateQueries({ queryKey: ["youtube-analysis", videoId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const candidates = useMutation({
    mutationFn: () =>
      apiFetch(`/api/youtube/videos/${videoId}/analysis/candidates`, {
        method: "POST",
      }),
    onSuccess: () => {
      toast.success(t("youtube.analysis.candidatesReady"));
      qc.invalidateQueries({ queryKey: ["youtube-analysis", videoId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reviewCluster = useMutation({
    mutationFn: ({
      clusterId,
      action,
    }: {
      clusterId: string;
      action: "approve" | "reject";
    }) =>
      apiFetch(
        `/api/youtube/videos/${videoId}/analysis/clusters/${clusterId}/review`,
        {
          method: "POST",
          body: JSON.stringify({ action, problemId: problemId || null }),
        },
      ),
    onSuccess: () => {
      toast.success(t("youtube.analysis.reviewSaved"));
      qc.invalidateQueries({ queryKey: ["youtube-analysis", videoId] });
      qc.invalidateQueries({ queryKey: ["clusters"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reviewKnowledge = useMutation({
    mutationFn: ({
      candidateId,
      action,
    }: {
      candidateId: string;
      action: "approve" | "reject";
    }) =>
      apiFetch(
        `/api/youtube/videos/${videoId}/analysis/knowledge/${candidateId}/review`,
        {
          method: "POST",
          body: JSON.stringify({ action, problemId: problemId || null }),
        },
      ),
    onSuccess: () => {
      toast.success(t("youtube.analysis.reviewSaved"));
      qc.invalidateQueries({ queryKey: ["youtube-analysis", videoId] });
      qc.invalidateQueries({ queryKey: ["knowledge"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reviewCapability = useMutation({
    mutationFn: ({
      candidateId,
      action,
    }: {
      candidateId: string;
      action: "approve" | "reject";
    }) =>
      apiFetch(
        `/api/youtube/videos/${videoId}/analysis/capabilities/${candidateId}/review`,
        {
          method: "POST",
          body: JSON.stringify({ action, problemId: problemId || null }),
        },
      ),
    onSuccess: () => {
      toast.success(t("youtube.analysis.reviewSaved"));
      qc.invalidateQueries({ queryKey: ["youtube-analysis", videoId] });
      qc.invalidateQueries({ queryKey: ["capabilities"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const data = analysis.data;

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">{t("youtube.analysis.title")}</CardTitle>
          {data?.status ? <Badge variant="outline">{data.status}</Badge> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={() => start.mutate()}
            disabled={start.isPending || data?.status === "RUNNING"}
          >
            {t("youtube.analysis.run")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => candidates.mutate()}
            disabled={
              candidates.isPending ||
              !data ||
              data.status !== "COMPLETED" ||
              data.clusters.length === 0
            }
          >
            {t("youtube.analysis.generateCandidates")}
          </Button>
          <Select value={problemId} onValueChange={setProblemId}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder={t("youtube.comments.selectProblem")} />
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
        </div>
        {data?.errorMessage ? (
          <p className="text-sm text-destructive">{data.errorMessage}</p>
        ) : null}
        {data?.status === "RUNNING" ? (
          <p className="text-sm text-muted-foreground">
            {t("youtube.analysis.progress", {
              processed: data.processedCount,
            })}
          </p>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-6">
        {!data ? (
          <p className="text-sm text-muted-foreground">
            {t("youtube.analysis.empty")}
          </p>
        ) : null}

        {data?.classifiedComments?.length ? (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">
              {t("youtube.analysis.classified")}
            </h3>
            <div className="max-h-56 space-y-2 overflow-y-auto">
              {data.classifiedComments.slice(0, 20).map((c) => (
                <div key={c.id} className="rounded border p-2 text-sm">
                  <div className="mb-1 flex flex-wrap gap-1">
                    {c.classification ? (
                      <Badge variant="secondary">{c.classification}</Badge>
                    ) : null}
                    {c.sentiment ? (
                      <Badge variant="outline">{c.sentiment}</Badge>
                    ) : null}
                    {c.urgency != null ? (
                      <Badge variant="outline">U{c.urgency}</Badge>
                    ) : null}
                  </div>
                  <p className="whitespace-pre-wrap text-muted-foreground">
                    {c.textOriginal}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {data?.clusters?.length ? (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">
              {t("youtube.analysis.clusters")} ({data.clusterCount})
            </h3>
            {data.clusters.map((cluster) => (
              <div key={cluster.id} className="space-y-2 rounded border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{cluster.name}</span>
                  <Badge variant="outline">{cluster.reviewStatus}</Badge>
                  {cluster.primaryClassification ? (
                    <Badge variant="secondary">
                      {cluster.primaryClassification}
                    </Badge>
                  ) : null}
                  <span className="text-xs text-muted-foreground">
                    {cluster.supportingCommentIds.length} comments
                  </span>
                </div>
                {cluster.summary ? (
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {cluster.summary}
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  {cluster.reviewStatus !== "APPROVED" &&
                  cluster.reviewStatus !== "REJECTED" ? (
                    <>
                      <Button
                        size="sm"
                        onClick={() =>
                          reviewCluster.mutate({
                            clusterId: cluster.id,
                            action: "approve",
                          })
                        }
                      >
                        {t("youtube.analysis.approve")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          reviewCluster.mutate({
                            clusterId: cluster.id,
                            action: "reject",
                          })
                        }
                      >
                        {t("youtube.analysis.reject")}
                      </Button>
                    </>
                  ) : null}
                  {cluster.approvedClusterId ? (
                    <Button size="sm" variant="ghost" asChild>
                      <Link href={`/clusters/${cluster.approvedClusterId}`}>
                        {t("youtube.analysis.openCluster")}
                      </Link>
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {data?.knowledgeCandidates?.length ? (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">
              {t("youtube.analysis.knowledge")}
            </h3>
            {data.knowledgeCandidates.map((k) => (
              <div key={k.id} className="space-y-2 rounded border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{k.title}</span>
                  <Badge variant="outline">{k.reviewStatus}</Badge>
                </div>
                <p className="line-clamp-4 text-sm text-muted-foreground">
                  {k.description}
                </p>
                <div className="flex gap-2">
                  {k.reviewStatus === "AI_GENERATED" ? (
                    <>
                      <Button
                        size="sm"
                        onClick={() =>
                          reviewKnowledge.mutate({
                            candidateId: k.id,
                            action: "approve",
                          })
                        }
                      >
                        {t("youtube.analysis.approve")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          reviewKnowledge.mutate({
                            candidateId: k.id,
                            action: "reject",
                          })
                        }
                      >
                        {t("youtube.analysis.reject")}
                      </Button>
                    </>
                  ) : null}
                  {k.approvedKnowledgeId ? (
                    <Button size="sm" variant="ghost" asChild>
                      <Link href={`/knowledge/${k.approvedKnowledgeId}`}>
                        {t("youtube.analysis.openKnowledge")}
                      </Link>
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {data?.capabilityCandidates?.length ? (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">
              {t("youtube.analysis.capabilities")}
            </h3>
            {data.capabilityCandidates.map((c) => (
              <div key={c.id} className="space-y-2 rounded border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{c.name}</span>
                  <Badge variant="outline">{c.reviewStatus}</Badge>
                </div>
                <p className="line-clamp-3 text-sm text-muted-foreground">
                  {c.description}
                </p>
                <div className="flex gap-2">
                  {c.reviewStatus === "AI_GENERATED" ? (
                    <>
                      <Button
                        size="sm"
                        onClick={() =>
                          reviewCapability.mutate({
                            candidateId: c.id,
                            action: "approve",
                          })
                        }
                      >
                        {t("youtube.analysis.approve")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          reviewCapability.mutate({
                            candidateId: c.id,
                            action: "reject",
                          })
                        }
                      >
                        {t("youtube.analysis.reject")}
                      </Button>
                    </>
                  ) : null}
                  {c.approvedCapabilityId ? (
                    <Button size="sm" variant="ghost" asChild>
                      <Link href={`/capabilities/${c.approvedCapabilityId}`}>
                        {t("youtube.analysis.openCapability")}
                      </Link>
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
