import { Avatar } from "@/shared/ui/avatar";
import { formatTaskDeadline, getDeadlineState } from "@/entities/task/lib/deadline";
import { priorityTone, progressLabel, progressTone } from "@/features/dashboard/model/constants";
import type { Task, User } from "@/shared/types/domain";

interface TaskTableProps {
  tasks: Task[];
  users: User[];
  onOpenTask: (taskId: string) => void;
  onNew: () => void;
  canToggleTask: (task: Task) => boolean;
  onToggleTaskDone: (task: Task) => void;
}

export const TaskTable = ({
  tasks,
  users,
  onOpenTask,
  onNew,
  canToggleTask,
  onToggleTaskDone,
}: TaskTableProps) => (
  <div className="overflow-x-auto">
    <table className="min-w-[840px] w-full border-collapse text-left text-sm">
      <thead>
        <tr className="border-b border-border text-[13px] font-medium text-muted">
          <th className="w-10 px-4 py-3">
            <span className="block h-4 w-4 rounded-full border border-border bg-panel" />
          </th>
          <th className="w-20 px-2 py-3">#</th>
          <th className="w-24 px-2 py-3">Task ID</th>
          <th className="px-3 py-3">Task Name</th>
          <th className="w-48 px-3 py-3">Assigned</th>
          <th className="w-40 px-3 py-3">Due</th>
          <th className="w-36 px-3 py-3">Priority</th>
          <th className="w-40 px-3 py-3">Progress</th>
        </tr>
      </thead>
      <tbody>
        {tasks.map((task, index) => {
          const assignee = users.find((user) => user.id === task.assigneeId);
          const canToggle = canToggleTask(task);
          return (
            <tr
              key={task.id}
              className="cursor-pointer border-b border-border text-foreground/80 transition hover:bg-panel-muted"
              onClick={() => onOpenTask(task.id)}
            >
              <td className="px-4 py-3">
                <button
                  type="button"
                  className={
                    task.status === "done"
                      ? "grid h-4 w-4 place-items-center rounded-full border border-accent/40 bg-accent/10 transition hover:bg-accent/15"
                      : "grid h-4 w-4 place-items-center rounded-full border border-border bg-panel transition hover:border-accent/60 hover:bg-accent/5"
                  }
                  aria-label={task.status === "done" ? `Mark ${task.title} as todo` : `Mark ${task.title} as done`}
                  disabled={!canToggle}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (!canToggle) {
                      return;
                    }
                    onToggleTaskDone(task);
                  }}
                >
                  {task.status === "done" ? <span className="h-1.5 w-1.5 rounded-full bg-accent" /> : null}
                </button>
              </td>
              <td className="px-2 py-3 text-muted">{index + 1}</td>
              <td className="px-2 py-3 text-muted">{task.id.replace("tsk_", "")}</td>
              <td className="max-w-[280px] px-3 py-3">
                <p className={task.status === "done" ? "truncate text-muted line-through" : "truncate font-medium text-foreground"}>
                  {task.title}
                </p>
              </td>
              <td className="px-3 py-3">
                <div className="flex items-center gap-2">
                  <Avatar name={assignee?.name ?? "Unassigned"} src={assignee?.avatarUrl} className="h-7 w-7" />
                  <span className="truncate">{assignee?.name ?? "Unassigned"}</span>
                </div>
              </td>
              <td className="px-3 py-3">
                <span
                  className={
                    getDeadlineState(task) === "overdue"
                      ? "font-medium text-rose-500"
                      : getDeadlineState(task) === "soon"
                        ? "font-medium text-amber-600 dark:text-amber-300"
                        : "text-muted"
                  }
                >
                  {getDeadlineState(task) === "soon" ? "🔥 " : ""}
                  {formatTaskDeadline(task.deadline)}
                </span>
              </td>
              <td className="px-3 py-3">
                <span className={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium leading-none capitalize ${priorityTone[task.priority]}`}>
                  {task.priority}
                </span>
              </td>
              <td className="px-3 py-3">
                <span className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium leading-none ${progressTone[task.status]}`}>
                  {progressLabel[task.status]}
                </span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
    <button
      type="button"
      className="flex w-full items-center gap-2 border-b border-border px-4 py-3 text-sm font-medium text-muted hover:bg-panel-muted hover:text-foreground"
      onClick={() => onNew()}
    >
      <span className="text-lg">+</span> New
    </button>
  </div>
);
