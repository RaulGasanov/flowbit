"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { AppShell } from "@/widgets/app-shell/ui/app-shell";
import { Modal } from "@/shared/ui/modal";
import { Button } from "@/shared/ui/button";
import { Avatar } from "@/shared/ui/avatar";
import { Toast } from "@/shared/ui/toast";
import { Select } from "@/shared/ui/select";
import { useCurrentPermissions, useCurrentUser } from "@/entities/user/model/store";
import { useProjectsStore } from "@/entities/project/model/store";
import { BoardSkeleton } from "@/widgets/board/ui/board-skeleton";
import { KanbanBoard } from "@/widgets/board/ui/kanban-board";
import { TaskCreateForm } from "@/features/create-task/ui/task-create-form";
import { useCreateTask } from "@/features/create-task/model/use-create-task";
import { useMoveTask } from "@/features/move-task/model/use-move-task";
import { useAddComment } from "@/features/add-comment/model/use-add-comment";
import { TaskDetails } from "@/entities/task/ui/task-details";
import { useTasksStore } from "@/entities/task/model/store";
import type { Task, TaskPriority, TaskStatus, User } from "@/shared/types/domain";

type TaskFilterColumn = "none" | "taskId" | "taskName" | "assigned" | "due" | "priority" | "progress";

interface TaskFilter {
  column: TaskFilterColumn;
  value: string;
}

type StatusToast = { message: string; tone: "success" | "error" };

const emptyTaskFilter: TaskFilter = { column: "none", value: "" };

const priorityTone: Record<TaskPriority, string> = {
  low: "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-200 dark:ring-emerald-900",
  medium: "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-950/50 dark:text-amber-200 dark:ring-amber-900",
  high: "bg-rose-50 text-rose-700 ring-rose-100 dark:bg-rose-950/50 dark:text-rose-200 dark:ring-rose-900",
};

const progressTone: Record<TaskStatus, string> = {
  todo: "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-950/50 dark:text-amber-200 dark:ring-amber-900",
  in_progress: "bg-blue-50 text-blue-700 ring-blue-100 dark:bg-blue-950/50 dark:text-blue-200 dark:ring-blue-900",
  done: "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-200 dark:ring-emerald-900",
};

const progressLabel: Record<TaskStatus, string> = {
  todo: "Pending",
  in_progress: "In Progress",
  done: "Finish",
};

const taskFilterColumns: Array<{ value: TaskFilterColumn; label: string }> = [
  { value: "none", label: "No filter" },
  { value: "taskId", label: "Task ID" },
  { value: "taskName", label: "Task Name" },
  { value: "assigned", label: "Assigned" },
  { value: "due", label: "Due" },
  { value: "priority", label: "Priority" },
  { value: "progress", label: "Progress" },
];

const dueFilterOptions = [
  { value: "overdue", label: "Overdue" },
  { value: "no_due", label: "No due date" },
  { value: "this_week", label: "This week" },
  { value: "future", label: "Future" },
];

const formatShortDate = (date?: string) =>
  date
    ? new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date(date))
    : "-";

const isSameWeek = (date: Date, current: Date) => {
  const start = new Date(current);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay());
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return date >= start && date < end;
};

