import { Badge } from "@/components/ui/badge";
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
  return <Badge variant={priorityVariant[priority]}>{priority}</Badge>;
}

export function StatusBadge({ status }: { status: ProblemStatus }) {
  return <Badge variant={statusVariant[status]}>{status.replace("_", " ")}</Badge>;
}
