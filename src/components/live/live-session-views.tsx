"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { ListSkeleton } from "@/components/shared/list-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  useLiveSessionQuestions,
  useLiveSessionSubmissions,
  useLiveSessionReview,
  useLiveSessionUnanswered,
  useLiveSessionPublications,
  useQuestionAction,
  useMergeQuestions,
  useGenerateAnswerDraft,
  useUpdateTextAnswer,
  useApproveTextAnswer,
  useCreatePublication,
  useMarkPublication,
  type Question,
} from "@/hooks/use-live-sessions";
import { formatDate } from "@/lib/utils";
import { useI18n } from "@/i18n";
import { toast } from "sonner";

function SessionBackLink({ sessionId, label = "세션" }: { sessionId: string; label?: string }) {
  return (
    <Button variant="outline" asChild>
      <Link href={`/live-sessions/${sessionId}`}>
        <ArrowLeft className="h-4 w-4" />
        {label}
      </Link>
    </Button>
  );
}

export function LiveQuestionsView({ sessionId }: { sessionId: string }) {
  const { data, isLoading, error } = useLiveSessionQuestions(sessionId, "NEEDS_REVIEW");
  const action = useQuestionAction(sessionId);
  const merge = useMergeQuestions(sessionId);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (isLoading) return <ListSkeleton rows={5} />;
  if (error) {
    return (
      <EmptyState title="질문 불러오기 실패" description={(error as Error).message} />
    );
  }

  return (
    <div>
      <PageHeader
        title="질문 검토"
        description="NEEDS_REVIEW 상태 질문을 수락·거절·제외합니다."
        action={<SessionBackLink sessionId={sessionId} />}
      />

      {selected.size >= 2 ? (
        <div className="mb-4">
          <Button
            onClick={() =>
              merge.mutate({ questionIds: [...selected] }, {
                onSuccess: () => setSelected(new Set()),
              })
            }
            disabled={merge.isPending}
          >
            선택 병합 ({selected.size})
          </Button>
        </div>
      ) : null}

      {!data?.length ? (
        <EmptyState title="검토할 질문 없음" description="모든 질문이 처리되었습니다." />
      ) : (
        <div className="grid gap-3">
          {data.map((q) => (
            <Card key={q.id}>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selected.has(q.id)}
                    onChange={() => toggle(q.id)}
                    className="mt-1"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{q.questionText}</p>
                    {q.submission?.authorDisplayName ? (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {q.submission.authorDisplayName}
                      </p>
                    ) : null}
                  </div>
                  <Badge variant="warning">{q.status}</Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={() => action.mutate({ questionId: q.id, action: "accept" })}
                    disabled={action.isPending}
                  >
                    수락
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => action.mutate({ questionId: q.id, action: "reject" })}
                    disabled={action.isPending}
                  >
                    거절
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => action.mutate({ questionId: q.id, action: "exclude" })}
                    disabled={action.isPending}
                  >
                    제외
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      action.mutate({
                        questionId: q.id,
                        action: "important",
                        important: true,
                      })
                    }
                    disabled={action.isPending}
                  >
                    중요
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export function LiveSubmissionsView({ sessionId }: { sessionId: string }) {
  const { data, isLoading, error } = useLiveSessionSubmissions(sessionId);
  const { locale } = useI18n();

  if (isLoading) return <ListSkeleton rows={5} />;
  if (error) {
    return (
      <EmptyState title="접수 불러오기 실패" description={(error as Error).message} />
    );
  }

  return (
    <div>
      <PageHeader
        title="접수 목록"
        description="원본 채팅/댓글 접수 내역"
        action={<SessionBackLink sessionId={sessionId} />}
      />
      {!data?.length ? (
        <EmptyState title="접수 없음" description="목 채팅 가져오기로 샘플을 추가하세요." />
      ) : (
        <div className="grid gap-2">
          {data.map((sub) => (
            <Card key={sub.id}>
              <CardContent className="p-4">
                <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>{sub.authorDisplayName ?? "익명"}</span>
                  {sub.publishedAt ? (
                    <span>{formatDate(sub.publishedAt, locale)}</span>
                  ) : null}
                  {sub.messageType ? (
                    <Badge variant="outline">{sub.messageType}</Badge>
                  ) : null}
                  {sub.question ? (
                    <Badge variant="success">질문 감지</Badge>
                  ) : null}
                </div>
                <p className="text-sm">{sub.originalText}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export function LiveReviewView({ sessionId }: { sessionId: string }) {
  const { data, isLoading, error } = useLiveSessionReview(sessionId);
  const action = useQuestionAction(sessionId);

  if (isLoading) return <ListSkeleton rows={5} />;
  if (error) {
    return (
      <EmptyState title="검토 불러오기 실패" description={(error as Error).message} />
    );
  }
  if (!data) return null;

  const pending = data.questions.filter((q) =>
    ["POST_REVIEW_PENDING", "ANSWERED_LIVE", "PARTIALLY_ANSWERED_LIVE", "UNANSWERED"].includes(
      q.status,
    ),
  );

  return (
    <div>
      <PageHeader
        title="사후 검토"
        description="생방송 후 질문 상태를 확인합니다."
        action={<SessionBackLink sessionId={sessionId} />}
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Object.entries(data.counts).map(([key, val]) => (
          <Card key={key}>
            <CardContent className="p-4">
              <div className="text-2xl font-semibold">{val}</div>
              <div className="text-xs text-muted-foreground">{key}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-3">
        {pending.map((q) => (
          <Card key={q.id}>
            <CardContent className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium">{q.questionText}</p>
                <Badge variant="outline">{q.status}</Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() =>
                    action.mutate({
                      questionId: q.id,
                      action: "confirm-review",
                      status: "ANSWERED_LIVE",
                    })
                  }
                  disabled={action.isPending}
                >
                  생방 답변 확인
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    action.mutate({
                      questionId: q.id,
                      action: "confirm-review",
                      status: "PARTIALLY_ANSWERED_LIVE",
                    })
                  }
                  disabled={action.isPending}
                >
                  부분 답변
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    action.mutate({
                      questionId: q.id,
                      action: "confirm-review",
                      status: "UNANSWERED",
                    })
                  }
                  disabled={action.isPending}
                >
                  미답변
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function LiveUnansweredView({ sessionId }: { sessionId: string }) {
  const { data, isLoading, error } = useLiveSessionUnanswered(sessionId);
  const draft = useGenerateAnswerDraft(sessionId);

  if (isLoading) return <ListSkeleton rows={5} />;
  if (error) {
    return (
      <EmptyState title="미답변 불러오기 실패" description={(error as Error).message} />
    );
  }

  const unanswered = data?.filter((q) =>
    ["UNANSWERED", "POST_REVIEW_PENDING", "PARTIALLY_ANSWERED_LIVE"].includes(q.status),
  );

  return (
    <div>
      <PageHeader
        title="미답변"
        description="답변 초안이 필요한 질문"
        action={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href={`/live-sessions/${sessionId}/answers`}>답변 작성</Link>
            </Button>
            <SessionBackLink sessionId={sessionId} />
          </div>
        }
      />

      {!unanswered?.length ? (
        <EmptyState title="미답변 없음" />
      ) : (
        <div className="grid gap-3">
          {unanswered.map((q) => (
            <Card key={q.id}>
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">{q.questionText}</p>
                  <Badge variant="outline" className="mt-1">
                    {q.status}
                  </Badge>
                </div>
                <Button
                  onClick={() => draft.mutate(q.id)}
                  disabled={draft.isPending}
                >
                  초안 생성
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function AnswerEditor({
  question,
  sessionId,
}: {
  question: Question;
  sessionId: string;
}) {
  const textAnswer = question.textAnswers?.[0];
  const update = useUpdateTextAnswer();
  const approve = useApproveTextAnswer();
  const [draft, setDraft] = useState(
    textAnswer?.currentDraft ?? textAnswer?.aiDraft ?? "",
  );
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setDraft(textAnswer?.currentDraft ?? textAnswer?.aiDraft ?? "");
  }, [textAnswer?.currentDraft, textAnswer?.aiDraft]);

  const save = (value: string) => {
    if (!textAnswer?.id || value.trim().length === 0) return;
    update.mutate({ answerId: textAnswer.id, currentDraft: value });
  };

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <p className="font-medium">{question.questionText}</p>
          <Badge variant="outline">{question.status}</Badge>
        </div>
        {textAnswer ? (
          <>
            <Textarea
              value={draft}
              onChange={(e) => {
                const v = e.target.value;
                setDraft(v);
                if (timer.current) clearTimeout(timer.current);
                timer.current = setTimeout(() => save(v), 800);
              }}
              rows={6}
              className="text-base"
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => save(draft)}
                disabled={update.isPending}
              >
                저장
              </Button>
              <Button
                onClick={() => approve.mutate(textAnswer.id)}
                disabled={approve.isPending}
              >
                승인
              </Button>
            </div>
          </>
        ) : (
          <GenerateDraftButton sessionId={sessionId} questionId={question.id} />
        )}
      </CardContent>
    </Card>
  );
}

function GenerateDraftButton({
  sessionId,
  questionId,
}: {
  sessionId: string;
  questionId: string;
}) {
  const draft = useGenerateAnswerDraft(sessionId);
  return (
    <Button onClick={() => draft.mutate(questionId)} disabled={draft.isPending}>
      초안 생성
    </Button>
  );
}

export function LiveAnswersView({ sessionId }: { sessionId: string }) {
  const { data, isLoading, error } = useLiveSessionUnanswered(sessionId);

  if (isLoading) return <ListSkeleton rows={5} />;
  if (error) {
    return (
      <EmptyState title="답변 불러오기 실패" description={(error as Error).message} />
    );
  }

  const withDrafts = data?.filter(
    (q) =>
      q.textAnswers?.length ||
      ["UNANSWERED", "ANSWER_DRAFTED", "ANSWER_IN_REVIEW", "ANSWER_APPROVED", "READY_TO_PUBLISH"].includes(
        q.status,
      ),
  );

  return (
    <div>
      <PageHeader
        title="답변 작성"
        description="미답변 질문에 대한 텍스트 답변"
        action={<SessionBackLink sessionId={sessionId} />}
      />

      {!withDrafts?.length ? (
        <EmptyState
          title="작성할 답변 없음"
          description="미답변 페이지에서 초안을 생성하세요."
          action={
            <Button asChild>
              <Link href={`/live-sessions/${sessionId}/unanswered`}>미답변</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4">
          {withDrafts.map((q) => (
            <AnswerEditor key={q.id} question={q} sessionId={sessionId} />
          ))}
        </div>
      )}
    </div>
  );
}

export function LivePublicationsView({ sessionId }: { sessionId: string }) {
  const { data, isLoading, error } = useLiveSessionPublications(sessionId);
  const mark = useMarkPublication();

  const copyContent = async (content: string) => {
    await navigator.clipboard.writeText(content);
    toast.success("클립보드에 복사됨");
  };

  if (isLoading) return <ListSkeleton rows={4} />;
  if (error) {
    return (
      <EmptyState title="게시물 불러오기 실패" description={(error as Error).message} />
    );
  }

  return (
    <div>
      <PageHeader
        title="게시물"
        description="승인된 답변을 채널에 게시"
        action={
          <div className="flex gap-2">
            <Button asChild>
              <Link href={`/live-sessions/${sessionId}/publications/new`}>
                새 게시물
              </Link>
            </Button>
            <SessionBackLink sessionId={sessionId} />
          </div>
        }
      />

      {!data?.length ? (
        <EmptyState title="게시물 없음" description="새 게시물을 만드세요." />
      ) : (
        <div className="grid gap-4">
          {data.map((pub) => (
            <Card key={pub.id}>
              <CardContent className="space-y-3 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{pub.title}</p>
                    <div className="mt-1 flex gap-2">
                      <Badge variant="outline">{pub.status}</Badge>
                      <Badge variant="secondary">{pub.channelType}</Badge>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyContent(pub.content)}
                    >
                      복사
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        mark.mutate({ publicationId: pub.id, action: "copied" })
                      }
                      disabled={mark.isPending}
                    >
                      복사됨 표시
                    </Button>
                    <Button
                      size="sm"
                      onClick={() =>
                        mark.mutate({ publicationId: pub.id, action: "published" })
                      }
                      disabled={mark.isPending}
                    >
                      게시 완료
                    </Button>
                  </div>
                </div>
                <pre className="max-h-48 overflow-auto rounded border bg-muted/30 p-3 text-xs whitespace-pre-wrap">
                  {pub.content}
                </pre>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export function LiveNewPublicationView({ sessionId }: { sessionId: string }) {
  const { data: questions } = useLiveSessionQuestions(sessionId);
  const create = useCreatePublication(sessionId);
  const [title, setTitle] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const ready = useMemo(
    () =>
      questions?.filter((q) =>
        ["ANSWER_APPROVED", "READY_TO_PUBLISH", "PUBLISHED"].includes(q.status),
      ) ?? [],
    [questions],
  );

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div>
      <PageHeader
        title="새 게시물"
        description="게시할 질문을 선택하세요"
        action={
          <Button variant="outline" asChild>
            <Link href={`/live-sessions/${sessionId}/publications`}>목록</Link>
          </Button>
        }
      />

      <Card className="mb-6 max-w-lg">
        <CardContent className="space-y-4 pt-6">
          <div>
            <label className="mb-1 block text-sm font-medium">제목</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <Button
            disabled={!title.trim() || selected.size === 0 || create.isPending}
            onClick={() =>
              create.mutate(
                {
                  title: title.trim(),
                  channelType: "YOUTUBE_COMMUNITY",
                  formatType: "FAQ",
                  questionIds: [...selected],
                },
                {
                  onSuccess: () => {
                    window.location.href = `/live-sessions/${sessionId}/publications`;
                  },
                },
              )
            }
          >
            생성
          </Button>
        </CardContent>
      </Card>

      {!ready.length ? (
        <EmptyState title="게시 준비 질문 없음" description="답변을 승인한 후 선택하세요." />
      ) : (
        <div className="grid gap-2">
          {ready.map((q) => (
            <Card key={q.id}>
              <CardContent className="flex items-start gap-3 p-4">
                <input
                  type="checkbox"
                  checked={selected.has(q.id)}
                  onChange={() => toggle(q.id)}
                  className="mt-1"
                />
                <div>
                  <p className="text-sm font-medium">{q.questionText}</p>
                  <Badge variant="outline" className="mt-1">
                    {q.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export function LiveActivityLinkView({ sessionId }: { sessionId: string }) {
  return (
    <div>
      <PageHeader
        title="활동"
        description="이 세션 관련 활동 로그"
        action={<SessionBackLink sessionId={sessionId} />}
      />
      <Card>
        <CardContent className="p-6">
          <p className="mb-4 text-sm text-muted-foreground">
            전체 활동 로그에서 이 세션 관련 항목을 확인할 수 있습니다.
          </p>
          <Button asChild>
            <Link href="/activity">활동 페이지로 이동</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
