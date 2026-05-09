import type { Task } from "@/shared/types/domain";

export const SOON_DEADLINE_DAYS = 3;

export type DeadlineState = "none" | "overdue" | "soon" | "normal";

const startOfToday = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

export const getDeadlineState = (task: Pick<Task, "deadline" | "status">): DeadlineState => {
  if (!task.deadline) {
    return "none";
  }
  const deadline = new Date(task.deadline);
  if (Number.isNaN(deadline.getTime()) || task.status === "done") {
    return "normal";
  }
  const today = startOfToday();
  if (deadline < today) {
    return "overdue";
  }
  const soonLimit = new Date(today);
  soonLimit.setDate(today.getDate() + SOON_DEADLINE_DAYS);
  return deadline <= soonLimit ? "soon" : "normal";
};

export const formatTaskDeadline = (deadline?: string) =>
  deadline
    ? new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date(deadline))
    : "-";
