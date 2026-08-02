"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";

export type LiveSessionStatus =
  | "DRAFT"
  | "SCHEDULED"
  | "PREPARING"
  | "LIVE"
  | "ENDED"
  | "PROCESSING"
  | "REVIEW_READY"
  | "ANSWER_WRITING"
  | "READY_TO_PUBLISH"
  | "COMPLETED"
  | "ARCHIVED"
  | "CANCELLED";

export type QuestionStatus =
  | "DETECTED"
  | "NEEDS_REVIEW"
  | "ACCEPTED"
  | "REJECTED"
  | "DUPLICATE"
  | "EXCLUDED"
  | "WAITING"
  | "QUEUED"
  | "ASSIGNED"
  | "PRESENTED_TO_SPEAKER"
  | "ANSWERING_LIVE"
  | "ANSWERED_LIVE"
  | "PARTIALLY_ANSWERED_LIVE"
  | "UNANSWERED"
  | "POST_REVIEW_PENDING"
  | "ANSWER_DRAFTED"
  | "ANSWER_IN_REVIEW"
  | "ANSWER_APPROVED"
  | "READY_TO_PUBLISH"
  | "PUBLISHED"
  | "RESOLVED"
  | "ARCHIVED";

export type QuestionAction =
  | "accept"
  | "reject"
  | "exclude"
  | "duplicate"
  | "present"
  | "start-answer"
  | "answer-live"
  | "partial-answer"
  | "defer"
  | "important"
  | "confirm-review";

