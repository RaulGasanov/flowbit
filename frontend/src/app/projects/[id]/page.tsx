"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Card } from "@/shared/ui/card";
import { Modal } from "@/shared/ui/modal";
import { Button } from "@/shared/ui/button";
import { Toast } from "@/shared/ui/toast";
import { LoadingSpinner } from "@/shared/ui/loading-spinner";
import { useCurrentUser } from "@/entities/user/model/store";
import { permissionsByWorkspaceRole } from "@/entities/user/model/permissions";
import { useProjectsStore } from "@/entities/project/model/store";
import { workspaceRoleFor } from "@/entities/project/lib/workspace-role";
import { KanbanBoard } from "@/widgets/board/ui/kanban-board";
import { TaskCreateForm } from "@/features/create-task/ui/task-create-form";
import { useCreateTask } from "@/features/create-task/model/use-create-task";
import { useEditTask } from "@/features/edit-task/model/use-edit-task";
import { useMoveTask } from "@/features/move-task/model/use-move-task";
import { useAddComment } from "@/features/add-comment/model/use-add-comment";
import { ShareWorkspaceModal } from "@/features/share-workspace/ui/share-workspace-modal";
import { TaskDetails } from "@/entities/task/ui/task-details";
import { useTasksStore } from "@/entities/task/model/store";

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
  const createTask = useCreateTask();
  const editTask = useEditTask();
  const moveTask = useMoveTask();
  const addComment = useAddComment();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [statusToast, setStatusToast] = useState<{ tone: "success" | "error"; message: string }>();

  const showMessage = (message: string, tone: "success" | "error" = "success") => {
    setStatusToast({ message, tone });
    window.setTimeout(() => setStatusToast(undefined), 3200);
  };

  useEffect(() => {
    loadProjects();
    loadUsers();
  }, [loadProjects, loadUsers]);

  useEffect(() => {
    loadTasks(projectId);
  }, [loadTasks, projectId, query]);

  const project = projects.find((item) => item.id === projectId);
  const currentWorkspaceRole = project && currentUser ? workspaceRoleFor(project, currentUser.id) : undefined;
  const permissions = permissionsByWorkspaceRole(currentWorkspaceRole);
  const isWorkspaceOwner = currentWorkspaceRole === "owner";
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
    <>
      <Toast
        open={Boolean(statusToast)}
        tone={statusToast?.tone ?? "success"}
        message={statusToast?.message ?? ""}
        onClose={() => setStatusToast(undefined)}
      />
      {projectsLoading && !project ? (
        <Card className="mb-5">
          <div className="flex items-center gap-2 text-sm text-muted">
            <LoadingSpinner className="h-4 w-4 text-accent" />
            Loading workspace...
          </div>
        </Card>
      ) : null}
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
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-semibold">{project.name}</h1>
                  {currentWorkspaceRole ? (
                    <span className="rounded-full border border-border bg-surface-muted px-2 py-0.5 text-xs font-medium text-muted">
                      {currentWorkspaceRole}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-foreground/70">{project.description}</p>
              </div>
              {isWorkspaceOwner ? (
                <Button
                  variant="secondary"
                  className="h-9 min-h-9 rounded-lg px-4 text-sm"
                  onClick={() => setShareModalOpen(true)}
                >
                  Share
                </Button>
              ) : null}
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
          />
        </>
      ) : null}

      <Modal open={createModalOpen} title="New task" onClose={() => setCreateModalOpen(false)}>
        {project ? (
          <TaskCreateForm
            projectId={project.id}
            users={users}
            disabled={!permissions.canCreateTask}
            initialStatus="todo"
            onCreate={async (input) => {
              await createTask(input);
              setCreateModalOpen(false);
            }}
          />
        ) : null}
      </Modal>

      <ShareWorkspaceModal
        open={shareModalOpen}
        project={project}
        users={users}
        currentUser={currentUser}
        onClose={() => setShareModalOpen(false)}
        onRefresh={async () => {
          await Promise.all([loadUsers(), loadProjects()]);
        }}
        onMessage={showMessage}
      />

      <Modal open={Boolean(selectedTask)} title={selectedTask?.title ?? ""} onClose={() => selectTask(undefined)}>
        {selectedTask ? (
          <div className="space-y-4">
            <TaskDetails
              task={selectedTask}
              assignee={users.find((user) => user.id === selectedTask.assigneeId)}
              comments={selectedComments}
              users={users}
              canComment={permissions.canComment}
              canEdit={permissions.canEditTask}
              canDelete={permissions.canDeleteTask}
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
