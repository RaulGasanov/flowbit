import type {
  ID,
  Notification,
  Project,
  ProjectVisibility,
  SharedWorkspace,
  ThemePreference,
  Task,
  TaskComment,
  TaskStatus,
  User,
  UserRole,
  UserSettings,
} from "@/shared/types/domain";

export interface TaskQuery {
  projectId?: ID;
  q?: string;
  status?: TaskStatus;
}

export interface CreateTaskInput {
  projectId: ID;
  title: string;
  description: string;
  status?: TaskStatus;
  priority: Task["priority"];
  deadline?: string;
  assigneeId?: ID;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: Task["priority"];
  deadline?: string;
  position?: number;
  assigneeId?: ID;
}

export interface ReorderTaskInput {
  status: TaskStatus;
  index: number;
}

export interface CreateCommentInput {
  taskId: ID;
  authorId: ID;
  body: string;
}

export interface CreateProjectInput {
  name: string;
  description: string;
  color: string;
  visibility: ProjectVisibility;
  memberIds?: ID[];
}

export interface UpdateProjectInput {
  visibility: ProjectVisibility;
}

export interface UpdateUserProfileInput {
  name?: string;
  email?: string;
  bio?: string;
}

export interface UpdateUserRoleInput {
  email: string;
  role: UserRole;
}

export interface UpdateUserSettingsInput {
  settings: UserSettings;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export interface UploadAvatarInput {
  fileName: string;
  dataUrl: string;
}

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface RegisterInput extends AuthCredentials {
  name: string;
  role: UserRole;
}

export interface AuthSession {
  token: string;
  user: User;
}

export interface ShareProjectResponse {
  token: string;
}

export interface ApiClient {
  login(input: AuthCredentials): Promise<AuthSession>;
  register(input: RegisterInput): Promise<AuthSession>;
  getCurrentUser(): Promise<User>;
  listProjects(): Promise<Project[]>;
  getProjectById(id: ID): Promise<Project | null>;
  createProject(input: CreateProjectInput): Promise<Project>;
  updateProject(id: ID, input: UpdateProjectInput): Promise<Project>;
  shareProject(id: ID): Promise<ShareProjectResponse>;
  getSharedWorkspace(token: string): Promise<SharedWorkspace>;
  listUsers(): Promise<User[]>;
  listTasks(query?: TaskQuery): Promise<Task[]>;
  getTaskById(id: ID): Promise<Task | null>;
  createTask(input: CreateTaskInput): Promise<Task>;
  updateTask(id: ID, input: UpdateTaskInput): Promise<Task>;
  reorderTask(id: ID, input: ReorderTaskInput): Promise<Task[]>;
  deleteTask(id: ID): Promise<void>;
  listTaskComments(taskId: ID): Promise<TaskComment[]>;
  createTaskComment(input: CreateCommentInput): Promise<TaskComment>;
  listNotifications(userId: ID): Promise<Notification[]>;
  markNotificationRead(notificationId: ID): Promise<void>;
  markAllNotificationsRead(userId: ID): Promise<void>;
  updateUserProfile(userId: ID, input: UpdateUserProfileInput): Promise<User>;
  updateUserRole(input: UpdateUserRoleInput): Promise<User>;
  updateUserSettings(userId: ID, input: UpdateUserSettingsInput): Promise<User>;
  uploadAvatar(userId: ID, input: UploadAvatarInput): Promise<{ avatarUrl: string }>;
  changePassword(userId: ID, input: ChangePasswordInput): Promise<void>;
  deleteUser(userId: ID): Promise<void>;
  updateUserTheme(userId: ID, theme: ThemePreference): Promise<User>;
}
