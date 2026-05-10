"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { AppShell } from "@/widgets/app-shell/ui/app-shell";
import { Modal } from "@/shared/ui/modal";
import { Button } from "@/shared/ui/button";
import { Avatar } from "@/shared/ui/avatar";
import { Toast } from "@/shared/ui/toast";
import { useCurrentUser } from "@/entities/user/model/store";
import { permissionsByWorkspaceRole } from "@/entities/user/model/permissions";
import { useProjectsStore } from "@/entities/project/model/store";
import { BoardSkeleton } from "@/widgets/board/ui/board-skeleton";
import { KanbanBoard } from "@/widgets/board/ui/kanban-board";
import { TaskCreateForm } from "@/features/create-task/ui/task-create-form";
import { useCreateTask } from "@/features/create-task/model/use-create-task";
import { useMoveTask } from "@/features/move-task/model/use-move-task";
import { useAddComment } from "@/features/add-comment/model/use-add-comment";
import { useEditTask } from "@/features/edit-task/model/use-edit-task";
import { TaskDetails } from "@/entities/task/ui/task-details";
import { formatTaskDeadline, getDeadlineState } from "@/entities/task/lib/deadline";
import { useTasksStore } from "@/entities/task/model/store";
import type { Project, Task, TaskPriority, TaskStatus, User, WorkspaceMemberRole } from "@/shared/types/domain";

interface TaskFilter {
  hideCompleted: boolean;
  taskId: string;
  taskName: string;
  assigneeIds: string[];
  due: string[];
  priorities: TaskPriority[];
  statuses: TaskStatus[];
}

type StatusToast = { message: string; tone: "success" | "error" };
type SortDirection = "none" | "asc" | "desc";

const workspaceRoleFor = (project?: Project, userId?: string): WorkspaceMemberRole | undefined => {
  if (!project || !userId) {
    return undefined;
  }
  if (project.ownerId === userId) {
    return "owner";
  }
  return project.memberRoles?.[userId];
};

const defaultTaskFilter: TaskFilter = {
  hideCompleted: true,
  taskId: "",
  taskName: "",
  assigneeIds: [],
  due: [],
  priorities: [],
  statuses: [],
};

const emptyTaskFilter: TaskFilter = {
  ...defaultTaskFilter,
  hideCompleted: false,
};

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

const dueFilterOptions = [
  { value: "overdue", label: "Overdue" },
  { value: "no_due", label: "No due date" },
  { value: "this_week", label: "This week" },
  { value: "future", label: "Future" },
];

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

const toggleValue = <T extends string>(values: T[], value: T) =>
  values.includes(value) ? values.filter((item) => item !== value) : [...values, value];

