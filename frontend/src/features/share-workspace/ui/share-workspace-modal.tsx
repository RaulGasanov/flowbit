"use client";

import { useState } from "react";
import { projectApi } from "@/entities/project/api/project-api";
import { workspaceRoleFor } from "@/entities/project/lib/workspace-role";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Modal } from "@/shared/ui/modal";
import { Select } from "@/shared/ui/select";
import type { Project, User, WorkspaceMemberRole } from "@/shared/types/domain";

type EditableWorkspaceRole = Exclude<WorkspaceMemberRole, "owner">;

const copyTextToClipboard = async (text: string) => {
  if (typeof navigator !== "undefined" && window.isSecureContext && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall back to the legacy path below. Browsers can reject clipboard writes
      // on insecure origins, missing permissions, or expired user activation.
    }
  }

  if (typeof document === "undefined") {
    return false;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "0";
  textarea.style.opacity = "0";

  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, text.length);

  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    document.body.removeChild(textarea);
  }
};

interface ShareWorkspaceModalProps {
  open: boolean;
  project?: Project;
  users: User[];
  currentUser?: User;
  onClose: () => void;
  onRefresh: () => Promise<void>;
  onMessage: (message: string, tone?: "success" | "error") => void;
}

export const ShareWorkspaceModal = ({
  open,
  project,
  users,
  currentUser,
  onClose,
  onRefresh,
  onMessage,
}: ShareWorkspaceModalProps) => {
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState<EditableWorkspaceRole>("viewer");
  const [loadingKey, setLoadingKey] = useState<string>();
  const [guestLink, setGuestLink] = useState("");

  const workspaceMembers = project ? users.filter((user) => project.memberIds.includes(user.id)) : [];

  const addMember = async () => {
    if (!project) {
      return;
    }
    setLoadingKey("member");
    try {
      const updated = await projectApi.updateMemberRole({
        projectId: project.id,
        email: memberEmail.trim(),
        role: memberRole,
      });
      setMemberEmail("");
      await onRefresh();
      onMessage(`${updated.user.email} added as ${updated.role}`);
    } catch (roleError) {
      onMessage(roleError instanceof Error ? roleError.message : "Unable to add member", "error");
    } finally {
      setLoadingKey(undefined);
    }
  };

  const updateMemberRole = async (member: User, role: EditableWorkspaceRole) => {
    if (!project) {
      return;
    }
    setLoadingKey(`role:${member.id}`);
    try {
      await projectApi.updateMemberRole({
        projectId: project.id,
        email: member.email,
        role,
      });
      await onRefresh();
      onMessage(`${member.email} is now ${role}`);
    } catch (roleError) {
      onMessage(roleError instanceof Error ? roleError.message : "Unable to update member role", "error");
    } finally {
      setLoadingKey(undefined);
    }
  };

  const removeMember = async (member: User) => {
    if (!project) {
      return;
    }
    setLoadingKey(`remove:${member.id}`);
    try {
      await projectApi.removeMember(project.id, member.id);
      await onRefresh();
      onMessage(`${member.email} removed from workspace`);
    } catch (removeError) {
      onMessage(removeError instanceof Error ? removeError.message : "Unable to remove member", "error");
    } finally {
      setLoadingKey(undefined);
    }
  };

  const copyGuestLink = async () => {
    if (!project) {
      return;
    }
    setLoadingKey("guest");
    try {
      const { token } = await projectApi.share(project.id);
      const link = `${window.location.origin}/guest/workspaces/${token}`;
      setGuestLink(link);

      const copied = await copyTextToClipboard(link);
      if (copied) {
        onMessage("Guest link copied");
      } else {
        onMessage("Guest link created. Select and copy it manually.", "error");
      }
    } catch (shareError) {
      onMessage(shareError instanceof Error ? shareError.message : "Unable to create share link", "error");
    } finally {
      setLoadingKey(undefined);
    }
  };

  return (
    <Modal open={open} title="Share workspace" onClose={onClose}>
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
                disabled={loadingKey === "guest"}
                onClick={copyGuestLink}
              >
                {loadingKey === "guest" ? "Copying..." : "Copy guest link"}
              </Button>
            </div>
            {guestLink ? (
              <Input
                className="mt-3 h-9 rounded-lg bg-surface text-sm"
                readOnly
                value={guestLink}
                onFocus={(event) => event.currentTarget.select()}
                aria-label="Guest link"
              />
            ) : null}
          </section>

          <section className="rounded-xl border border-border bg-panel p-3">
            <div>
              <p className="text-sm font-semibold">Workspace members</p>
              <p className="mt-1 text-xs text-muted">
                Add existing users, change their workspace role, or remove their access.
              </p>
            </div>
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
                disabled={loadingKey === "member" || !memberEmail.trim()}
                onClick={addMember}
              >
                {loadingKey === "member" ? "Adding..." : "Add"}
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
                            void updateMemberRole(member, event.target.value as EditableWorkspaceRole);
                          }}
                          disabled={loadingKey === `role:${member.id}`}
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
                          disabled={loadingKey === `remove:${member.id}`}
                          onClick={() => {
                            void removeMember(member);
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
          </section>
        </div>
      ) : null}
    </Modal>
  );
};
