import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/cn";
import { formFieldFocusClassName } from "@/shared/lib/form-field";
import { defaultTaskFilter, dueFilterOptions, progressLabel } from "@/features/dashboard/model/constants";
import { toggleValue } from "@/features/dashboard/model/utils";
import type { TaskFilter } from "@/features/dashboard/model/types";
import type { User } from "@/shared/types/domain";

interface TaskFilterPanelProps {
  filter: TaskFilter;
  users: User[];
  onChange: (filter: TaskFilter) => void;
  onClear: () => void;
}

export const TaskFilterPanel = ({ filter, users, onChange, onClear }: TaskFilterPanelProps) => {
  const checkClassName = "h-4 w-4 rounded border-border text-accent focus:ring-1 focus:ring-accent/20";
  const labelClassName = "flex items-center gap-2 rounded-lg border border-border bg-panel px-3 py-2 text-sm text-muted";
  const textInputClassName = cn(
    "h-10 rounded-xl border bg-panel px-3 text-sm text-foreground",
    formFieldFocusClassName,
  );

  return (
    <div className="grid gap-4 border-b border-border bg-panel-muted px-4 py-4">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-1 text-xs font-medium text-muted">
          Task ID
          <input
            value={filter.taskId}
            onChange={(event) => onChange({ ...filter, taskId: event.target.value })}
            placeholder="Search task ID"
            className={textInputClassName}
          />
        </label>
        <label className="grid gap-1 text-xs font-medium text-muted">
          Task Name
          <input
            value={filter.taskName}
            onChange={(event) => onChange({ ...filter, taskName: event.target.value })}
            placeholder="Search task name"
            className={textInputClassName}
          />
        </label>
      </div>

      <div className="grid gap-3 lg:grid-cols-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Progress</p>
          <label className={labelClassName}>
            <input
              type="checkbox"
              checked={filter.hideCompleted}
              onChange={(event) => onChange({ ...filter, hideCompleted: event.target.checked })}
              className={checkClassName}
            />
            Hide completed
          </label>
          {(["todo", "in_progress", "done"] as const).map((status) => (
            <label key={status} className={labelClassName}>
              <input
                type="checkbox"
                checked={filter.statuses.includes(status)}
                onChange={() => onChange({ ...filter, statuses: toggleValue(filter.statuses, status) })}
                className={checkClassName}
              />
              {progressLabel[status]}
            </label>
          ))}
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Priority</p>
          {(["low", "medium", "high"] as const).map((priority) => (
            <label key={priority} className={labelClassName}>
              <input
                type="checkbox"
                checked={filter.priorities.includes(priority)}
                onChange={() => onChange({ ...filter, priorities: toggleValue(filter.priorities, priority) })}
                className={checkClassName}
              />
              {priority}
            </label>
          ))}
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Due</p>
          {dueFilterOptions.map((option) => (
            <label key={option.value} className={labelClassName}>
              <input
                type="checkbox"
                checked={filter.due.includes(option.value)}
                onChange={() => onChange({ ...filter, due: toggleValue(filter.due, option.value) })}
                className={checkClassName}
              />
              {option.label}
            </label>
          ))}
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Assigned</p>
          {[{ id: "unassigned", name: "Unassigned" }, ...users].map((user) => (
            <label key={user.id} className={labelClassName}>
              <input
                type="checkbox"
                checked={filter.assigneeIds.includes(user.id)}
                onChange={() => onChange({ ...filter, assigneeIds: toggleValue(filter.assigneeIds, user.id) })}
                className={checkClassName}
              />
              {user.name}
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => onChange(defaultTaskFilter)}>
          Reset default
        </Button>
        <Button variant="secondary" onClick={onClear}>
          Show all
        </Button>
      </div>
    </div>
  );
};
