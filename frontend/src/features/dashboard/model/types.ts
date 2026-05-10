import type { TaskPriority, TaskStatus } from "@/shared/types/domain";

export interface TaskFilter {
  hideCompleted: boolean;
  taskId: string;
  taskName: string;
  assigneeIds: string[];
  due: string[];
  priorities: TaskPriority[];
  statuses: TaskStatus[];
}

export type StatusToast = { message: string; tone: "success" | "error" };
export type SortDirection = "none" | "asc" | "desc";
