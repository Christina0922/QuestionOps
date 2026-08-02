"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  ClipboardList,
  FileText,
  HelpCircle,
  LayoutDashboard,
  MessageSquare,
  Radio,
  Send,
  ListChecks,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { ListSkeleton } from "@/components/shared/list-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  useCreateLiveSession,
  useLiveSession,
  useUpdateLiveSessionStatus,
  useImportSubmissions,
  usePrepareReview,
} from "@/hooks/use-live-sessions";
import { toast } from "sonner";

const navLinks = (sessionId: string) => [
  {
    href: `/live-sessions/${sessionId}/submissions`,
    label: "채팅 목록",
    hint: "들어온 채팅·댓글 전체",
    icon: MessageSquare,
  },
  {
    href: `/live-sessions/${sessionId}/questions`,
    label: "질문 고르기",
    hint: "잡담 빼고 답할 질문만 승인",
    icon: ListChecks,
  },
  {
    href: `/live-sessions/${sessionId}/control`,
    label: "방송 화면",
    hint: "방송 중 강사에게 질문 보여 주기",
    icon: Radio,
  },
  {
    href: `/live-sessions/${sessionId}/unanswered`,
    label: "못 답한 질문",
    hint: "방송 후 남은 것",
    icon: HelpCircle,
  },
  {
    href: `/live-sessions/${sessionId}/answers`,
    label: "글로 답하기",
    hint: "못 답한 질문에 글 답변",
    icon: FileText,
  },
  {
    href: `/live-sessions/${sessionId}/review`,
    label: "방송 후 확인",
    hint: "남은 질문·답을 한눈에 보기",
    icon: ClipboardList,
  },
  {
    href: `/live-sessions/${sessionId}/publications`,
    label: "올릴 글",
    hint: "카카오·유튜브용으로 복사",
    icon: Send,
  },
  {
    href: `/live-sessions/${sessionId}/activity`,
    label: "활동 기록",
    hint: "무엇이 바뀌었는지",
    icon: Activity,
  },
];

const statusLabel: Record<string, string> = {
  DRAFT: "작성 중",
  SCHEDULED: "예정",
  PREPARING: "준비",
  LIVE: "방송 중",
  ENDED: "방송 끝",
  PROCESSING: "글 답변 준비",
  REVIEW_READY: "남은 질문 있음",
  ANSWER_WRITING: "글 답변 중",
  READY_TO_PUBLISH: "올릴 준비됨",
  COMPLETED: "완료",
  ARCHIVED: "보관",
  CANCELLED: "취소",
};

