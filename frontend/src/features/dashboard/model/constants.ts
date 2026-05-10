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
  low: "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-200 dark:ring-emerald-900",
  medium: "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-950/50 dark:text-amber-200 dark:ring-amber-900",
  high: "bg-rose-50 text-rose-700 ring-rose-100 dark:bg-rose-950/50 dark:text-rose-200 dark:ring-rose-900",
};

export const progressTone: Record<TaskStatus, string> = {
  todo: "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-950/50 dark:text-amber-200 dark:ring-amber-900",
  in_progress: "bg-blue-50 text-blue-700 ring-blue-100 dark:bg-blue-950/50 dark:text-blue-200 dark:ring-blue-900",
  done: "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-200 dark:ring-emerald-900",
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
