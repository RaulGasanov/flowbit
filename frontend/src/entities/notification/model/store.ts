"use client";

import { create } from "zustand";
import { notificationApi } from "@/entities/notification/api/notification-api";
import type { Notification } from "@/shared/types/domain";

interface NotificationsState {
  notifications: Notification[];
  isPanelOpen: boolean;
  isLoading: boolean;
  loadNotifications: (userId: string) => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: (userId: string) => Promise<void>;
  setPanelOpen: (open: boolean) => void;
}

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  notifications: [],
  isPanelOpen: false,
  isLoading: false,

  loadNotifications: async (userId) => {
    set({ isLoading: true });
    try {
      const notifications = await notificationApi.list(userId);
      set({ notifications, isLoading: false });
    } catch {
      set({ notifications: [], isLoading: false });
    }
  },

  markAsRead: async (notificationId) => {
    const previous = get().notifications;
    set({
      notifications: get().notifications.map((notification) =>
        notification.id === notificationId && !notification.readAt
          ? { ...notification, readAt: new Date().toISOString() }
          : notification,
      ),
    });
    try {
      await notificationApi.markRead(notificationId);
    } catch {
      set({ notifications: previous });
    }
  },

  markAllAsRead: async (userId) => {
    const previous = get().notifications;
    set({
      notifications: get().notifications.map((notification) =>
        notification.userId === userId && !notification.readAt
          ? { ...notification, readAt: new Date().toISOString() }
          : notification,
      ),
    });
    try {
      await notificationApi.markAllRead(userId);
    } catch {
      set({ notifications: previous });
    }
  },

  setPanelOpen: (open) => set({ isPanelOpen: open }),
}));

export const unreadCount = (notifications: Notification[]): number =>
  notifications.filter((notification) => !notification.readAt).length;
