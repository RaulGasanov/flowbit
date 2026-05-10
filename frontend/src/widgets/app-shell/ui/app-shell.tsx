"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { PropsWithChildren } from "react";
import { Sidebar } from "@/widgets/sidebar/ui/sidebar";
import { Topbar } from "@/widgets/topbar/ui/topbar";
import { ProjectCreateForm } from "@/features/create-project/ui/project-create-form";
import { useCurrentUser, useUserStore } from "@/entities/user/model/store";
import { useNotificationsStore } from "@/entities/notification/model/store";
import { useProjectsStore } from "@/entities/project/model/store";
import { useTasksStore } from "@/entities/task/model/store";
import { useAuthStore } from "@/entities/auth/model/store";
import { Modal } from "@/shared/ui/modal";

interface AppShellProps extends PropsWithChildren {
  showSearch?: boolean;
}

export const AppShell = ({ children, showSearch = false }: AppShellProps) => {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [workspaceModalOpen, setWorkspaceModalOpen] = useState(false);
  const { token, isReady } = useAuthStore();
  const { projects, loadProjects, createProject } = useProjectsStore();
  const { loadUsers, currentUserId } = useUserStore();
  const currentUser = useCurrentUser();
  const { loadNotifications } = useNotificationsStore();
  const { setQuery } = useTasksStore();

  useEffect(() => {
    if (!isReady) {
      return;
    }
    if (!token) {
      router.replace("/login");
      return;
    }
    loadProjects();
    loadUsers();
  }, [isReady, token, router, loadProjects, loadUsers]);

  useEffect(() => {
    if (!currentUserId) {
      return;
    }
    loadNotifications(currentUserId);
  }, [currentUserId, loadNotifications]);

  useEffect(() => {
    const html = document.documentElement;
    const theme = currentUser?.settings.theme ?? "light";
    html.classList.toggle("dark", theme === "dark");
    const accentByTheme = {
      sky: "2 132 199",
      emerald: "5 150 105",
      rose: "225 29 72",
    } as const;
    const accent = currentUser ? accentByTheme[currentUser.settings.accentColor] : accentByTheme.sky;
    html.style.setProperty("--accent", accent);
  }, [currentUser]);

  useEffect(() => {
    const onNewWorkspace = () => setWorkspaceModalOpen(true);
    window.addEventListener("flowbit:new-workspace", onNewWorkspace);
    return () => window.removeEventListener("flowbit:new-workspace", onNewWorkspace);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const syncLayout = () => {
      setIsDesktop(media.matches);
      setSidebarOpen(media.matches);
    };
    syncLayout();
    media.addEventListener("change", syncLayout);
    return () => media.removeEventListener("change", syncLayout);
  }, []);

  if (!isReady || !token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-muted text-sm text-foreground/70">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-page text-foreground md:h-screen md:overflow-hidden">
      <div className="min-h-screen md:flex md:h-full">
        <button
          type="button"
          className={`fixed inset-0 z-30 bg-slate-950/45 backdrop-blur-sm transition-opacity duration-300 ease-out md:hidden motion-reduce:transition-none ${
            sidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
          aria-label="Close navigation"
          aria-hidden={!sidebarOpen}
          onClick={() => setSidebarOpen(false)}
        />
        <div
          className={`fixed inset-y-0 left-0 z-40 w-[min(86vw,280px)] transform shadow-2xl shadow-slate-950/20 transition-transform duration-300 ease-out will-change-transform motion-reduce:transition-none md:static md:z-auto md:w-[260px] md:shrink-0 md:transform-none md:transition-none md:shadow-none ${
            sidebarOpen ? "translate-x-0 md:block" : "-translate-x-full md:hidden"
          }`}
        >
          <Sidebar
            projects={projects}
            onCreateWorkspace={() => setWorkspaceModalOpen(true)}
            onNavigate={() => {
              if (!isDesktop) {
                setSidebarOpen(false);
              }
            }}
          />
        </div>
        <main className="min-h-screen min-w-0 flex-1 bg-surface md:h-full md:overflow-y-auto">
          <Topbar
            onSearch={setQuery}
            onToggleSidebar={() => setSidebarOpen((open) => !open)}
            showSearch={showSearch}
          />
          <div className="px-4 py-5 md:px-8 md:py-7">{children}</div>
        </main>
      </div>
      <Modal open={workspaceModalOpen} title="New workspace" onClose={() => setWorkspaceModalOpen(false)}>
        <ProjectCreateForm
          currentUserId={currentUser?.id}
          onCreate={async (input) => {
            const project = await createProject(input);
            setWorkspaceModalOpen(false);
            router.push(`/projects/${project.id}`);
          }}
        />
      </Modal>
    </div>
  );
};