const matchesDueFilter = (task: Task, value: string) => {
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

const taskMatchesFilter = (task: Task, filter: TaskFilter) => {
  if (filter.column === "none" || !filter.value.trim()) {
    return true;
  }
  const value = filter.value.trim().toLowerCase();
  if (filter.column === "taskId") {
    return task.id.toLowerCase().includes(value) || task.id.replace("tsk_", "").toLowerCase().includes(value);
  }
  if (filter.column === "taskName") {
    return task.title.toLowerCase().includes(value);
  }
  if (filter.column === "assigned") {
    return value === "unassigned" ? !task.assigneeId : task.assigneeId === filter.value;
  }
  if (filter.column === "due") {
    return matchesDueFilter(task, filter.value);
  }
  if (filter.column === "priority") {
    return task.priority === filter.value;
  }
  if (filter.column === "progress") {
    return task.status === filter.value;
  }
  return true;
};

const filterValueOptions = (column: TaskFilterColumn, users: User[]) => {
  if (column === "assigned") {
    return [
      { value: "unassigned", label: "Unassigned" },
      ...users.map((user) => ({ value: user.id, label: user.name })),
    ];
  }
  if (column === "due") {
    return dueFilterOptions;
  }
  if (column === "priority") {
    return [
      { value: "low", label: "Low" },
      { value: "medium", label: "Medium" },
      { value: "high", label: "High" },
    ];
  }
  if (column === "progress") {
    return [
      { value: "todo", label: progressLabel.todo },
      { value: "in_progress", label: progressLabel.in_progress },
      { value: "done", label: progressLabel.done },
    ];
  }
  return [];
};

const SectionShell = ({
  title,
  children,
  collapsed,
  onToggle,
}: {
  title: string;
  children: ReactNode;
  collapsed: boolean;
  onToggle: () => void;
}) => (
  <section className="border-b border-border last:border-b-0">
    <header className="flex min-h-12 items-center justify-between rounded-lg bg-panel-muted px-4">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <button
        type="button"
        className="grid h-8 w-8 place-items-center rounded-md text-muted hover:bg-panel hover:text-foreground"
        aria-label={`${collapsed ? "Expand" : "Collapse"} ${title}`}
        onClick={onToggle}
      >
        <span
          aria-hidden="true"
          className={`h-2 w-2 border-b-2 border-r-2 border-current transition-transform ${
            collapsed ? "-rotate-45" : "rotate-45"
          }`}
        />
      </button>
    </header>
    {collapsed ? null : children}
  </section>
);

const SectionTabs = ({
  active,
  items,
  onChange,
  onNew,
  onFilter,
  filterActive,
  onSort,
}: {
  active: string;
  items: string[];
  onChange: (item: string) => void;
  onNew?: () => void;
  onFilter?: () => void;
  filterActive?: boolean;
  onSort?: () => void;
}) => (
  <div className="flex min-h-12 flex-wrap items-center justify-between gap-3 border-b border-border px-4">
    <nav className="flex items-center gap-6 text-[13px] font-medium text-soft">
      {items.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onChange(item)}
          className={item === active ? "border-b-2 border-accent py-4 text-accent" : "py-4 hover:text-foreground"}
        >
          {item}
        </button>
      ))}
      {onNew ? (
        <button type="button" className="py-4 text-lg leading-none text-muted hover:text-foreground" aria-label="Add view" onClick={onNew}>
          +
        </button>
      ) : null}
    </nav>
    {onFilter || onSort ? (
      <div className="flex items-center gap-4 text-[13px] font-medium text-muted">
        {onFilter ? (
          <button
            type="button"
            className={filterActive ? "text-accent" : "hover:text-foreground"}
            onClick={onFilter}
          >
            Filter
          </button>
        ) : null}
        {onSort ? (
          <button type="button" className="hover:text-foreground" onClick={onSort}>Sort</button>
        ) : null}
      </div>
    ) : null}
  </div>
);

