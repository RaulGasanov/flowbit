"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import type { PropsWithChildren } from "react";
import { useAuthStore } from "@/entities/auth/model/store";
import { AppShell } from "@/widgets/app-shell/ui/app-shell";
import { AUTH_EXPIRED_EVENT } from "@/shared/api/base/http-client";

export const AppProviders = ({ children }: PropsWithChildren) => {
  const pathname = usePathname();
  const initialize = useAuthStore((state) => state.initialize);
  const logout = useAuthStore((state) => state.logout);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    window.addEventListener(AUTH_EXPIRED_EVENT, logout);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, logout);
  }, [logout]);

  const shellDisabled = pathname === "/login" || pathname.startsWith("/guest");
  if (shellDisabled) {
    return children;
  }

  return <AppShell showSearch={pathname.startsWith("/projects/")}>{children}</AppShell>;
};