export type LiveSession = {
  id: string;
  title: string;
  description?: string | null;
  status: LiveSessionStatus;
  totalSubmissions: number;
  totalQuestions: number;
  answeredLiveCount: number;
  partiallyAnsweredCount: number;
  unansweredCount: number;
  publishedAnswerCount: number;
  scheduledStartAt?: string | null;
  actualStartAt?: string | null;
  actualEndAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Question = {
  id: string;
  questionText: string;
  status: QuestionStatus;
  priority: string;
  isImportant: boolean;
  createdAt: string;
  updatedAt: string;
  submission?: {
    authorDisplayName?: string | null;
    originalText?: string;
  } | null;
  textAnswers?: Array<{
    id: string;
    currentDraft?: string | null;
    aiDraft?: string | null;
    finalAnswer?: string | null;
    status: string;
  }>;
  liveAnswers?: Array<{ id: string; transcriptText?: string | null }>;
  queueItem?: { status: string } | null;
};

export type QueueItem = {
  id: string;
  status: string;
  defaultPosition: number;
  manualPosition?: number | null;
  question: Question;
};

export type LiveSessionDetail = LiveSession & {
  queue: QueueItem[];
  currentQuestion: Question | null;
  recentQuestions: Question[];
};

export type LiveDashboardData = {
  todaySessions: number;
  sessions: LiveSession[];
  totals: {
    questions: number;
    answered: number;
    partial: number;
    unanswered: number;
    published: number;
  };
  draftCount: number;
  reviewPending: number;
};

export type Publication = {
  id: string;
  title: string;
  content: string;
  status: string;
  channelType: string;
  formatType: string;
  createdAt: string;
  copiedAt?: string | null;
  publishedAt?: string | null;
  items: Array<{ id: string; questionText: string; answerText: string }>;
};

const sessionKey = (id?: string) =>
  id ? (["live-sessions", id] as const) : (["live-sessions"] as const);

function invalidateSession(qc: ReturnType<typeof useQueryClient>, id?: string) {
  qc.invalidateQueries({ queryKey: sessionKey() });
  if (id) qc.invalidateQueries({ queryKey: sessionKey(id) });
  qc.invalidateQueries({ queryKey: ["live-dashboard"] });
  qc.invalidateQueries({ queryKey: ["dashboard"] });
}

export function useLiveSessions() {
  return useQuery({
    queryKey: sessionKey(),
    queryFn: () => apiFetch<LiveSession[]>("/api/live-sessions"),
  });
}

export function useLiveSession(id: string, options?: { poll?: boolean }) {
  return useQuery({
    queryKey: sessionKey(id),
    queryFn: () => apiFetch<LiveSessionDetail>(`/api/live-sessions/${id}`),
    enabled: Boolean(id),
    refetchInterval: options?.poll ? 2000 : false,
  });
}

export function useLiveDashboard() {
  return useQuery({
    queryKey: ["live-dashboard"],
    queryFn: () => apiFetch<LiveDashboardData>("/api/live-dashboard"),
  });
}

export function useCreateLiveSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { title: string; description?: string }) =>
      apiFetch<LiveSession>("/api/live-sessions", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => invalidateSession(qc),
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateLiveSessionStatus(sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (status: LiveSessionStatus) =>
      apiFetch<LiveSession>(`/api/live-sessions/${sessionId}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => invalidateSession(qc, sessionId),
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useImportSubmissions(sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body?: { source?: "mock" | "youtube_comments"; maxItems?: number }) =>
      apiFetch<{ created: number; questionsDetected: number }>(
        `/api/live-sessions/${sessionId}/submissions`,
        {
          method: "POST",
          body: JSON.stringify({ source: "mock", maxItems: 50, ...body }),
        },
      ),
    onSuccess: (data) => {
      invalidateSession(qc, sessionId);
      toast.success(`접수 ${data.created}건, 질문 ${data.questionsDetected}건`);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useLiveSessionQuestions(
  sessionId: string,
  status?: QuestionStatus,
) {
  const qs = status ? `?status=${status}` : "";
  return useQuery({
    queryKey: ["live-sessions", sessionId, "questions", status ?? "all"],
    queryFn: () =>
      apiFetch<Question[]>(`/api/live-sessions/${sessionId}/questions${qs}`),
    enabled: Boolean(sessionId),
  });
}

export function useLiveSessionSubmissions(sessionId: string) {
  return useQuery({
    queryKey: ["live-sessions", sessionId, "submissions"],
    queryFn: () =>
      apiFetch<
        Array<{
          id: string;
          originalText: string;
          authorDisplayName?: string | null;
          messageType?: string | null;
          publishedAt?: string | null;
          question?: Question | null;
        }>
      >(`/api/live-sessions/${sessionId}/submissions`),
    enabled: Boolean(sessionId),
  });
}

export function useLiveSessionReview(sessionId: string) {
  return useQuery({
    queryKey: ["live-sessions", sessionId, "review"],
    queryFn: () =>
      apiFetch<{
        session: LiveSession;
        counts: Record<string, number>;
        questions: Question[];
      }>(`/api/live-sessions/${sessionId}/review`),
    enabled: Boolean(sessionId),
  });
}

export function usePrepareReview(sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch(`/api/live-sessions/${sessionId}/review`, { method: "POST" }),
    onSuccess: () => {
      invalidateSession(qc, sessionId);
      qc.invalidateQueries({ queryKey: ["live-sessions", sessionId, "review"] });
      toast.success("사후 검토 준비 완료");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useLiveSessionUnanswered(sessionId: string) {
  return useQuery({
    queryKey: ["live-sessions", sessionId, "unanswered"],
    queryFn: () =>
      apiFetch<Question[]>(`/api/live-sessions/${sessionId}/unanswered`),
    enabled: Boolean(sessionId),
  });
}

export function useQuestionAction(sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      questionId,
      action,
      ...rest
    }: {
      questionId: string;
      action: QuestionAction;
      reason?: string;
      important?: boolean;
      childTexts?: string[];
      status?: "ANSWERED_LIVE" | "PARTIALLY_ANSWERED_LIVE" | "UNANSWERED";
    }) =>
      apiFetch<Question>(
        `/api/live-sessions/${sessionId}/questions/${questionId}`,
        {
          method: "POST",
          body: JSON.stringify({ action, ...rest }),
        },
      ),
    onSuccess: () => invalidateSession(qc, sessionId),
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useMergeQuestions(sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { questionIds: string[]; representativeText?: string }) =>
      apiFetch(`/api/live-sessions/${sessionId}/merge-questions`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      invalidateSession(qc, sessionId);
      qc.invalidateQueries({
        queryKey: ["live-sessions", sessionId, "questions"],
      });
      toast.success("질문 병합 완료");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useGenerateAnswerDraft(sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (questionId: string) =>
      apiFetch(`/api/live-sessions/${sessionId}/questions/${questionId}/answer-draft`, {
        method: "POST",
      }),
    onSuccess: () => {
      invalidateSession(qc, sessionId);
      qc.invalidateQueries({ queryKey: ["live-sessions", sessionId, "unanswered"] });
      toast.success("답변 초안 생성됨");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateTextAnswer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      answerId,
      currentDraft,
    }: {
      answerId: string;
      currentDraft: string;
    }) =>
      apiFetch(`/api/text-answers/${answerId}`, {
        method: "PATCH",
        body: JSON.stringify({ currentDraft }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["live-sessions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useApproveTextAnswer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (answerId: string) =>
      apiFetch(`/api/text-answers/${answerId}`, {
        method: "POST",
        body: JSON.stringify({ action: "approve" }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["live-sessions"] });
      toast.success("답변 승인됨");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useLiveSessionPublications(sessionId: string) {
  return useQuery({
    queryKey: ["live-sessions", sessionId, "publications"],
    queryFn: () =>
      apiFetch<Publication[]>(`/api/live-sessions/${sessionId}/publications`),
    enabled: Boolean(sessionId),
  });
}

export function useCreatePublication(sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      title: string;
      introduction?: string;
      closing?: string;
      channelType: string;
      formatType: string;
      questionIds: string[];
    }) =>
      apiFetch<Publication>(`/api/live-sessions/${sessionId}/publications`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      invalidateSession(qc, sessionId);
      qc.invalidateQueries({
        queryKey: ["live-sessions", sessionId, "publications"],
      });
      toast.success("게시물 생성됨");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useMarkPublication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      publicationId,
      action,
      externalUrl,
    }: {
      publicationId: string;
      action: "copied" | "published";
      externalUrl?: string;
    }) =>
      apiFetch(`/api/publications/${publicationId}`, {
        method: "POST",
        body: JSON.stringify({ action, externalUrl }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["live-sessions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
