"use client";

import { create } from "zustand";
import { getApiClient } from "@/shared/api/base";
import { taskApi } from "@/entities/task/api/task-api";
import type { CreateTaskInput } from "@/shared/api/model/contracts";
import type { Task, TaskComment, TaskStatus, User } from "@/shared/types/domain";

const taskStatuses: TaskStatus[] = ["todo", "in_progress", "done"];

interface TasksState {
  tasks: Task[];
  users: User[];
  commentsByTaskId: Record<string, TaskComment[]>;
  selectedTaskId?: string;
  isLoading: boolean;
  error?: string;
  query: string;
  loadTasks: (projectId?: string) => Promise<void>;
  loadUsers: () => Promise<void>;
  createTask: (input: CreateTaskInput) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  setQuery: (query: string) => void;
  selectTask: (taskId?: string) => void;
  updateTaskStatus: (taskId: string, status: TaskStatus) => Promise<void>;
  moveTask: (taskId: string, status: TaskStatus, index: number) => Promise<void>;
  loadComments: (taskId: string) => Promise<void>;
  addComment: (taskId: string, authorId: string, body: string) => Promise<void>;
}

export const useTasksStore = create<TasksState>((set, get) => ({
  tasks: [],
  users: [],
  commentsByTaskId: {},
  selectedTaskId: undefined,
  isLoading: false,
  error: undefined,
  query: "",

  loadTasks: async (projectId) => {
    set({ isLoading: true, error: undefined });
    try {
      const tasks = await taskApi.list({ projectId, q: get().query || undefined });
      const sortedTasks = [...tasks].sort((a, b) => {
        if (a.status === b.status) {
          return a.position - b.position;
        }
        return a.status.localeCompare(b.status);
      });
      set({ tasks: sortedTasks, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load tasks";
      set({ isLoading: false, error: message });
    }
  },

  loadUsers: async () => {
    try {
      const users = await getApiClient().listUsers();
      set({ users });
    } catch {
      set({ users: [] });
    }
  },

  setQuery: (query) => set({ query }),
  selectTask: (taskId) => set({ selectedTaskId: taskId }),

  createTask: async (input) => {
    try {
      const task = await taskApi.create(input);
      const currentTasks = get().tasks;
      const shouldInsert =
        !get().query ||
        task.title.toLowerCase().includes(get().query.toLowerCase()) ||
        task.description.toLowerCase().includes(get().query.toLowerCase());
      set({ tasks: shouldInsert ? [task, ...currentTasks] : currentTasks, error: undefined });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create task";
      set({ error: message });
      throw new Error(message);
    }
  },

  deleteTask: async (taskId) => {
    const previousTasks = get().tasks;
    set({ tasks: previousTasks.filter((task) => task.id !== taskId) });
    try {
      await taskApi.remove(taskId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete task";
      set({ tasks: previousTasks, error: message });
      throw new Error(message);
    }
  },

  updateTaskStatus: async (taskId, status) => {
    const previousTasks = get().tasks;
    const optimisticTasks = previousTasks.map((task) => {
      if (task.id !== taskId) {
        return task;
      }
      const maxPosition = Math.max(
        -1,
        ...previousTasks.filter((item) => item.status === status).map((item) => item.position),
      );
      return { ...task, status, position: maxPosition + 1, updatedAt: new Date().toISOString() };
    });
    set({ tasks: optimisticTasks });

    try {
      const updatedTask = await taskApi.update(taskId, { status });
      set({
        tasks: get().tasks.map((task) => (task.id === taskId ? updatedTask : task)),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update task";
      set({ tasks: previousTasks, error: message });
      throw new Error(message);
    }
  },

  moveTask: async (taskId, status, index) => {
    const previousTasks = get().tasks;
    const draggedTask = previousTasks.find((task) => task.id === taskId);
    if (!draggedTask) {
      return;
    }

    const projectId = draggedTask.projectId;
    const filtered = previousTasks.filter((task) => task.projectId === projectId && task.id !== taskId);
    const inTarget = filtered
      .filter((task) => task.status === status)
      .sort((a, b) => a.position - b.position);
    const nextIndex = Math.max(0, Math.min(index, inTarget.length));
    inTarget.splice(nextIndex, 0, { ...draggedTask, status });

    const updatedProjectTasks = taskStatuses.flatMap((column) => {
      const scoped = [...filtered.filter((task) => task.status === column), ...inTarget.filter((task) => task.status === column)]
        .sort((a, b) => a.position - b.position)
        .filter((task, idx, arr) => arr.findIndex((item) => item.id === task.id) === idx);
      return scoped.map((task, position) => ({ ...task, position }));
    });

    const untouched = previousTasks.filter((task) => task.projectId !== projectId);
    set({ tasks: [...untouched, ...updatedProjectTasks] });

    try {
      const tasks = await taskApi.reorder(taskId, { status, index: nextIndex });
      const nonProject = get().tasks.filter((task) => task.projectId !== projectId);
      set({ tasks: [...nonProject, ...tasks] });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to reorder task";
      set({ tasks: previousTasks, error: message });
      throw new Error(message);
    }
  },

  loadComments: async (taskId) => {
    try {
      const comments = await taskApi.listComments(taskId);
      set({ commentsByTaskId: { ...get().commentsByTaskId, [taskId]: comments } });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load comments";
      set({ error: message });
      throw new Error(message);
    }
  },

  addComment: async (taskId, authorId, body) => {
    try {
      const comment = await taskApi.createComment({ taskId, authorId, body });
      const existing = get().commentsByTaskId[taskId] ?? [];
      set({
        commentsByTaskId: {
          ...get().commentsByTaskId,
          [taskId]: [...existing, comment],
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to add comment";
      set({ error: message });
      throw new Error(message);
    }
  },
}));
