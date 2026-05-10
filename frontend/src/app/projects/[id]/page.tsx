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
import { useCurrentUser } from "@/entities/user/model/store";
import { permissionsByWorkspaceRole } from "@/entities/user/model/permissions";
import { useProjectsStore } from "@/entities/project/model/store";
import { projectApi } from "@/entities/project/api/project-api";
import { KanbanBoard } from "@/widgets/board/ui/kanban-board";
import { TaskCreateForm } from "@/features/create-task/ui/task-create-form";
import { useCreateTask } from "@/features/create-task/model/use-create-task";
import { useEditTask } from "@/features/edit-task/model/use-edit-task";
import { useMoveTask } from "@/features/move-task/model/use-move-task";
import { useAddComment } from "@/features/add-comment/model/use-add-comment";
import { TaskDetails } from "@/entities/task/ui/task-details";
import { useTasksStore } from "@/entities/task/model/store";
import type { User, WorkspaceMemberRole } from "@/shared/types/domain";

type EditableWorkspaceRole = Exclude<WorkspaceMemberRole, "owner">;

const workspaceRoleFor = (
  project: { ownerId?: string; memberRoles?: Record<string, WorkspaceMemberRole> },
  userId: string,
): WorkspaceMemberRole | undefined => {
  if (project.ownerId === userId) {
    return "owner";
  }
  return project.memberRoles?.[userId];
};

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
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState<EditableWorkspaceRole>("viewer");
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
  const currentWorkspaceRole = project && currentUser ? workspaceRoleFor(project, currentUser.id) : undefined;
  const permissions = permissionsByWorkspaceRole(currentWorkspaceRole);
  const isWorkspaceOwner = currentWorkspaceRole === "owner";
  const workspaceMembers = project ? users.filter((user) => project.memberIds.includes(user.id)) : [];
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

  const refreshWorkspaceAccess = async () => {
    await Promise.all([loadUsers(), loadProjects()]);
  };

  const updateWorkspaceMemberRole = async (member: User, role: EditableWorkspaceRole) => {
    if (!project) {
      return;
    }
    setShareLoading(`role:${member.id}`);
    try {
      await projectApi.updateMemberRole({
        projectId: project.id,
        email: member.email,
        role,
      });
      await refreshWorkspaceAccess();
      showMessage(`${member.email} is now ${role}`);
    } catch (roleError) {
      showMessage(roleError instanceof Error ? roleError.message : "Unable to update member role", "error");
    } finally {
      setShareLoading(undefined);
    }
  };

  const removeWorkspaceMember = async (member: User) => {
    if (!project) {
      return;
    }
    setShareLoading(`remove:${member.id}`);
    try {
      await projectApi.removeMember(project.id, member.id);
      await refreshWorkspaceAccess();
      showMessage(`${member.email} removed from workspace`);
    } catch (removeError) {
      showMessage(removeError instanceof Error ? removeError.message : "Unable to remove member", "error");
    } finally {
      setShareLoading(undefined);
    }
  };

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
                <p className="text-sm font-semibold">Workspace members</p>
                <p className="mt-1 text-xs text-muted">
                  Add existing users, change their workspace role, or remove their access.
                </p>
              </div>
              {isWorkspaceOwner ? (
                <>
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
                        onChange={(event) => setMemberRole(event.target.value as EditableWorkspaceRole)}
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
                          await refreshWorkspaceAccess();
                          showMessage(`${updated.user.email} added as ${updated.role}`);
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

                  <div className="mt-4 space-y-2">
                    {workspaceMembers.map((member) => {
                      const role = workspaceRoleFor(project, member.id) ?? "viewer";
                      const canEditMember = role !== "owner" && member.id !== currentUser?.id;
                      return (
                        <div
                          key={member.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface-muted px-3 py-2"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">{member.name}</p>
                            <p className="truncate text-xs text-muted">{member.email}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {canEditMember ? (
                              <Select
                                value={role}
                                onChange={(event) => {
                                  void updateWorkspaceMemberRole(member, event.target.value as EditableWorkspaceRole);
                                }}
                                disabled={shareLoading === `role:${member.id}`}
                                wrapperClassName="w-28"
                                className="h-8 rounded-lg bg-surface py-1 text-xs"
                              >
                                <option value="viewer">viewer</option>
                                <option value="editor">editor</option>
                              </Select>
                            ) : (
                              <span className="rounded-full border border-border bg-panel px-2 py-1 text-xs font-medium text-muted">
                                {role}
                              </span>
                            )}
                            {canEditMember ? (
                              <Button
                                variant="ghost"
                                className="min-h-8 rounded-lg px-2 py-1 text-xs text-rose-600"
                                disabled={shareLoading === `remove:${member.id}`}
                                onClick={() => {
                                  void removeWorkspaceMember(member);
                                }}
                              >
                                Remove
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
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
