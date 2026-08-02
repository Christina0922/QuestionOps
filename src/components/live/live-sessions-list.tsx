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
  DRAFT: "작성 중",
  SCHEDULED: "예정",
  PREPARING: "준비",
  LIVE: "방송 중",
  ENDED: "방송 끝",
  PROCESSING: "글 답변 준비",
  REVIEW_READY: "남은 질문 있음",
  ANSWER_WRITING: "글 답변 중",
  READY_TO_PUBLISH: "올릴 준비",
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
        title="강의 목록을 불러오지 못했어요"
        description={(error as Error).message}
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="강의 질문"
        description="유튜브 채팅 질문을 모읍니다. 방송 중에는 말로 답하고, 못 한 질문은 방송이 끝난 뒤 글로 답합니다."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href="/guide">시작 가이드</Link>
            </Button>
            <Button asChild>
              <Link href="/live-sessions/new">첫 강의 만들기</Link>
            </Button>
          </div>
        }
      />

      <Card className="mb-6">
        <CardContent className="space-y-2 p-4 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">처음이라면:</strong> 강의 하나
            만들기 → 연습용 채팅 가져오기 → 질문 고르기 → 방송 화면. YouTube
            연결은 나중에 해도 됩니다.
          </p>
        </CardContent>
      </Card>

      {!data?.length ? (
        <EmptyState
          title="아직 강의가 없어요"
          description="이름을 하나 정하고 만들면, 가짜 채팅으로 바로 연습할 수 있습니다."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild>
                <Link href="/live-sessions/new">첫 강의 만들기</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/guide">시작 가이드 보기</Link>
              </Button>
            </div>
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
                            방송 중
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
                    <span>답함 {session.answeredLiveCount}</span>
                    <span>·</span>
                    <span>못 답함 {session.unansweredCount}</span>
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
