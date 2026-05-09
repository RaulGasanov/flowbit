export type ID = string;

export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "low" | "medium" | "high";
export type UserRole = "admin" | "editor" | "viewer";
export type ProjectVisibility = "private" | "team" | "public";
export type NotificationType = "new_comment" | "task_updated" | "deadline_approaching";
export type ThemePreference = "light" | "dark";

export interface NotificationPreferences {
  comments: boolean;
  taskUpdates: boolean;
  deadlineReminders: boolean;
  emailChannel: boolean;
  inAppChannel: boolean;
}

export interface UserSettings {
  theme: ThemePreference;
  accentColor: "sky" | "emerald" | "rose";
  notifications: NotificationPreferences;
}

export interface User {
  id: ID;
  name: string;
  email: string;
  avatarUrl?: string;
  role: UserRole;
  bio: string;
  workspace: string;
  settings: UserSettings;
}

export interface Project {
  id: ID;
  name: string;
  description: string;
  color: string;
  visibility: ProjectVisibility;
  memberIds: ID[];
  createdAt: string;
}

export interface Task {
  id: ID;
  projectId: ID;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  deadline?: string;
  position: number;
  assigneeId?: ID;
  createdAt: string;
  updatedAt: string;
}

export interface TaskComment {
  id: ID;
  taskId: ID;
  authorId: ID;
  body: string;
  createdAt: string;
}

export interface Notification {
  id: ID;
  userId: ID;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: string;
  readAt?: string;
}
