"use client";

import { create } from "zustand";

interface NavigationLoadingState {
  pendingHref?: string;
  beginNavigation: (href: string) => void;
  endNavigation: () => void;
}

export const useNavigationLoadingStore = create<NavigationLoadingState>((set) => ({
  pendingHref: undefined,
  beginNavigation: (href) => set({ pendingHref: href }),
  endNavigation: () => set({ pendingHref: undefined }),
}));
