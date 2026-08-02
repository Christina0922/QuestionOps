"use client";

import { useCallback, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { ListSkeleton } from "@/components/shared/list-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  useLiveSession,
  useQuestionAction,
  type Question,
} from "@/hooks/use-live-sessions";
import { cn } from "@/lib/utils";

function isInputTarget(target: EventTarget | null) {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}

function QueueList({
  title,
  items,
  empty,
  highlightId,
}: {
  title: string;
  items: Array<{ id: string; question: Question }>;
  empty: string;
  highlightId?: string | null;
}) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="max-h-[40vh] space-y-2 overflow-y-auto">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{empty}</p>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className={cn(
                "rounded-md border p-2 text-sm",
                highlightId === item.question.id && "border-primary bg-primary/5",
              )}
            >
              <p className="line-clamp-3">{item.question.questionText}</p>
              {item.question.isImportant ? (
                <Badge variant="warning" className="mt-1">
                  중요
                </Badge>
              ) : null}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function ActionButton({
  label,
  shortcut,
  onClick,
  disabled,
  variant = "outline",
}: {
  label: string;
  shortcut?: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: "outline" | "default" | "secondary" | "destructive";
}) {
  return (
    <Button
      type="button"
      variant={variant}
      size="lg"
      className="h-auto min-h-14 flex-col gap-1 py-3 text-base"
      onClick={onClick}
      disabled={disabled}
    >
      <span>{label}</span>
      {shortcut ? (
        <span className="text-xs font-normal text-muted-foreground">
          [{shortcut}]
        </span>
      ) : null}
    </Button>
  );
}

export function LiveControlView({ sessionId }: { sessionId: string }) {
  const { data, isLoading, error } = useLiveSession(sessionId, { poll: true });
  const action = useQuestionAction(sessionId);

  const current = data?.currentQuestion ?? null;

  const waiting =
    data?.queue.filter((q) => q.status === "WAITING" || q.status === "NEXT") ??
    [];
  const important =
    data?.queue.filter(
      (q) =>
        q.question.isImportant &&
        !["COMPLETED", "REMOVED", "DEFERRED"].includes(q.status),
    ) ?? [];
  const deferred =
    data?.queue.filter((q) => q.status === "DEFERRED") ?? [];
  const nextItem =
    data?.queue.find((q) => q.status === "NEXT") ??
    data?.queue.find((q) => q.status === "WAITING");
  const recent = data?.recentQuestions ?? [];

  const runAction = useCallback(
    (
      act: Parameters<typeof action.mutate>[0]["action"],
      questionId?: string | null,
      extra?: Partial<Parameters<typeof action.mutate>[0]>,
    ) => {
      const qid = questionId ?? current?.id;
      if (!qid) return;
      action.mutate({ questionId: qid, action: act, ...extra });
    },
    [action, current?.id],
  );

  const presentNext = useCallback(() => {
    const target = nextItem?.question.id ?? current?.id;
    if (target) runAction("present", target);
  }, [nextItem, current?.id, runAction]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isInputTarget(e.target)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const map: Record<string, () => void> = {
        a: () => runAction("answer-live"),
        p: () => runAction("partial-answer"),
        l: () => runAction("defer"),
        n: () => presentNext(),
        d: () => runAction("duplicate"),
        i: () => runAction("important", current?.id, { important: true }),
        x: () => runAction("exclude"),
      };
      const fn = map[e.key.toLowerCase()];
      if (fn) {
        e.preventDefault();
        fn();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [runAction, presentNext, current?.id]);

  if (isLoading) return <ListSkeleton rows={6} />;
  if (error) {
    return (
      <EmptyState
        title="컨트롤 불러오기 실패"
        description={(error as Error).message}
      />
    );
  }
  if (!data) return null;

  return (
    <div>
      <PageHeader
        title="라이브 컨트롤"
        description={data.title}
        action={
          <Button variant="outline" asChild>
            <Link href={`/live-sessions/${sessionId}`}>
              <ArrowLeft className="h-4 w-4" />
              세션
            </Link>
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Badge variant={data.status === "LIVE" ? "danger" : "secondary"}>
          {data.status}
        </Badge>
        <Badge variant="outline">대기 {waiting.length}</Badge>
        <Badge variant="outline">중요 {important.length}</Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4">
          <QueueList
            title="대기열"
            items={waiting}
            empty="대기 중인 질문 없음"
            highlightId={current?.id}
          />
          <QueueList
            title="중요"
            items={important}
            empty="중요 질문 없음"
          />
          <QueueList
            title="보류"
            items={deferred}
            empty="보류 질문 없음"
          />
        </div>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="text-base">현재 질문</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-4">
            {current ? (
              <>
                <p className="flex-1 text-lg leading-relaxed">
                  {current.questionText}
                </p>
                {current.submission?.authorDisplayName ? (
                  <p className="text-sm text-muted-foreground">
                    {current.submission.authorDisplayName}
                  </p>
                ) : null}
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="lg"
                    onClick={() => runAction("present", current.id)}
                    disabled={action.isPending}
                  >
                    발표
                  </Button>
                  <Button
                    size="lg"
                    variant="secondary"
                    onClick={() => runAction("start-answer", current.id)}
                    disabled={action.isPending}
                  >
                    답변 시작
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
                <p className="text-muted-foreground">표시할 질문 없음</p>
                {nextItem ? (
                  <Button size="lg" onClick={presentNext} disabled={action.isPending}>
                    다음 질문 발표
                  </Button>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">다음</CardTitle>
            </CardHeader>
            <CardContent>
              {nextItem ? (
                <p className="text-sm line-clamp-4">
                  {nextItem.question.questionText}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">없음</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">최근 처리</CardTitle>
            </CardHeader>
            <CardContent className="max-h-32 space-y-2 overflow-y-auto">
              {recent.length === 0 ? (
                <p className="text-sm text-muted-foreground">없음</p>
              ) : (
                recent.map((q) => (
                  <div key={q.id} className="rounded border p-2 text-xs">
                    <Badge variant="outline" className="mb-1">
                      {q.status}
                    </Badge>
                    <p className="line-clamp-2">{q.questionText}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-2">
            <ActionButton
              label="생방 답변"
              shortcut="A"
              onClick={() => runAction("answer-live")}
              disabled={!current || action.isPending}
              variant="default"
            />
            <ActionButton
              label="부분 답변"
              shortcut="P"
              onClick={() => runAction("partial-answer")}
              disabled={!current || action.isPending}
            />
            <ActionButton
              label="보류"
              shortcut="L"
              onClick={() => runAction("defer")}
              disabled={!current || action.isPending}
            />
            <ActionButton
              label="다음/발표"
              shortcut="N"
              onClick={presentNext}
              disabled={action.isPending || (!nextItem && !current)}
            />
            <ActionButton
              label="중복"
              shortcut="D"
              onClick={() => runAction("duplicate")}
              disabled={!current || action.isPending}
            />
            <ActionButton
              label="중요"
              shortcut="I"
              onClick={() =>
                runAction("important", current?.id, { important: true })
              }
              disabled={!current || action.isPending}
            />
            <ActionButton
              label="제외"
              shortcut="X"
              onClick={() => runAction("exclude")}
              disabled={!current || action.isPending}
              variant="destructive"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
