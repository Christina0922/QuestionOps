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
  { href: `/live-sessions/${sessionId}/control`, label: "라이브 컨트롤", icon: Radio },
  { href: `/live-sessions/${sessionId}/questions`, label: "질문 검토", icon: ListChecks },
  { href: `/live-sessions/${sessionId}/submissions`, label: "접수 목록", icon: MessageSquare },
  { href: `/live-sessions/${sessionId}/review`, label: "사후 검토", icon: ClipboardList },
  { href: `/live-sessions/${sessionId}/unanswered`, label: "미답변", icon: HelpCircle },
  { href: `/live-sessions/${sessionId}/answers`, label: "답변 작성", icon: FileText },
  { href: `/live-sessions/${sessionId}/publications`, label: "게시물", icon: Send },
  { href: `/live-sessions/${sessionId}/activity`, label: "활동", icon: Activity },
];

export function LiveSessionHub({ sessionId }: { sessionId: string }) {
  const { data, isLoading, error } = useLiveSession(sessionId);
  const updateStatus = useUpdateLiveSessionStatus(sessionId);
  const importSubmissions = useImportSubmissions(sessionId);
  const prepareReview = usePrepareReview(sessionId);

  if (isLoading) return <ListSkeleton rows={6} />;
  if (error) {
    return (
      <EmptyState
        title="세션 불러오기 실패"
        description={(error as Error).message}
      />
    );
  }
  if (!data) return null;

  return (
    <div>
      <PageHeader
        title={data.title}
        description={data.description ?? undefined}
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
          {data.status}
        </Badge>
        <span className="text-sm text-muted-foreground">
          질문 {data.totalQuestions} · 답변 {data.answeredLiveCount} · 미답{" "}
          {data.unansweredCount}
        </span>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <Button
          size="lg"
          onClick={() =>
            updateStatus.mutate("LIVE", {
              onSuccess: () => toast.success("LIVE 시작"),
            })
          }
          disabled={updateStatus.isPending || data.status === "LIVE"}
        >
          <Radio className="h-4 w-4" />
          LIVE 시작
        </Button>
        <Button
          size="lg"
          variant="secondary"
          onClick={() =>
            updateStatus.mutate("ENDED", {
              onSuccess: () => toast.success("세션 종료"),
            })
          }
          disabled={updateStatus.isPending}
        >
          종료
        </Button>
        <Button
          size="lg"
          variant="outline"
          onClick={() => importSubmissions.mutate({})}
          disabled={importSubmissions.isPending}
        >
          목 채팅 가져오기
        </Button>
        <Button
          size="lg"
          variant="outline"
          onClick={() => prepareReview.mutate()}
          disabled={prepareReview.isPending}
        >
          검토 준비
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {navLinks(sessionId).map((link) => {
          const Icon = link.icon;
          return (
            <Link key={link.href} href={link.href}>
              <Card className="h-full transition-colors hover:border-primary/40">
                <CardContent className="flex items-center gap-3 p-4">
                  <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <span className="font-medium">{link.label}</span>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">요약</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>접수 {data.totalSubmissions}</div>
          <div>생방 답변 {data.answeredLiveCount}</div>
          <div>부분 답변 {data.partiallyAnsweredCount}</div>
          <div>게시 {data.publishedAnswerCount}</div>
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
      <PageHeader title="새 라이브 세션" description="세션 정보를 입력하세요." />
      <Card className="max-w-lg">
        <CardContent className="space-y-4 pt-6">
          <div>
            <label className="mb-1 block text-sm font-medium">제목</label>
            <input
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 8월 라이브 Q&A"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">설명</label>
            <textarea
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="선택"
            />
          </div>
          <div className="flex gap-2">
            <Button
              disabled={!title.trim() || create.isPending}
              onClick={() =>
                create.mutate(
                  { title: title.trim(), description: description.trim() || undefined },
                  {
                    onSuccess: (session) => {
                      toast.success("세션 생성됨");
                      router.push(`/live-sessions/${session.id}`);
                    },
                  },
                )
              }
            >
              생성
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
