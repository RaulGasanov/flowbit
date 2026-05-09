import type {
  ApiClient,
  ChangePasswordInput,
  CreateCommentInput,
  CreateProjectInput,
  CreateTaskInput,
  ReorderTaskInput,
  TaskQuery,
  UpdateUserProfileInput,
  UpdateUserSettingsInput,
  UpdateProjectInput,
  UpdateTaskInput,
  UploadAvatarInput,
} from "@/shared/api/model/contracts";
import type {
  ID,
  Notification,
  NotificationType,
  Project,
  Task,
  TaskComment,
  TaskStatus,
  ThemePreference,
  User,
} from "@/shared/types/domain";
import { mockNotifications, mockProjects, mockTaskComments, mockTasks, mockUsers } from "@/shared/api/mock/data";
import { randomLatency, sleep } from "@/shared/api/mock/utils";

const db = {
  projects: [...mockProjects],
  tasks: [...mockTasks],
  comments: [...mockTaskComments],
  notifications: [...mockNotifications],
  users: [...mockUsers],
};

const withLatency = async <T>(value: T): Promise<T> => {
  await sleep(randomLatency());
  return value;
};

const cloneUser = (user: User): User => ({
  ...user,
  settings: {
    ...user.settings,
    notifications: { ...user.settings.notifications },
  },
});

const filterTasks = (tasks: Task[], query?: TaskQuery): Task[] => {
  if (!query) {
    return tasks;
  }

  return tasks.filter((task) => {
    if (query.projectId && task.projectId !== query.projectId) {
      return false;
    }

    if (query.status && task.status !== query.status) {
      return false;
    }

    if (query.q) {
      const needle = query.q.toLowerCase();
      return (
        task.title.toLowerCase().includes(needle) ||
        task.description.toLowerCase().includes(needle)
      );
    }

    return true;
  });
};

const createId = (): ID => `tsk_${Math.random().toString(36).slice(2, 10)}`;
const createProjectId = (): ID => `prj_${Math.random().toString(36).slice(2, 10)}`;
const createCommentId = (): ID => `cmt_${Math.random().toString(36).slice(2, 10)}`;
const createNotificationId = (): ID => `ntf_${Math.random().toString(36).slice(2, 10)}`;

const statusOrder: TaskStatus[] = ["todo", "in_progress", "done"];

const normalizePositions = (tasks: Task[]): Task[] =>
  statusOrder.flatMap((status) => {
    const scoped = tasks
      .filter((task) => task.status === status)
      .sort((a, b) => a.position - b.position);
    return scoped.map((task, index) => ({ ...task, position: index }));
  });

const randomNotificationType = (): NotificationType => {
  const types: NotificationType[] = ["new_comment", "task_updated", "deadline_approaching"];
  return types[Math.floor(Math.random() * types.length)];
};

const notificationPayloadByType = (type: NotificationType, task?: Task) => {
  switch (type) {
    case "new_comment":
      return {
        title: "New comment",
        message: `${task?.title ?? "A task"} has a new comment.`,
      };
    case "deadline_approaching":
      return {
        title: "Deadline approaching",
        message: `${task?.title ?? "A task"} is approaching its deadline.`,
      };
    default:
      return {
        title: "Task updated",
        message: `${task?.title ?? "A task"} was recently updated.`,
      };
  }
};

const pushNotificationForUser = (
  userId: string,
  type: NotificationType,
  task?: Task,
): Notification => {
  const payload = notificationPayloadByType(type, task);
  const notification: Notification = {
    id: createNotificationId(),
    userId,
    type,
    title: payload.title,
    message: payload.message,
    createdAt: new Date().toISOString(),
  };
  db.notifications.unshift(notification);
  return notification;
};

