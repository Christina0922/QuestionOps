"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { ListSkeleton } from "@/components/shared/list-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { apiFetch } from "@/lib/api-client";
import { useI18n } from "@/i18n";
import type { MessageKey } from "@/i18n";
import {
  useDisconnectYouTube,
  useYouTubeStatus,
} from "@/hooks/use-youtube";

const statusKeys: Record<string, MessageKey> = {
  CONNECTED: "youtube.status.connected",
  REAUTH_REQUIRED: "youtube.status.reauth",
  REVOKED: "youtube.status.revoked",
  ERROR: "youtube.status.error",
  DISCONNECTED: "youtube.status.disconnected",
};
export function YouTubeSettingsView() {
  const { t, locale } = useI18n();
  const { data, isLoading, error, refetch } = useYouTubeStatus();
  const disconnect = useDisconnectYouTube();
  const search = useSearchParams();

  useEffect(() => {
    if (search.get("connected") === "1") {
      toast.success(t("youtube.connected"));
      refetch();
    }
    const err = search.get("error");
    if (err) toast.error(err);
  }, [search, t, refetch]);

  if (isLoading) return <ListSkeleton rows={4} />;
  if (error) {
    return (
      <EmptyState
        title={t("common.failedLoad")}
        description={(error as Error).message}
      />
    );
  }
  if (!data) return null;

  const statusLabel = data.status
    ? t(statusKeys[data.status] ?? "youtube.status.disconnected")
    : t("youtube.status.disconnected");

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("youtube.settingsTitle")}
        description={t("youtube.settingsDescription")}
      />

      {!data.configured ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("youtube.notConfiguredTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>{t("youtube.notConfiguredBody")}</p>
            {data.missingEnv.length > 0 ? (
              <ul className="list-disc pl-5">
                {data.missingEnv.map((env) => (
                  <li key={env}>
                    <code>{env}</code>
                  </li>
                ))}
              </ul>
            ) : null}
            <p>{t("youtube.operatorHint")}</p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">{t("youtube.connectionStatus")}</CardTitle>
          <Badge
            variant={
              data.connected
                ? "success"
                : data.reauthRequired
                  ? "warning"
                  : "secondary"
            }
          >
            {statusLabel}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          {!data.connected && !data.reauthRequired ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground whitespace-pre-line">
                {t("youtube.connectHint")}
              </p>
              <Button asChild disabled={!data.configured && !data.mockMode}>
                <a href="/api/integrations/youtube/connect">
                  {t("youtube.connect")}
                </a>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {data.channel ? (
                <div className="flex items-start gap-4">
                  {data.channel.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={data.channel.thumbnailUrl}
                      alt={data.channel.title}
                      className="h-16 w-16 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-sm">
                      YT
                    </div>
                  )}
                  <div className="space-y-1 text-sm">
                    <div className="text-base font-semibold">
                      {data.channel.title}
                    </div>
                    {data.channel.customUrl ? (
                      <div className="text-muted-foreground">
                        {data.channel.customUrl}
                      </div>
                    ) : null}
                    <div className="text-muted-foreground">
                      {t("youtube.channelId")}: {data.channel.youtubeChannelId}
                    </div>
                  </div>
                </div>
              ) : null}

              <dl className="grid gap-3 sm:grid-cols-2 text-sm">
                <div>
                  <dt className="text-xs uppercase text-muted-foreground">
                    {t("youtube.googleAccount")}
                  </dt>
                  <dd>{data.googleAccountEmail || t("common.none")}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase text-muted-foreground">
                    {t("youtube.lastConnected")}
                  </dt>
                  <dd>{formatDate(data.lastConnectedAt, locale)}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase text-muted-foreground">
                    {t("youtube.lastSynced")}
                  </dt>
                  <dd>
                    {formatDate(data.channel?.lastSyncedAt ?? null, locale)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase text-muted-foreground">
                    {t("youtube.lastRefreshed")}
                  </dt>
                  <dd>{formatDate(data.lastRefreshedAt, locale)}</dd>
                </div>
              </dl>

              {data.lastErrorMessage ? (
                <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
                  <div className="font-medium">{t("youtube.syncError")}</div>
                  <p className="text-muted-foreground">{data.lastErrorMessage}</p>
                </div>
              ) : null}

              {data.reauthRequired ? (
                <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-sm">
                  {t("youtube.reauthHint")}
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline">
                  <a href="/api/integrations/youtube/connect">
                    {t("youtube.reconnect")}
                  </a>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/youtube/videos">{t("nav.youtubeVideos")}</Link>
                </Button>
                <Button
                  variant="destructive"
                  disabled={disconnect.isPending}
                  onClick={async () => {
                    if (!confirm(t("youtube.confirmDisconnect"))) return;
                    await disconnect.mutateAsync();
                  }}
                >
                  {t("youtube.disconnect")}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <YouTubeAdminPanel />
    </div>
  );
}

function YouTubeAdminPanel() {
  const { t } = useI18n();
  const { data, isLoading } = useQuery({
    queryKey: ["youtube-admin"],
    queryFn: () =>
      apiFetch<{
        quota: {
          totalUnits: number;
          sinceHours: number;
          dailyCapHint: number;
          byOperation: Record<string, number>;
        };
        jobs: Array<{
          id: string;
          jobType: string;
          status: string;
          processedCount: number;
          errorMessage?: string | null;
          createdAt: string;
        }>;
        caps: {
          maxCommentsImport: number;
          maxCommentsAnalyze: number;
          incrementalStopAfterKnown: number;
        };
      }>("/api/youtube/admin"),
  });

  if (isLoading || !data) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("youtube.admin.title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div>
          <div className="font-medium">{t("youtube.admin.quota")}</div>
          <p className="text-muted-foreground">
            {t("youtube.admin.quotaDetail", {
              units: data.quota.totalUnits,
              hours: data.quota.sinceHours,
              cap: data.quota.dailyCapHint,
            })}
          </p>
        </div>
        <div>
          <div className="font-medium">{t("youtube.admin.caps")}</div>
          <p className="text-muted-foreground">
            import ≤ {data.caps.maxCommentsImport} · analyze ≤{" "}
            {data.caps.maxCommentsAnalyze} · incremental stop @{" "}
            {data.caps.incrementalStopAfterKnown} known
          </p>
        </div>
        <div className="space-y-2">
          <div className="font-medium">{t("youtube.admin.jobs")}</div>
          {data.jobs.length === 0 ? (
            <p className="text-muted-foreground">{t("common.none")}</p>
          ) : (
            data.jobs.slice(0, 10).map((job) => (
              <div
                key={job.id}
                className="flex flex-wrap items-center gap-2 rounded border px-2 py-1"
              >
                <Badge variant="outline">{job.jobType}</Badge>
                <Badge variant="secondary">{job.status}</Badge>
                <span className="text-xs text-muted-foreground">
                  {job.processedCount} · {job.createdAt}
                </span>
                {job.errorMessage ? (
                  <span className="text-xs text-destructive">
                    {job.errorMessage}
                  </span>
                ) : null}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
