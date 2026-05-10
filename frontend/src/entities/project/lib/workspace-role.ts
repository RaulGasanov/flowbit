import type { Project, WorkspaceMemberRole } from "@/shared/types/domain";

export const workspaceRoleFor = (project?: Project, userId?: string): WorkspaceMemberRole | undefined => {
  if (!project || !userId) {
    return undefined;
  }
  if (project.ownerId === userId) {
    return "owner";
  }
  return project.memberRoles?.[userId];
};
