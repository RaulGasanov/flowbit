import type { UserRole, WorkspaceMemberRole } from "@/shared/types/domain";

export interface Permissions {
  canCreateTask: boolean;
  canEditTask: boolean;
  canDeleteTask: boolean;
  canManageProjectSettings: boolean;
  canComment: boolean;
}

export const permissionsByRole = (role: UserRole): Permissions => {
  if (role === "guest") {
    return {
      canCreateTask: false,
      canEditTask: false,
      canDeleteTask: false,
      canManageProjectSettings: false,
      canComment: false,
    };
  }

  if (role === "admin") {
    return {
      canCreateTask: true,
      canEditTask: true,
      canDeleteTask: true,
      canManageProjectSettings: true,
      canComment: true,
    };
  }

  if (role === "editor") {
    return {
      canCreateTask: true,
      canEditTask: true,
      canDeleteTask: false,
      canManageProjectSettings: false,
      canComment: true,
    };
  }

  return {
    canCreateTask: false,
    canEditTask: false,
    canDeleteTask: false,
    canManageProjectSettings: false,
    canComment: false,
  };
};

export const permissionsByWorkspaceRole = (role?: WorkspaceMemberRole): Permissions => {
  if (role === "owner") {
    return {
      canCreateTask: true,
      canEditTask: true,
      canDeleteTask: true,
      canManageProjectSettings: true,
      canComment: true,
    };
  }

  if (role === "editor") {
    return {
      canCreateTask: true,
      canEditTask: true,
      canDeleteTask: false,
      canManageProjectSettings: false,
      canComment: true,
    };
  }

  return {
    canCreateTask: false,
    canEditTask: false,
    canDeleteTask: false,
    canManageProjectSettings: false,
    canComment: false,
  };
};
