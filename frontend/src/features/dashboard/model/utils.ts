import type { Task } from "@/shared/types/domain";
import type { SortDirection, TaskFilter } from "@/features/dashboard/model/types";

export const isSameWeek = (date: Date, current: Date) => {
  const start = new Date(current);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay());
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return date >= start && date < end;
};

export const matchesDueFilter = (task: Task, value: string) => {
  if (value === "no_due") {
    return !task.deadline;
  }
  if (!task.deadline) {
    return false;
  }
  const dueDate = new Date(task.deadline);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (value === "overdue") {
    return dueDate < today && task.status !== "done";
  }
  if (value === "this_week") {
    return isSameWeek(dueDate, new Date());
  }
  if (value === "future") {
    return dueDate >= today;
  }
  return true;
};

export const toggleValue = <T extends string>(values: T[], value: T) =>
  values.includes(value) ? values.filter((item) => item !== value) : [...values, value];

export const taskMatchesFilter = (task: Task, filter: TaskFilter) => {
  if (filter.hideCompleted && task.status === "done") {
    return false;
  }
  if (filter.taskId.trim()) {
    const value = filter.taskId.trim().toLowerCase();
    if (!task.id.toLowerCase().includes(value) && !task.id.replace("tsk_", "").toLowerCase().includes(value)) {
      return false;
    }
  }
  if (filter.taskName.trim() && !task.title.toLowerCase().includes(filter.taskName.trim().toLowerCase())) {
    return false;
  }
  if (filter.assigneeIds.length > 0) {
    const assigneeValue = task.assigneeId || "unassigned";
    if (!filter.assigneeIds.includes(assigneeValue)) {
      return false;
    }
  }
  if (filter.due.length > 0 && !filter.due.some((value) => matchesDueFilter(task, value))) {
    return false;
  }
  if (filter.priorities.length > 0 && !filter.priorities.includes(task.priority)) {
    return false;
  }
  if (filter.statuses.length > 0 && !filter.statuses.includes(task.status)) {
    return false;
  }
  return true;
};

export const isFilterActive = (filter: TaskFilter) =>
  filter.hideCompleted ||
  Boolean(filter.taskId.trim()) ||
  Boolean(filter.taskName.trim()) ||
  filter.assigneeIds.length > 0 ||
  filter.due.length > 0 ||
  filter.priorities.length > 0 ||
  filter.statuses.length > 0;

export const applyTaskSort = (tasks: Task[], sortDirection: SortDirection) => {
  if (sortDirection === "none") {
    return tasks;
  }
  return [...tasks].sort((a, b) => {
    const byName = a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
    return sortDirection === "asc" ? byName : -byName;
  });
};

export const nextSortDirection = (direction: SortDirection): SortDirection => {
  if (direction === "none") {
    return "asc";
  }
  if (direction === "asc") {
    return "desc";
  }
  return "none";
};
