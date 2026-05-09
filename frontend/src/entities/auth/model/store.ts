"use client";

import { create } from "zustand";
import { getApiClient } from "@/shared/api/base";
import { authTokenStorage } from "@/shared/api/base/http-client";
import { useUserStore } from "@/entities/user/model/store";
import type { AuthCredentials, RegisterInput } from "@/shared/api/model/contracts";
import type { User } from "@/shared/types/domain";

interface AuthState {
  user?: User;
  token?: string;
  isLoading: boolean;
  isReady: boolean;
  error?: string;
  initialize: () => Promise<void>;
  login: (input: AuthCredentials) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => void;
}

const applySession = (token: string, user: User) => {
  authTokenStorage.set(token);
  useUserStore.getState().setAuthenticatedUser(user);
};

export const useAuthStore = create<AuthState>((set) => ({
  user: undefined,
  token: undefined,
  isLoading: false,
  isReady: false,
  error: undefined,

  initialize: async () => {
    const token = authTokenStorage.get();
    if (!token) {
      set({ isReady: true, user: undefined, token: undefined });
      return;
    }

    set({ isLoading: true, error: undefined });
    try {
      const user = await getApiClient().getCurrentUser();
      useUserStore.getState().setAuthenticatedUser(user);
      set({ user, token, isLoading: false, isReady: true });
    } catch {
      authTokenStorage.clear();
      useUserStore.getState().clearSession();
      set({ user: undefined, token: undefined, isLoading: false, isReady: true });
    }
  },

  login: async (input) => {
    set({ isLoading: true, error: undefined });
    try {
      const session = await getApiClient().login(input);
      applySession(session.token, session.user);
      set({ user: session.user, token: session.token, isLoading: false, isReady: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to sign in";
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  register: async (input) => {
    set({ isLoading: true, error: undefined });
    try {
      const session = await getApiClient().register(input);
      applySession(session.token, session.user);
      set({ user: session.user, token: session.token, isLoading: false, isReady: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to create account";
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  logout: () => {
    authTokenStorage.clear();
    useUserStore.getState().clearSession();
    set({ user: undefined, token: undefined, error: undefined, isReady: true });
  },
}));
