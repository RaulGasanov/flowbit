import { Badge } from "@/shared/ui/badge";
import { Avatar } from "@/shared/ui/avatar";
import type { Task, User } from "@/shared/types/domain";

interface TaskCardProps {
  task: Task;
  assignee?: User;
  onOpen: (taskId: string) => void;
}

const priorityToneMap = {
  low: "success",
  medium: "warning",
  high: "danger",
} as const;

const taskIconMap = {
  low: "✎",
  medium: "▣",
  high: "◎",
} as const;

const statusText = {
  todo: "Pending",
  in_progress: "In Progress",
  done: "Finish",
} as const;

export const TaskCard = ({ task, assignee, onOpen }: TaskCardProps) => (
  <button
    type="button"
    className="w-full cursor-pointer rounded-lg border border-border bg-panel p-4 text-left shadow-[0_10px_26px_rgb(15_23_42/0.04)] transition hover:-translate-y-0.5 hover:border-accent/30 hover:bg-surface hover:shadow-[0_16px_36px_rgb(15_23_42/0.08)] dark:shadow-none"
    onClick={() => onOpen(task.id)}
  >
    <div className="flex items-start justify-between gap-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-panel-muted text-lg ring-1 ring-border">
        {taskIconMap[task.priority]}
      </span>
      <Badge tone={priorityToneMap[task.priority]} className="rounded-md px-2 py-0.5 text-[11px]">
        {task.priority}
      </Badge>
    </div>
    <div className="mt-5 min-w-0">
      <h4 className="line-clamp-2 text-sm font-semibold leading-5 text-foreground">{task.title}</h4>
      <p className="mt-2 line-clamp-2 min-h-10 text-xs leading-5 text-muted">{task.description}</p>
    </div>
    <div className="mt-4 border-t border-border pt-3">
      <div
        className={
          task.deadline && new Date(task.deadline) < new Date() && task.status !== "done"
            ? "mb-3 text-xs font-medium text-rose-500"
            : "mb-3 text-xs font-medium text-soft"
        }
      >
        {task.deadline ? new Date(task.deadline).toLocaleDateString() : "No due date"}
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center">
          {assignee ? (
            <Avatar name={assignee.name} src={assignee.avatarUrl} className="h-6 w-6 border-2 border-panel" />
          ) : (
            <span className="h-6 w-6 rounded-full bg-panel-muted" />
          )}
        </div>
        <span className="rounded-md bg-panel-muted px-2 py-1 text-xs font-medium text-muted">
          {statusText[task.status]}
        </span>
      </div>
    </div>
  </button>
);