const TaskFilterPanel = ({
  filter,
  users,
  onChange,
  onClear,
}: {
  filter: TaskFilter;
  users: User[];
  onChange: (filter: TaskFilter) => void;
  onClear: () => void;
}) => {
  const options = filterValueOptions(filter.column, users);
  const needsTextValue = filter.column === "taskId" || filter.column === "taskName";
  const needsValue = filter.column !== "none";

  return (
    <div className="grid gap-3 border-b border-border bg-panel-muted px-4 py-3 md:grid-cols-[220px_1fr_auto]">
      <label className="grid gap-1 text-xs font-medium text-muted">
        Column
        <Select
          value={filter.column}
          onChange={(event) => {
            const column = event.target.value as TaskFilterColumn;
            const nextOptions = filterValueOptions(column, users);
            onChange({
              column,
              value: column === "none" ? "" : nextOptions[0]?.value ?? "",
            });
          }}
        >
          {taskFilterColumns.map((column) => (
            <option key={column.value} value={column.value}>
              {column.label}
            </option>
          ))}
        </Select>
      </label>

      {needsValue ? (
        <label className="grid gap-1 text-xs font-medium text-muted">
          Value
          {needsTextValue ? (
            <input
              value={filter.value}
              onChange={(event) => onChange({ ...filter, value: event.target.value })}
              placeholder={filter.column === "taskId" ? "Search task ID" : "Search task name"}
              className="h-10 rounded-xl border border-border bg-panel px-3 text-sm text-foreground outline-none placeholder:text-soft focus:border-accent/50 focus:ring-2 focus:ring-accent/20"
            />
          ) : (
            <Select
              value={filter.value}
              onChange={(event) => onChange({ ...filter, value: event.target.value })}
            >
              {options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          )}
        </label>
      ) : (
        <p className="self-end rounded-xl border border-dashed border-border px-3 py-2 text-sm text-muted">
          Choose a table column to filter tasks.
        </p>
      )}

      <Button variant="secondary" className="self-end" onClick={onClear}>
        Clear
      </Button>
    </div>
  );
};

const TaskTable = ({
  tasks,
  users,
  onOpenTask,
  onNew,
  onToggleTaskDone,
}: {
  tasks: Task[];
  users: User[];
  onOpenTask: (taskId: string) => void;
  onNew: () => void;
  onToggleTaskDone: (task: Task) => void;
}) => (
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
                  onClick={(event) => {
                    event.stopPropagation();
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
              <td className="px-3 py-3 text-muted">{formatShortDate(task.deadline)}</td>
              <td className="px-3 py-3">
                <span className={`inline-flex rounded-md px-2 py-1 text-xs font-medium capitalize ring-1 ${priorityTone[task.priority]}`}>
                  {task.priority}
                </span>
              </td>
              <td className="px-3 py-3">
                <span className={`inline-flex rounded-md px-2.5 py-1 text-xs font-medium ring-1 ${progressTone[task.status]}`}>
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

export default function DashboardPage() {
  const {
    tasks,
    users,
    commentsByTaskId,
    selectedTaskId,
    isLoading,
    error,
    query,
    loadTasks,
    loadUsers,
    deleteTask,
    selectTask,
    loadComments,
    updateTaskStatus,
  } = useTasksStore();
  const { projects } = useProjectsStore();
  const currentUser = useCurrentUser();
  const permissions = useCurrentPermissions();
  const createTask = useCreateTask();
  const moveTask = useMoveTask();
  const addComment = useAddComment();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createTaskStatus, setCreateTaskStatus] = useState<TaskStatus>("todo");
  const [taskSectionOpen, setTaskSectionOpen] = useState(true);
  const [projectSectionOpen, setProjectSectionOpen] = useState(true);
  const [taskTab, setTaskTab] = useState("All Tasks");
  const [taskFilterOpen, setTaskFilterOpen] = useState(false);
  const [taskFilter, setTaskFilter] = useState<TaskFilter>(emptyTaskFilter);
  const [sortNewestFirst, setSortNewestFirst] = useState(false);
  const [statusToast, setStatusToast] = useState<StatusToast>();

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    const onNewTask = () => setCreateModalOpen(true);
    window.addEventListener("flowbit:new-task", onNewTask);
    return () => window.removeEventListener("flowbit:new-task", onNewTask);
  }, []);

  const selectedTask = tasks.find((task) => task.id === selectedTaskId);
  const selectedComments = selectedTask ? commentsByTaskId[selectedTask.id] ?? [] : [];
  const projectMembers = users.slice(0, 4);
  const visibleTasks = useMemo(() => {
    const filtered = tasks.filter((task) => taskMatchesFilter(task, taskFilter));
    return [...filtered].sort((a, b) => {
      if (sortNewestFirst) {
        return b.updatedAt.localeCompare(a.updatedAt);
      }
      return a.status.localeCompare(b.status) || a.position - b.position;
    });
  }, [tasks, taskFilter, sortNewestFirst]);

  const openCreateTask = (status: TaskStatus = "todo") => {
    setCreateTaskStatus(status);
    setCreateModalOpen(true);
  };
  const openCreateWorkspace = () => window.dispatchEvent(new Event("flowbit:new-workspace"));
  const showMessage = (message: string, tone: StatusToast["tone"] = "success") => {
    setStatusToast({ message, tone });
    window.setTimeout(() => setStatusToast(undefined), 3200);
  };

  useEffect(() => {
    loadTasks();
  }, [loadTasks, query]);

  useEffect(() => {
    if (selectedTaskId) {
      void loadComments(selectedTaskId).catch((commentsError) => {
        showMessage(commentsError instanceof Error ? commentsError.message : "Unable to load comments", "error");
      });
    }
  }, [selectedTaskId, loadComments]);

  return (
    <AppShell>
      <Toast
        open={Boolean(statusToast)}
        tone={statusToast?.tone ?? "success"}
        message={statusToast?.message ?? ""}
        onClose={() => setStatusToast(undefined)}
      />
      <section className="space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-amber-100 text-2xl shadow-sm ring-1 ring-amber-200/60">
              💰
            </span>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">All Tasks</h1>
              <p className="mt-1 text-sm text-muted">All tasks across every workspace.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center">
              {projectMembers.map((user) => (
                <Avatar
                  key={user.id}
                  name={user.name}
                  src={user.avatarUrl}
                  className="-ml-2 h-8 w-8 border-2 border-surface first:ml-0"
                />
              ))}
            </div>
            <Button
              variant="secondary"
              className="h-9 min-h-9 rounded-lg px-4 text-sm"
              onClick={() => {
                void navigator.clipboard?.writeText(window.location.href);
                showMessage("Project link copied");
              }}
            >
              Share
            </Button>
          </div>
        </header>

        <div className="overflow-hidden rounded-xl border border-border bg-panel shadow-[0_12px_36px_rgb(15_23_42/0.04)] dark:shadow-none">
          <SectionShell title="Task" collapsed={!taskSectionOpen} onToggle={() => setTaskSectionOpen((open) => !open)}>
            <SectionTabs
              active={taskTab}
              items={["All Tasks"]}
              onChange={setTaskTab}
              onNew={openCreateTask}
              onFilter={() => setTaskFilterOpen((open) => !open)}
              filterActive={taskFilterOpen || taskFilter.column !== "none"}
              onSort={() => setSortNewestFirst((value) => !value)}
            />
            {taskFilterOpen ? (
              <TaskFilterPanel
                filter={taskFilter}
                users={users}
                onChange={setTaskFilter}
                onClear={() => setTaskFilter(emptyTaskFilter)}
              />
            ) : null}
            {error ? <p className="px-4 py-4 text-sm text-rose-500">{error}</p> : null}
            {isLoading ? (
              <BoardSkeleton />
            ) : (
              <TaskTable
                tasks={visibleTasks}
                users={users}
                onOpenTask={selectTask}
                onNew={openCreateTask}
                onToggleTaskDone={(task) => {
                  void updateTaskStatus(task.id, task.status === "done" ? "todo" : "done").catch((toggleError) => {
                    showMessage(toggleError instanceof Error ? toggleError.message : "Unable to update task", "error");
                  });
                }}
              />
            )}
          </SectionShell>

          <SectionShell title="Projects" collapsed={!projectSectionOpen} onToggle={() => setProjectSectionOpen((open) => !open)}>
            <SectionTabs
              active="Kanban"
              items={["Kanban"]}
              onChange={() => undefined}
              onNew={openCreateWorkspace}
            />
            <div className="p-4">
              {isLoading ? (
                <BoardSkeleton />
              ) : (
                <KanbanBoard
                  tasks={tasks}
                  users={users}
                  canEdit={permissions.canEditTask}
                  onOpenTask={selectTask}
                  onMoveTask={moveTask}
                  onAddTask={openCreateTask}
                />
              )}
            </div>
          </SectionShell>
        </div>
      </section>

      <Modal open={createModalOpen} title="New task" onClose={() => setCreateModalOpen(false)}>
        <TaskCreateForm
          projects={projects.map((project) => ({ id: project.id, name: project.name }))}
          users={users}
          disabled={!permissions.canCreateTask || projects.length === 0}
          initialStatus={createTaskStatus}
          onCreate={async (input) => {
            await createTask(input);
            setCreateModalOpen(false);
          }}
        />
      </Modal>

      <Modal open={Boolean(selectedTask)} title={selectedTask?.title ?? ""} onClose={() => selectTask(undefined)}>
        {selectedTask ? (
          <div className="space-y-4">
            <TaskDetails
              task={selectedTask}
              assignee={users.find((user) => user.id === selectedTask.assigneeId)}
              comments={selectedComments}
              users={users}
              canComment={permissions.canComment}
              canDelete={permissions.canDeleteTask}
              onAddComment={async (body) => {
                if (!currentUser) {
                  return;
                }
                await addComment(selectedTask.id, currentUser.id, body);
              }}
              onDeleteTask={async () => {
                await deleteTask(selectedTask.id);
                selectTask(undefined);
              }}
            />
            <Link href={`/tasks/${selectedTask.id}`} className="mt-4 block">
              <Button variant="secondary" className="w-full rounded-xl">
                Open full task page
              </Button>
            </Link>
          </div>
        ) : null}
      </Modal>
    </AppShell>
  );
}
