"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AppShell } from "@/widgets/app-shell/ui/app-shell";
import { Card } from "@/shared/ui/card";
import { Modal } from "@/shared/ui/modal";
import { Button } from "@/shared/ui/button";
import { Select } from "@/shared/ui/select";
import { useCurrentPermissions, useCurrentUser } from "@/entities/user/model/store";
import { VisibilityBadge } from "@/entities/project/ui/visibility-badge";
import { useProjectsStore } from "@/entities/project/model/store";
import { KanbanBoard } from "@/widgets/board/ui/kanban-board";
import { TaskCreateForm } from "@/features/create-task/ui/task-create-form";
import { useCreateTask } from "@/features/create-task/model/use-create-task";
import { useMoveTask } from "@/features/move-task/model/use-move-task";
import { useAddComment } from "@/features/add-comment/model/use-add-comment";
import { useChangeBoardVisibility } from "@/features/change-board-visibility/model/use-change-board-visibility";
import { TaskDetails } from "@/entities/task/ui/task-details";
import { useTasksStore } from "@/entities/task/model/store";
import type { TaskStatus } from "@/shared/types/domain";

export default function ProjectBoardPage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;

  const { projects, isLoading: projectsLoading, loadProjects } = useProjectsStore();
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
  } = useTasksStore();
  const currentUser = useCurrentUser();
  const permissions = useCurrentPermissions();
  const createTask = useCreateTask();
  const moveTask = useMoveTask();
  const addComment = useAddComment();
  const changeBoardVisibility = useChangeBoardVisibility();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createTaskStatus, setCreateTaskStatus] = useState<TaskStatus>("todo");

  useEffect(() => {
    loadProjects();
    loadUsers();
  }, [loadProjects, loadUsers]);

  useEffect(() => {
    loadTasks(projectId);
  }, [loadTasks, projectId, query]);

  const project = projects.find((item) => item.id === projectId);
  const selectedTask = tasks.find((task) => task.id === selectedTaskId);
  const selectedComments = selectedTask ? commentsByTaskId[selectedTask.id] ?? [] : [];

  useEffect(() => {
    if (selectedTaskId) {
      void loadComments(selectedTaskId).catch(() => undefined);
    }
  }, [selectedTaskId, loadComments]);

  useEffect(() => {
    const onNewTask = () => setCreateModalOpen(true);
    window.addEventListener("flowbit:new-task", onNewTask);
    return () => window.removeEventListener("flowbit:new-task", onNewTask);
  }, []);

  return (
    <AppShell>
      {!projectsLoading && !project ? (
        <Card className="mb-5">
          <div className="space-y-3">
            <div>
              <h1 className="text-xl font-semibold">Workspace not found</h1>
              <p className="mt-1 text-sm text-muted">
                This workspace is not available for the current account.
              </p>
            </div>
            <Link href="/">
              <Button variant="secondary">Back to all tasks</Button>
            </Link>
          </div>
        </Card>
      ) : null}

      {project ? (
        <>
      <Card className="mb-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-semibold">{project.name}</h1>
          <VisibilityBadge visibility={project.visibility} />
        </div>
        <p className="mt-1 text-sm text-foreground/70">{project.description}</p>
          <div className="mt-3 flex items-center gap-2">
            <label htmlFor="visibility" className="text-xs text-foreground/60">
              Board visibility
            </label>
            <Select
              id="visibility"
              value={project.visibility}
              onChange={(event) =>
                changeBoardVisibility(project.id, event.target.value as typeof project.visibility)
              }
              disabled={!permissions.canManageProjectSettings}
              wrapperClassName="w-28"
              className="h-8 rounded-lg bg-surface-muted px-2 text-xs"
            >
              <option value="private">Private</option>
              <option value="team">Team</option>
              <option value="public">Public</option>
            </Select>
          </div>
      </Card>

      {error ? <p className="mb-4 text-sm text-rose-500">{error}</p> : null}
      <KanbanBoard
        tasks={tasks}
        users={users}
        canEdit={permissions.canEditTask}
        isLoading={isLoading}
        onOpenTask={selectTask}
        onMoveTask={moveTask}
        onAddTask={(status) => {
          setCreateTaskStatus(status);
          setCreateModalOpen(true);
        }}
      />
        </>
      ) : null}

      <Modal open={createModalOpen} title="New task" onClose={() => setCreateModalOpen(false)}>
        {project ? (
          <TaskCreateForm
            projectId={project.id}
            users={users}
            disabled={!permissions.canCreateTask}
            initialStatus={createTaskStatus}
            onCreate={async (input) => {
              await createTask(input);
              setCreateModalOpen(false);
            }}
          />
        ) : null}
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
