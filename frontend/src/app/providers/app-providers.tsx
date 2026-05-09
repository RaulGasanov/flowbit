"use client";

import { useEffect } from "react";
import type { PropsWithChildren } from "react";
import { useAuthStore } from "@/entities/auth/model/store";
import { AUTH_EXPIRED_EVENT } from "@/shared/api/base/http-client";

export const AppProviders = ({ children }: PropsWithChildren) => {
  const initialize = useAuthStore((state) => state.initialize);
  const logout = useAuthStore((state) => state.logout);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    window.addEventListener(AUTH_EXPIRED_EVENT, logout);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, logout);
  }, [logout]);

  return children;
};
