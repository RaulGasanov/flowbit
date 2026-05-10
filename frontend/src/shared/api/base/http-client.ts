import type {
  ApiClient,
  AuthCredentials,
  ChangePasswordInput,
  CreateCommentInput,
  CreateProjectInput,
  CreateTaskInput,
  RegisterInput,
  ReorderTaskInput,
  TaskQuery,
  UpdateTaskInput,
  UpdateUserProfileInput,
  UpdateUserRoleInput,
  UpdateUserSettingsInput,
  UploadAvatarInput,
} from "@/shared/api/model/contracts";
import type { ID, ThemePreference } from "@/shared/types/domain";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api";
const TOKEN_KEY = "flowbit-auth-token";
export const AUTH_EXPIRED_EVENT = "flowbit:auth-expired";

export const authTokenStorage = {
  get: () => (typeof window === "undefined" ? null : window.localStorage.getItem(TOKEN_KEY)),
  set: (token: string) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(TOKEN_KEY, token);
    }
  },
  clear: () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(TOKEN_KEY);
    }
  },
};

const queryString = (params: Record<string, string | undefined>) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      search.set(key, value);
    }
  });
  const value = search.toString();
  return value ? `?${value}` : "";
};

const request = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  const headers = new Headers(init.headers);
  const token = authTokenStorage.get();

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers,
    });
  } catch {
    throw new Error("API is unavailable. Check that the backend is running.");
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    if (response.status === 401) {
      authTokenStorage.clear();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
      }
    }
    throw new Error(payload?.error ?? `Request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
};

export const httpApiClient: ApiClient = {
  login: (input: AuthCredentials) =>
    request("/auth/login", { method: "POST", body: JSON.stringify(input) }),
  register: (input: RegisterInput) =>
    request("/auth/register", { method: "POST", body: JSON.stringify(input) }),
  getCurrentUser: () => request("/users/me"),

  listProjects: () => request("/workspaces"),
  getProjectById: (id: ID) => request(`/workspaces/${id}`),
  createProject: (input: CreateProjectInput) =>
    request("/workspaces", { method: "POST", body: JSON.stringify(input) }),
  shareProject: (id: ID) => request(`/workspaces/${id}/share`, { method: "POST" }),
  getSharedWorkspace: (token: string) => request(`/shared/workspaces/${token}`),
  removeWorkspaceMember: (projectId: ID, userId: ID) =>
    request(`/workspaces/${projectId}/members/${userId}`, { method: "DELETE" }),

  listUsers: () => request("/users"),
  updateUserProfile: (userId: ID, input: UpdateUserProfileInput) =>
    request(`/users/${userId}/profile`, { method: "PATCH", body: JSON.stringify(input) }),
  updateUserRole: (input: UpdateUserRoleInput) =>
    request("/users/role", { method: "PATCH", body: JSON.stringify(input) }),
  updateUserSettings: (userId: ID, input: UpdateUserSettingsInput) =>
    request(`/users/${userId}/settings`, { method: "PATCH", body: JSON.stringify(input) }),
  uploadAvatar: (userId: ID, input: UploadAvatarInput) =>
    request(`/users/${userId}/avatar`, { method: "POST", body: JSON.stringify(input) }),
  changePassword: (userId: ID, input: ChangePasswordInput) =>
    request(`/users/${userId}/password`, { method: "POST", body: JSON.stringify(input) }),
  deleteUser: (userId: ID) => request(`/users/${userId}`, { method: "DELETE" }),
  updateUserTheme: (userId: ID, theme: ThemePreference) =>
    request(`/users/${userId}/theme`, { method: "PATCH", body: JSON.stringify({ theme }) }),

  listTasks: (query?: TaskQuery) =>
    request(`/tasks${queryString({ projectId: query?.projectId, q: query?.q, status: query?.status })}`),
  getTaskById: (id: ID) => request(`/tasks/${id}`),
  createTask: (input: CreateTaskInput) =>
    request("/tasks", { method: "POST", body: JSON.stringify(input) }),
  updateTask: (id: ID, input: UpdateTaskInput) =>
    request(`/tasks/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
  reorderTask: (id: ID, input: ReorderTaskInput) =>
    request(`/tasks/${id}/reorder`, { method: "POST", body: JSON.stringify(input) }),
  deleteTask: (id: ID) => request(`/tasks/${id}`, { method: "DELETE" }),
  listTaskComments: (taskId: ID) => request(`/tasks/${taskId}/comments`),
  createTaskComment: (input: CreateCommentInput) =>
    request(`/tasks/${input.taskId}/comments`, { method: "POST", body: JSON.stringify(input) }),

  listNotifications: (userId: ID) => request(`/notifications${queryString({ userId })}`),
  markNotificationRead: (notificationId: ID) =>
    request(`/notifications/${notificationId}/read`, { method: "PATCH" }),
  markAllNotificationsRead: (userId: ID) =>
    request(`/notifications/read-all`, { method: "PATCH", body: JSON.stringify({ userId }) }),
};
