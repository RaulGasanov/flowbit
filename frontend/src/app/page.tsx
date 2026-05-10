"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
import { useTasksStore } from "@/entities/task/model/store";
import { SectionShell } from "@/features/dashboard/ui/section-shell";
import { SectionTabs } from "@/features/dashboard/ui/section-tabs";
import { TaskFilterPanel } from "@/features/dashboard/ui/task-filter-panel";
import { TaskTable } from "@/features/dashboard/ui/task-table";
import { defaultTaskFilter, emptyTaskFilter } from "@/features/dashboard/model/constants";
import { applyTaskSort, isFilterActive, nextSortDirection, taskMatchesFilter } from "@/features/dashboard/model/utils";
import { workspaceRoleFor } from "@/entities/project/lib/workspace-role";
import type { StatusToast, SortDirection, TaskFilter } from "@/features/dashboard/model/types";
import type { TaskStatus } from "@/shared/types/domain";

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
    return applyTaskSort(filtered, sortDirection);
  }, [tasks, taskFilter, sortDirection]);

  const toggleSortDirection = () => {
    setSortDirection(nextSortDirection);
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
    <>
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
    </>
  );
}
