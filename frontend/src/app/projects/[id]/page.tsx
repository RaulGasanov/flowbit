"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AppShell } from "@/widgets/app-shell/ui/app-shell";
import { Card } from "@/shared/ui/card";
import { Modal } from "@/shared/ui/modal";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Select } from "@/shared/ui/select";
import { Toast } from "@/shared/ui/toast";
import { useCurrentPermissions, useCurrentUser } from "@/entities/user/model/store";
import { VisibilityBadge } from "@/entities/project/ui/visibility-badge";
import { useProjectsStore } from "@/entities/project/model/store";
import { projectApi } from "@/entities/project/api/project-api";
import { KanbanBoard } from "@/widgets/board/ui/kanban-board";
import { TaskCreateForm } from "@/features/create-task/ui/task-create-form";
import { useCreateTask } from "@/features/create-task/model/use-create-task";
import { useEditTask } from "@/features/edit-task/model/use-edit-task";
import { useMoveTask } from "@/features/move-task/model/use-move-task";
import { useAddComment } from "@/features/add-comment/model/use-add-comment";
import { useChangeBoardVisibility } from "@/features/change-board-visibility/model/use-change-board-visibility";
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
  const permissions = useCurrentPermissions();
  const createTask = useCreateTask();
  const editTask = useEditTask();
  const moveTask = useMoveTask();
  const addComment = useAddComment();
  const changeBoardVisibility = useChangeBoardVisibility();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState<"viewer" | "editor">("viewer");
  const [shareLoading, setShareLoading] = useState<string>();
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
  const isWorkspaceOwner = Boolean(project && currentUser && project.ownerId === currentUser.id);
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
    <AppShell showSearch>
      <Toast
        open={Boolean(statusToast)}
        tone={statusToast?.tone ?? "success"}
        message={statusToast?.message ?? ""}
        onClose={() => setStatusToast(undefined)}
      />
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
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold">{project.name}</h1>
            <VisibilityBadge visibility={project.visibility} />
          </div>
          <Button
            variant="secondary"
            className="h-9 min-h-9 rounded-lg px-4 text-sm"
            onClick={() => setShareModalOpen(true)}
          >
            Share
          </Button>
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

      <Modal open={shareModalOpen} title="Share workspace" onClose={() => setShareModalOpen(false)}>
        {project ? (
          <div className="space-y-4">
            <section className="rounded-xl border border-border bg-panel p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">Guest link</p>
                  <p className="mt-1 text-xs text-muted">Anyone with this link can view this workspace without editing.</p>
                </div>
                <Button
                  variant="secondary"
                  className="min-h-9 rounded-lg px-3 py-1 text-sm"
                  disabled={shareLoading === "guest"}
                  onClick={async () => {
                    setShareLoading("guest");
                    try {
                      const { token } = await projectApi.share(project.id);
                      const link = `${window.location.origin}/guest/workspaces/${token}`;
                      await navigator.clipboard?.writeText(link);
                      showMessage("Guest link copied");
                    } catch (shareError) {
                      showMessage(shareError instanceof Error ? shareError.message : "Unable to create share link", "error");
                    } finally {
                      setShareLoading(undefined);
                    }
                  }}
                >
                  {shareLoading === "guest" ? "Copying..." : "Copy guest link"}
                </Button>
              </div>
            </section>

            <section className="rounded-xl border border-border bg-panel p-3">
              <div>
                <p className="text-sm font-semibold">Add member</p>
                <p className="mt-1 text-xs text-muted">
                  Add an existing user to this workspace so it appears in their sidebar and stays synced.
                </p>
              </div>
              {isWorkspaceOwner ? (
                <div className="mt-3 flex flex-wrap items-end gap-2">
                  <label className="grid min-w-0 flex-1 gap-1 text-xs font-medium text-muted">
                    Email
                    <Input
                      value={memberEmail}
                      onChange={(event) => setMemberEmail(event.target.value)}
                      type="email"
                      placeholder="User email"
                      className="h-9 rounded-lg bg-surface text-sm"
                    />
                  </label>
                  <label className="grid gap-1 text-xs font-medium text-muted">
                    Access
                    <Select
                      value={memberRole}
                      onChange={(event) => setMemberRole(event.target.value as "viewer" | "editor")}
                      wrapperClassName="w-32"
                      className="h-9 rounded-lg bg-surface py-1 text-sm"
                    >
                      <option value="viewer">viewer</option>
                      <option value="editor">editor</option>
                    </Select>
                  </label>
                  <Button
                    variant="secondary"
                    className="min-h-9 rounded-lg px-3 py-1 text-sm"
                    disabled={shareLoading === "member" || !memberEmail.trim()}
                    onClick={async () => {
                      setShareLoading("member");
                      try {
                        const updated = await projectApi.updateMemberRole({
                          projectId: project.id,
                          email: memberEmail.trim(),
                          role: memberRole,
                        });
                        setMemberEmail("");
                        await Promise.all([loadUsers(), loadProjects()]);
                        showMessage(`${updated.email} added as ${updated.role}`);
                      } catch (roleError) {
                        showMessage(roleError instanceof Error ? roleError.message : "Unable to add member", "error");
                      } finally {
                        setShareLoading(undefined);
                      }
                    }}
                  >
                    {shareLoading === "member" ? "Adding..." : "Add"}
                  </Button>
                </div>
              ) : (
                <p className="mt-3 rounded-lg bg-surface-muted px-3 py-2 text-xs text-muted">
                  Only the workspace owner can add members.
                </p>
              )}
            </section>
          </div>
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
    </AppShell>
  );
}