export const mockApiClient: ApiClient = {
  async login() {
    return withLatency({ token: "mock-token", user: cloneUser(db.users[0]) });
  },

  async register() {
    return withLatency({ token: "mock-token", user: cloneUser(db.users[0]) });
  },

  async getCurrentUser() {
    return withLatency(cloneUser(db.users[0]));
  },

  async listProjects() {
    return withLatency([...db.projects]);
  },

  async getProjectById(id) {
    return withLatency(db.projects.find((project) => project.id === id) ?? null);
  },

  async updateProject(id, input: UpdateProjectInput) {
    const index = db.projects.findIndex((project) => project.id === id);
    if (index < 0) {
      throw new Error(`Project ${id} not found`);
    }

    const updated = { ...db.projects[index], ...input };
    db.projects[index] = updated;
    return withLatency(updated);
  },

  async createProject(input: CreateProjectInput) {
    const project: Project = {
      id: createProjectId(),
      name: input.name,
      description: input.description,
      color: input.color,
      visibility: input.visibility,
      memberIds: input.memberIds?.length ? input.memberIds : [db.users[0].id],
      createdAt: new Date().toISOString(),
    };
    db.projects.push(project);
    return withLatency(project);
  },

  async listUsers() {
    return withLatency(db.users.map(cloneUser));
  },

  async listTasks(query) {
    const tasks = filterTasks(db.tasks, query);
    return withLatency([...tasks]);
  },

  async getTaskById(id) {
    return withLatency(db.tasks.find((task) => task.id === id) ?? null);
  },

  async createTask(input: CreateTaskInput) {
    const now = new Date().toISOString();
    const status = input.status ?? "todo";
    const maxPosition = Math.max(
      -1,
      ...db.tasks.filter((task) => task.projectId === input.projectId && task.status === status).map((task) => task.position),
    );
    const task: Task = {
      id: createId(),
      projectId: input.projectId,
      title: input.title,
      description: input.description,
      status,
      priority: input.priority,
      deadline: input.deadline,
      position: maxPosition + 1,
      assigneeId: input.assigneeId,
      createdAt: now,
      updatedAt: now,
    };

    db.tasks.unshift(task);
    return withLatency(task);
  },

  async updateTask(id, input: UpdateTaskInput) {
    const index = db.tasks.findIndex((task) => task.id === id);
    if (index < 0) {
      throw new Error(`Task ${id} not found`);
    }

    const current = db.tasks[index];
    const updated: Task = {
      ...current,
      ...input,
      updatedAt: new Date().toISOString(),
    };
    db.tasks[index] = updated;
    if (updated.assigneeId) {
      pushNotificationForUser(updated.assigneeId, "task_updated", updated);
    }

    return withLatency(updated);
  },

  async reorderTask(id, input: ReorderTaskInput) {
    const sourceTask = db.tasks.find((task) => task.id === id);
    if (!sourceTask) {
      throw new Error(`Task ${id} not found`);
    }

    const sameProjectTasks = db.tasks.filter((task) => task.projectId === sourceTask.projectId && task.id !== sourceTask.id);
    const targetColumnTasks = sameProjectTasks
      .filter((task) => task.status === input.status)
      .sort((a, b) => a.position - b.position);

    const nextIndex = Math.max(0, Math.min(input.index, targetColumnTasks.length));
    targetColumnTasks.splice(nextIndex, 0, { ...sourceTask, status: input.status });

    const untouched = db.tasks.filter((task) => task.projectId !== sourceTask.projectId);
    const rebuilt = normalizePositions([
      ...sameProjectTasks.filter((task) => task.status !== input.status),
      ...targetColumnTasks,
    ]).map((task) =>
      task.id === sourceTask.id
        ? { ...task, status: input.status, updatedAt: new Date().toISOString() }
        : task,
    );

    db.tasks = [...untouched, ...rebuilt];
    return withLatency(db.tasks.filter((task) => task.projectId === sourceTask.projectId));
  },

  async deleteTask(id) {
    db.tasks = db.tasks.filter((task) => task.id !== id);
    db.comments = db.comments.filter((comment) => comment.taskId !== id);
    await withLatency(undefined);
  },

  async listTaskComments(taskId) {
    const comments = db.comments
      .filter((comment) => comment.taskId === taskId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return withLatency(comments);
  },

  async createTaskComment(input: CreateCommentInput) {
    const comment: TaskComment = {
      id: createCommentId(),
      taskId: input.taskId,
      authorId: input.authorId,
      body: input.body,
      createdAt: new Date().toISOString(),
    };
    db.comments.push(comment);
    const task = db.tasks.find((item) => item.id === input.taskId);
    if (task?.assigneeId && task.assigneeId !== input.authorId) {
      pushNotificationForUser(task.assigneeId, "new_comment", task);
    }
    return withLatency(comment);
  },

  async listNotifications(userId) {
    const notifications = db.notifications
      .filter((notification) => notification.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return withLatency(notifications);
  },

  async markNotificationRead(notificationId) {
    db.notifications = db.notifications.map((notification) =>
      notification.id === notificationId && !notification.readAt
        ? { ...notification, readAt: new Date().toISOString() }
        : notification,
    );
    await withLatency(undefined);
  },

  async markAllNotificationsRead(userId) {
    db.notifications = db.notifications.map((notification) =>
      notification.userId === userId && !notification.readAt
        ? { ...notification, readAt: new Date().toISOString() }
        : notification,
    );
    await withLatency(undefined);
  },

  async generateNotification(userId) {
    const randomTask = db.tasks[Math.floor(Math.random() * db.tasks.length)];
    const type = randomNotificationType();
    const notification = pushNotificationForUser(userId, type, randomTask);
    return withLatency(notification);
  },

  async updateUserProfile(userId, input: UpdateUserProfileInput) {
    const index = db.users.findIndex((user) => user.id === userId);
    if (index < 0) {
      throw new Error(`User ${userId} not found`);
    }

    const updated = { ...db.users[index], ...input };
    db.users[index] = updated;
    return withLatency(cloneUser(updated));
  },

  async updateUserSettings(userId, input: UpdateUserSettingsInput) {
    const index = db.users.findIndex((user) => user.id === userId);
    if (index < 0) {
      throw new Error(`User ${userId} not found`);
    }

    const updated = { ...db.users[index], settings: input.settings };
    db.users[index] = updated;
    return withLatency(cloneUser(updated));
  },

  async uploadAvatar(userId, input: UploadAvatarInput) {
    const index = db.users.findIndex((user) => user.id === userId);
    if (index < 0) {
      throw new Error(`User ${userId} not found`);
    }

    const avatarUrl = input.dataUrl;
    db.users[index] = { ...db.users[index], avatarUrl };
    return withLatency({ avatarUrl });
  },

  async changePassword(userId, input: ChangePasswordInput) {
    const user = db.users.find((item) => item.id === userId);
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }
    if (input.newPassword.length < 8) {
      throw new Error("Password must be at least 8 characters");
    }
    await withLatency(undefined);
  },

  async deleteUser(userId) {
    db.users = db.users.filter((user) => user.id !== userId);
    db.notifications = db.notifications.filter((notification) => notification.userId !== userId);
    db.tasks = db.tasks.map((task) => (task.assigneeId === userId ? { ...task, assigneeId: undefined } : task));
    db.comments = db.comments.filter((comment) => comment.authorId !== userId);
    await withLatency(undefined);
  },

  async updateUserTheme(userId, theme: ThemePreference) {
    const index = db.users.findIndex((user) => user.id === userId);
    if (index < 0) {
      throw new Error(`User ${userId} not found`);
    }

    const updated = {
      ...db.users[index],
      settings: { ...db.users[index].settings, theme },
    };
    db.users[index] = updated;
    return withLatency(cloneUser(updated));
  },
};