const taskMatchesFilter = (task: Task, filter: TaskFilter) => {
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

const isFilterActive = (filter: TaskFilter) =>
  filter.hideCompleted ||
  Boolean(filter.taskId.trim()) ||
  Boolean(filter.taskName.trim()) ||
  filter.assigneeIds.length > 0 ||
  filter.due.length > 0 ||
  filter.priorities.length > 0 ||
  filter.statuses.length > 0;

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
  <section className="overflow-hidden rounded-xl border border-border bg-panel">
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
  sortLabel,
}: {
  active: string;
  items: string[];
  onChange: (item: string) => void;
  onNew?: () => void;
  onFilter?: () => void;
  filterActive?: boolean;
  onSort?: () => void;
  sortLabel?: string;
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
          <button type="button" className="hover:text-foreground" onClick={onSort}>
            {sortLabel ?? "Sort"}
          </button>
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
  const checkClassName = "h-4 w-4 rounded border-border text-accent focus:ring-accent/30";
  const labelClassName = "flex items-center gap-2 rounded-lg border border-border bg-panel px-3 py-2 text-sm text-muted";

  return (
    <div className="grid gap-4 border-b border-border bg-panel-muted px-4 py-4">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-1 text-xs font-medium text-muted">
          Task ID
          <input
            value={filter.taskId}
            onChange={(event) => onChange({ ...filter, taskId: event.target.value })}
            placeholder="Search task ID"
            className="h-10 rounded-xl border border-border bg-panel px-3 text-sm text-foreground outline-none placeholder:text-soft focus:border-accent/50 focus:ring-2 focus:ring-accent/20"
          />
        </label>
        <label className="grid gap-1 text-xs font-medium text-muted">
          Task Name
          <input
            value={filter.taskName}
            onChange={(event) => onChange({ ...filter, taskName: event.target.value })}
            placeholder="Search task name"
            className="h-10 rounded-xl border border-border bg-panel px-3 text-sm text-foreground outline-none placeholder:text-soft focus:border-accent/50 focus:ring-2 focus:ring-accent/20"
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

const TaskTable = ({
  tasks,
  users,
  onOpenTask,
  onNew,
  canToggleTask,
  onToggleTaskDone,
}: {
  tasks: Task[];
  users: User[];
  onOpenTask: (taskId: string) => void;
  onNew: () => void;
  canToggleTask: (task: Task) => boolean;
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
  const { projects, isLoading: projectsLoading } = useProjectsStore();
  const currentUser = useCurrentUser();
  const createTask = useCreateTask();
  const editTask = useEditTask();
  const moveTask = useMoveTask();
  const addComment = useAddComment();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createTaskStatus, setCreateTaskStatus] = useState<TaskStatus>("todo");
  const [taskSectionOpen, setTaskSectionOpen] = useState(true);
  const [projectSectionOpen, setProjectSectionOpen] = useState(true);
  const [taskTab, setTaskTab] = useState("All Tasks");
  const [taskFilterOpen, setTaskFilterOpen] = useState(false);
  const [taskFilter, setTaskFilter] = useState<TaskFilter>(defaultTaskFilter);
  const [sortDirection, setSortDirection] = useState<SortDirection>("none");
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
  const editableProjects = projects.filter((project) =>
    permissionsByWorkspaceRole(workspaceRoleFor(project, currentUser?.id)).canCreateTask,
  );
  const canEditAnyWorkspace = editableProjects.length > 0;
  const selectedTaskPermissions = permissionsByWorkspaceRole(
    workspaceRoleFor(projects.find((project) => project.id === selectedTask?.projectId), currentUser?.id),
  );
  const projectMembers = users.slice(0, 4);
  const visibleTasks = useMemo(() => {
    const filtered = tasks.filter((task) => taskMatchesFilter(task, taskFilter));
    if (sortDirection === "none") {
      return filtered;
    }
    return [...filtered].sort((a, b) => {
      const byName = a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
      return sortDirection === "asc" ? byName : -byName;
    });
  }, [tasks, taskFilter, sortDirection]);

  const toggleSortDirection = () => {
    setSortDirection((direction) => {
      if (direction === "none") {
        return "asc";
      }
      if (direction === "asc") {
        return "desc";
      }
      return "none";
    });
  };

  const openCreateTask = (status: TaskStatus = "todo") => {
    if (projects.length === 0) {
      showMessage("Create a workspace before adding tasks", "error");
      return;
    }
    if (!canEditAnyWorkspace) {
      showMessage("You only have view access in your workspaces", "error");
      return;
    }
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
        </header>

        <div className="space-y-4">
          <SectionShell title="Task" collapsed={!taskSectionOpen} onToggle={() => setTaskSectionOpen((open) => !open)}>
            <SectionTabs
              active={taskTab}
              items={["All Tasks"]}
              onChange={setTaskTab}
              onFilter={() => setTaskFilterOpen((open) => !open)}
              filterActive={taskFilterOpen || isFilterActive(taskFilter)}
              onSort={toggleSortDirection}
              sortLabel={sortDirection === "none" ? "Sort: Task name" : `Sort: Task name ${sortDirection.toUpperCase()}`}
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
            {!isLoading && !projectsLoading && projects.length === 0 ? (
              <div className="m-4 rounded-xl border border-dashed border-border bg-panel-muted px-4 py-8 text-center">
                <h3 className="text-base font-semibold text-foreground">Create a workspace first</h3>
                <p className="mx-auto mt-2 max-w-md text-sm text-muted">
                  Tasks belong to workspaces. Create your first workspace, then you can add and track tasks here.
                </p>
                <Button className="mt-4" onClick={openCreateWorkspace}>
                  Create workspace
                </Button>
              </div>
            ) : isLoading ? (
              <BoardSkeleton />
            ) : (
              <TaskTable
                tasks={visibleTasks}
                users={users}
                onOpenTask={selectTask}
                onNew={openCreateTask}
                canToggleTask={(task) =>
                  permissionsByWorkspaceRole(
                    workspaceRoleFor(projects.find((project) => project.id === task.projectId), currentUser?.id),
                  ).canEditTask
                }
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
            />
            <div className="p-4">
              {isLoading ? (
                <BoardSkeleton />
              ) : (
                <KanbanBoard
                  tasks={tasks}
                  users={users}
                  canEdit={canEditAnyWorkspace}
                  onOpenTask={selectTask}
                  onMoveTask={moveTask}
                />
              )}
            </div>
          </SectionShell>
        </div>
      </section>

      <Modal open={createModalOpen} title="New task" onClose={() => setCreateModalOpen(false)}>
        <TaskCreateForm
          projects={editableProjects.map((project) => ({ id: project.id, name: project.name }))}
          users={users}
          disabled={!canEditAnyWorkspace || projects.length === 0}
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
              canComment={selectedTaskPermissions.canComment}
              canEdit={selectedTaskPermissions.canEditTask}
              canDelete={selectedTaskPermissions.canDeleteTask}
              onUpdateTask={async (input) => {
                await editTask(selectedTask.id, input);
              }}
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