export function LiveSessionHub({ sessionId }: { sessionId: string }) {
  const { data, isLoading, error } = useLiveSession(sessionId);
  const updateStatus = useUpdateLiveSessionStatus(sessionId);
  const importSubmissions = useImportSubmissions(sessionId);
  const prepareReview = usePrepareReview(sessionId);

  if (isLoading) return <ListSkeleton rows={6} />;
  if (error) {
    return (
      <EmptyState
        title="강의를 불러오지 못했어요"
        description={(error as Error).message}
      />
    );
  }
  if (!data) return null;

  return (
    <div>
      <PageHeader
        title={data.title}
        description={
          data.description ??
          "아래 숫자 순서대로만 따라 하면 됩니다. 처음이면 1번부터."
        }
        action={
          <Button variant="outline" asChild>
            <Link href="/live-sessions">
              <LayoutDashboard className="h-4 w-4" />
              목록
            </Link>
          </Button>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Badge variant={data.status === "LIVE" ? "danger" : "secondary"}>
          {statusLabel[data.status] ?? data.status}
        </Badge>
        <span className="text-sm text-muted-foreground">
          질문 {data.totalQuestions} · 방송에서 답함 {data.answeredLiveCount} ·
          아직 못 답함 {data.unansweredCount}
        </span>
      </div>

      <Card className="mb-6 border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-base">처음이면 이 순서</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <ol className="list-decimal space-y-2 pl-5 text-muted-foreground">
            <li>
              <strong className="text-foreground">연습용 채팅 가져오기</strong>{" "}
              — YouTube 연결 전에도 연습할 수 있어요.
            </li>
            <li>
              <strong className="text-foreground">질문 고르기</strong> — 답할
              질문만 승인.
            </li>
            <li>
              <strong className="text-foreground">방송 시작</strong> 후{" "}
              <strong className="text-foreground">방송 화면</strong>에서 질문
              넘기기.
            </li>
            <li>
              방송이 끝나면 <strong className="text-foreground">종료</strong> →{" "}
              <strong className="text-foreground">못 답한 질문</strong>에 글로
              답하기.
            </li>
          </ol>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              onClick={() =>
                importSubmissions.mutate(
                  {},
                  {
                    onSuccess: () =>
                      toast.success("연습용 채팅을 가져왔어요. 이제 「질문 고르기」로 가세요."),
                  },
                )
              }
              disabled={importSubmissions.isPending}
            >
              1. 연습용 채팅 가져오기
            </Button>
            <Button variant="secondary" asChild>
              <Link href={`/live-sessions/${sessionId}/questions`}>
                2. 질문 고르기
              </Link>
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                updateStatus.mutate("LIVE", {
                  onSuccess: () => toast.success("방송 중으로 바꿨어요"),
                })
              }
              disabled={updateStatus.isPending || data.status === "LIVE"}
            >
              <Radio className="h-4 w-4" />
              3. 방송 시작
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/live-sessions/${sessionId}/control`}>
                방송 화면 열기
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="mb-6 flex flex-wrap gap-2">
        <Button
          variant="outline"
          onClick={() =>
            updateStatus.mutate("ENDED", {
              onSuccess: () => toast.success("방송을 끝냈어요"),
            })
          }
          disabled={updateStatus.isPending}
        >
          방송 종료
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            prepareReview.mutate(undefined, {
              onSuccess: () => toast.success("못 답한 질문을 볼 준비가 됐어요"),
            })
          }
          disabled={prepareReview.isPending}
        >
          못 답한 질문 준비
        </Button>
        <Button variant="outline" asChild>
          <Link href="/guide">시작 가이드</Link>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {navLinks(sessionId).map((link) => {
          const Icon = link.icon;
          return (
            <Link key={link.href} href={link.href}>
              <Card className="h-full transition-colors hover:border-primary/40">
                <CardContent className="flex items-start gap-3 p-4">
                  <Icon className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                  <div>
                    <div className="font-medium">{link.label}</div>
                    <p className="text-xs text-muted-foreground">{link.hint}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">지금 상태</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>들어온 채팅 {data.totalSubmissions}</div>
          <div>방송에서 답함 {data.answeredLiveCount}</div>
          <div>일부만 답함 {data.partiallyAnsweredCount}</div>
          <div>올린 답 {data.publishedAnswerCount}</div>
        </CardContent>
      </Card>
    </div>
  );
}

export function LiveNewSessionForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const create = useCreateLiveSession();

  return (
    <div>
      <PageHeader
        title="첫 강의 만들기"
        description="오늘(또는 이번) 방송 이름을 적으면 됩니다. YouTube를 아직 안 연결해도 연습할 수 있어요."
      />
      <Card className="max-w-lg">
        <CardContent className="space-y-4 pt-6">
          <p className="text-sm text-muted-foreground">
            만든 뒤 「연습용 채팅 가져오기」→「질문 고르기」→「방송 화면」
            순서로 눌러 보세요. 자세한 설명은{" "}
            <Link href="/guide" className="underline underline-offset-2">
              시작 가이드
            </Link>
            에 있습니다.
          </p>
          <div>
            <label className="mb-1 block text-sm font-medium">강의 이름</label>
            <input
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 8월 1일 유튜브 라이브"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">
              메모 (선택)
            </label>
            <textarea
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="예: 환불·일정 질문이 많을 예정"
            />
          </div>
          <div className="flex gap-2">
            <Button
              disabled={!title.trim() || create.isPending}
              onClick={() =>
                create.mutate(
                  {
                    title: title.trim(),
                    description: description.trim() || undefined,
                  },
                  {
                    onSuccess: (session) => {
                      toast.success("강의를 만들었어요. 연습용 채팅부터 가져와 보세요.");
                      router.push(`/live-sessions/${session.id}`);
                    },
                  },
                )
              }
            >
              만들고 시작하기
            </Button>
            <Button variant="outline" asChild>
              <Link href="/live-sessions">취소</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
