import type { TaskPriority, TaskStatus } from "@/shared/types/domain";
import type { TaskFilter } from "@/features/dashboard/model/types";

export const defaultTaskFilter: TaskFilter = {
  hideCompleted: true,
  taskId: "",
  taskName: "",
  assigneeIds: [],
  due: [],
  priorities: [],
  statuses: [],
};

export const emptyTaskFilter: TaskFilter = {
  ...defaultTaskFilter,
  hideCompleted: false,
};

export const priorityTone: Record<TaskPriority, string> = {
  low: "border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200",
  medium: "border-amber-100 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-200",
  high: "border-rose-100 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-200",
};

export const progressTone: Record<TaskStatus, string> = {
  todo: "border-amber-100 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-200",
  in_progress: "border-blue-100 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-200",
  done: "border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200",
};

export const progressLabel: Record<TaskStatus, string> = {
  todo: "Pending",
  in_progress: "In Progress",
  done: "Finish",
};

export const dueFilterOptions = [
  { value: "overdue", label: "Overdue" },
  { value: "no_due", label: "No due date" },
  { value: "this_week", label: "This week" },
  { value: "future", label: "Future" },
] as const;
