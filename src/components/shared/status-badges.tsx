"use client";

import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/i18n";
import type { ProblemPriority, ProblemStatus } from "@/types";

const priorityVariant: Record<
  ProblemPriority,
  "secondary" | "warning" | "danger" | "default"
> = {
  LOW: "secondary",
  MEDIUM: "default",
  HIGH: "warning",
  CRITICAL: "danger",
};

const statusVariant: Record<
  ProblemStatus,
  "secondary" | "warning" | "success" | "outline" | "default"
> = {
  OPEN: "warning",
  IN_PROGRESS: "default",
  RESOLVED: "success",
  CLOSED: "outline",
};

export function PriorityBadge({ priority }: { priority: ProblemPriority }) {
  const { t } = useI18n();
  return (
    <Badge variant={priorityVariant[priority]}>
      {t(`priority.${priority}` as const)}
    </Badge>
  );
}

export function StatusBadge({ status }: { status: ProblemStatus }) {
  const { t } = useI18n();
  return (
    <Badge variant={statusVariant[status]}>
      {t(`status.${status}` as const)}
    </Badge>
  );
}
