"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { userApi } from "@/entities/user/api/user-api";
import { permissionsByRole } from "@/entities/user/model/permissions";
import type { UploadAvatarInput } from "@/shared/api/model/contracts";
import type { ThemePreference, User, UserRole, UserSettings } from "@/shared/types/domain";

interface UserState {
  users: User[];
  currentUserId?: string;
  persistedSettings: Record<string, UserSettings>;
  isLoading: boolean;
  loadUsers: () => Promise<void>;
  setAuthenticatedUser: (user: User) => void;
  clearSession: () => void;
  setCurrentUser: (userId: string) => void;
  updateProfile: (input: { name: string; email: string; bio: string }) => Promise<void>;
  updateUserRoleByEmail: (input: { email: string; role: UserRole }) => Promise<User>;
  updateSettings: (settings: UserSettings) => Promise<void>;
  uploadAvatar: (input: UploadAvatarInput) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  deleteCurrentAccount: () => Promise<void>;
  updateTheme: (theme: ThemePreference) => Promise<void>;
}

const mergeUserSettings = (user: User, persistedSettings: Record<string, UserSettings>): User => {
  const local = persistedSettings[user.id];
  if (!local) {
    return user;
  }
  return { ...user, settings: local };
};

const applyUserUpdate = (users: User[], userId: string, updater: (user: User) => User): User[] =>
  users.map((user) => (user.id === userId ? updater(user) : user));

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      users: [],
      currentUserId: undefined,
      persistedSettings: {},
      isLoading: false,

      loadUsers: async () => {
        set({ isLoading: true });
        try {
          const apiUsers = await userApi.list();
          const users = apiUsers.map((user) => mergeUserSettings(user, get().persistedSettings));
          const nextCurrent = users.find((user) => user.id === get().currentUserId)?.id ?? users[0]?.id;
          set({ users, currentUserId: nextCurrent, isLoading: false });
        } catch {
          set({ users: [], isLoading: false });
        }
      },

      setAuthenticatedUser: (user) => {
        set({
          users: [mergeUserSettings(user, get().persistedSettings)],
          currentUserId: user.id,
        });
      },

      clearSession: () => set({ users: [], currentUserId: undefined }),

      setCurrentUser: (userId) => set({ currentUserId: userId }),

      updateProfile: async (input) => {
        const currentUserId = get().currentUserId;
        if (!currentUserId) return;
        const previousUsers = get().users;
        set({
          users: applyUserUpdate(previousUsers, currentUserId, (user) => ({ ...user, ...input })),
        });
        try {
          const updated = await userApi.updateProfile(currentUserId, input);
          set({
            users: applyUserUpdate(get().users, currentUserId, () => mergeUserSettings(updated, get().persistedSettings)),
          });
        } catch {
          set({ users: previousUsers });
          throw new Error("Unable to update profile");
        }
      },

      updateUserRoleByEmail: async (input) => {
        const updated = await userApi.updateRole(input);
        set({
          users: applyUserUpdate(get().users, updated.id, () => mergeUserSettings(updated, get().persistedSettings)),
        });
        return updated;
      },

      updateSettings: async (settings) => {
        const currentUserId = get().currentUserId;
        if (!currentUserId) return;
        const previousUsers = get().users;
        const previousPersistedSettings = get().persistedSettings;
        const nextPersistedSettings = { ...previousPersistedSettings, [currentUserId]: settings };
        set({
          persistedSettings: nextPersistedSettings,
          users: applyUserUpdate(previousUsers, currentUserId, (user) => ({ ...user, settings })),
        });
        try {
          const updated = await userApi.updateSettings(currentUserId, { settings });
          set({
            users: applyUserUpdate(get().users, currentUserId, () => mergeUserSettings(updated, nextPersistedSettings)),
          });
        } catch {
          set({ users: previousUsers, persistedSettings: previousPersistedSettings });
          throw new Error("Unable to update settings");
        }
      },

      uploadAvatar: async (input) => {
        const currentUserId = get().currentUserId;
        if (!currentUserId) return;
        const { avatarUrl } = await userApi.uploadAvatar(currentUserId, input);
        set({
          users: applyUserUpdate(get().users, currentUserId, (user) => ({ ...user, avatarUrl })),
        });
      },

      changePassword: async (currentPassword, newPassword) => {
        const currentUserId = get().currentUserId;
        if (!currentUserId) return;
        await userApi.changePassword(currentUserId, { currentPassword, newPassword });
      },

      deleteCurrentAccount: async () => {
        const currentUserId = get().currentUserId;
        if (!currentUserId) return;
        await userApi.deleteUser(currentUserId);
        const nextUsers = get().users.filter((user) => user.id !== currentUserId);
        const nextPersisted = { ...get().persistedSettings };
        delete nextPersisted[currentUserId];
        set({
          users: nextUsers,
          currentUserId: nextUsers[0]?.id,
          persistedSettings: nextPersisted,
        });
      },

      updateTheme: async (theme) => {
        const currentUser = get().users.find((user) => user.id === get().currentUserId);
        if (!currentUser) return;
        const settings = { ...currentUser.settings, theme };
        await get().updateSettings(settings);
      },
    }),
    {
      name: "flowbit-user-settings",
      partialize: (state) => ({
        currentUserId: state.currentUserId,
        persistedSettings: state.persistedSettings,
      }),
    },
  ),
);

export const useCurrentUser = (): User | undefined => {
  const users = useUserStore((state) => state.users);
  const currentUserId = useUserStore((state) => state.currentUserId);
  return users.find((user) => user.id === currentUserId);
};

export const useCurrentPermissions = () => {
  const user = useCurrentUser();
  return permissionsByRole(user?.role ?? "viewer");
};
