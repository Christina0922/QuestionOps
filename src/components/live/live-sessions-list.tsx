"use client";

import Link from "next/link";
import { Radio } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { ListSkeleton } from "@/components/shared/list-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { useLiveSessions, type LiveSessionStatus } from "@/hooks/use-live-sessions";
import { useI18n } from "@/i18n";

const sessionStatusVariant: Record<
  LiveSessionStatus,
  "secondary" | "warning" | "success" | "default" | "outline" | "danger"
> = {
  DRAFT: "secondary",
  SCHEDULED: "outline",
  PREPARING: "warning",
  LIVE: "danger",
  ENDED: "secondary",
  PROCESSING: "warning",
  REVIEW_READY: "default",
  ANSWER_WRITING: "warning",
  READY_TO_PUBLISH: "success",
  COMPLETED: "success",
  ARCHIVED: "outline",
  CANCELLED: "outline",
};

const sessionStatusLabel: Record<LiveSessionStatus, string> = {
  DRAFT: "초안",
  SCHEDULED: "예정",
  PREPARING: "준비",
  LIVE: "LIVE",
  ENDED: "종료",
  PROCESSING: "처리 중",
  REVIEW_READY: "검토 준비",
  ANSWER_WRITING: "답변 작성",
  READY_TO_PUBLISH: "게시 준비",
  COMPLETED: "완료",
  ARCHIVED: "보관",
  CANCELLED: "취소",
};

export function LiveSessionsList() {
  const { data, isLoading, error } = useLiveSessions();
  const { locale } = useI18n();

  if (isLoading) return <ListSkeleton rows={5} />;
  if (error) {
    return (
      <EmptyState
        title="라이브 세션 불러오기 실패"
        description={(error as Error).message}
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="라이브 세션"
        description="질문 접수부터 생방송 답변, 사후 정리까지 관리합니다."
        actionHref="/live-sessions/new"
        actionLabel="새 세션"
      />

      {!data?.length ? (
        <EmptyState
          title="라이브 세션이 없습니다"
          description="새 세션을 만들어 시작하세요."
          action={
            <Button asChild>
              <Link href="/live-sessions/new">새 세션 만들기</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3">
          {data.map((session) => (
            <Link key={session.id} href={`/live-sessions/${session.id}`}>
              <Card className="transition-colors hover:border-primary/40">
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <Badge variant={sessionStatusVariant[session.status]}>
                        {session.status === "LIVE" ? (
                          <span className="flex items-center gap-1">
                            <Radio className="h-3 w-3" />
                            LIVE
                          </span>
                        ) : (
                          sessionStatusLabel[session.status]
                        )}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(session.updatedAt, locale)}
                      </span>
                    </div>
                    <div className="truncate font-medium">{session.title}</div>
                    {session.description ? (
                      <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                        {session.description}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2 text-xs text-muted-foreground">
                    <span>질문 {session.totalQuestions}</span>
                    <span>·</span>
                    <span>답변 {session.answeredLiveCount}</span>
                    <span>·</span>
                    <span>미답 {session.unansweredCount}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
