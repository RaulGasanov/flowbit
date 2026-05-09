"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Avatar } from "@/shared/ui/avatar";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/cn";
import { RoleBadge } from "@/entities/user/ui/role-badge";
import { useCurrentUser } from "@/entities/user/model/store";
import { useAuthStore } from "@/entities/auth/model/store";
import { useProjectsStore } from "@/entities/project/model/store";
import { NotificationPanel } from "@/widgets/notifications-panel/ui/notification-panel";
import { unreadCount, useNotificationsStore } from "@/entities/notification/model/store";
import { useNotificationActions } from "@/features/notifications/model/use-notification-actions";
import { useToggleTheme } from "@/features/toggle-theme/model/use-toggle-theme";

interface TopbarProps {
  onSearch: (query: string) => void;
  onToggleSidebar: () => void;
  showSearch?: boolean;
}

interface OpenTab {
  id: string;
  label: string;
  href: string;
}

const TABS_STORAGE_PREFIX = "flowbit:open-tabs";

const readStoredTabs = (storageKey: string): OpenTab[] => {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(storageKey) ?? "[]");
    return Array.isArray(parsed)
       ? parsed.filter((tab): tab is OpenTab =>
          typeof tab?.id === "string" &&
          typeof tab?.label === "string" &&
          typeof tab?.href === "string",
       )
       : [];
  } catch {
    return [];
  }
};

const writeStoredTabs = (storageKey: string, tabs: OpenTab[]) => {
  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(storageKey, JSON.stringify(tabs));
  }
};

const mergeTab = (tabs: OpenTab[], tab: OpenTab) => {
  const existingIndex = tabs.findIndex((item) => item.id === tab.id);
  if (existingIndex >= 0) {
    return tabs.map((item) => (item.id === tab.id ? tab : item));
  }
  return [...tabs, tab];
};

export const Topbar = ({ onSearch, onToggleSidebar, showSearch = false }: TopbarProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const projects = useProjectsStore((state) => state.projects);
  const projectsLoading = useProjectsStore((state) => state.isLoading);
  const currentUser = useCurrentUser();
  const storageKey = `${TABS_STORAGE_PREFIX}:${currentUser?.id ?? "guest"}`;
  const logout = useAuthStore((state) => state.logout);
  const toggleTheme = useToggleTheme();
  const {
    notifications,
    isPanelOpen,
  } = useNotificationsStore();
  const { setPanelOpen, markAsRead, markAllAsRead } = useNotificationActions();
  const currentTab = useMemo<OpenTab | null>(() => {
    if (pathname === "/") {
      return { id: "dashboard", label: "Dashboard", href: "/" };
    }
    if (pathname === "/profile") {
      return { id: "profile", label: "Profile", href: "/profile" };
    }
    if (pathname === "/settings") {
      return { id: "settings", label: "Preferences", href: "/settings" };
    }
    const projectId = pathname.match(/^\/projects\/([^/]+)/)?.[1];
    if (projectId) {
      const project = projects.find((item) => item.id === projectId);
      return project
        ? {
            id: `project:${projectId}`,
            label: project.name,
            href: `/projects/${projectId}`,
          }
        : null;
    }
    return null;
  }, [pathname, projects]);

  const [openTabs, setOpenTabs] = useState<OpenTab[]>(() => {
    const storedTabs = readStoredTabs(storageKey);
    return currentTab ? mergeTab(storedTabs, currentTab) : storedTabs;
  });

  useEffect(() => {
    const storedTabs = readStoredTabs(storageKey);
    const nextTabs = currentTab ? mergeTab(storedTabs, currentTab) : storedTabs;
    const timeout = window.setTimeout(() => {
      setOpenTabs(nextTabs);
      writeStoredTabs(storageKey, nextTabs);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [storageKey, currentTab]);

  useEffect(() => {
    const onOpenTab = (event: Event) => {
      const tab = (event as CustomEvent<OpenTab>).detail;
      if (!tab) {
        return;
      }
      setOpenTabs((tabs) => {
        const nextTabs = mergeTab(tabs, tab);
        writeStoredTabs(storageKey, nextTabs);
        return nextTabs;
      });
    };
    window.addEventListener("flowbit:open-tab", onOpenTab);
    return () => window.removeEventListener("flowbit:open-tab", onOpenTab);
  }, [storageKey]);

  const displayedTabs = useMemo(() => openTabs.flatMap((tab) => {
    const projectId = tab.id.startsWith("project:") ? tab.id.replace("project:", "") : undefined;
    if (!projectId) {
      return [tab];
    }
    const project = projects.find((item) => item.id === projectId);
    if (project) {
      return [{ ...tab, label: project.name }];
    }
    return projectsLoading ? [tab] : [];
  }), [openTabs, projects, projectsLoading]);

  useEffect(() => {
    if (projectsLoading || displayedTabs.length === openTabs.length) {
      return;
    }
    const timeout = window.setTimeout(() => {
      setOpenTabs(displayedTabs);
      writeStoredTabs(storageKey, displayedTabs);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [displayedTabs, openTabs.length, projectsLoading, storageKey]);

  const closeTab = (tab: OpenTab) => {
    if (displayedTabs.length <= 1) {
      return;
    }
    const closedIndex = displayedTabs.findIndex((item) => item.id === tab.id);
    const nextTabs = displayedTabs.filter((item) => item.id !== tab.id);
    setOpenTabs(nextTabs);
    writeStoredTabs(storageKey, nextTabs);
    if (currentTab?.id === tab.id) {
      const fallback = nextTabs[Math.max(0, closedIndex - 1)] ?? nextTabs[0];
      router.push(fallback.href);
    }
  };

  return (
     <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between border-b border-border bg-surface/95 px-4 backdrop-blur md:px-7">
       <div className="flex min-w-0 flex-1 items-center gap-4">
         <button
            type="button"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-border bg-panel text-muted transition hover:bg-panel-muted hover:text-foreground"
            aria-label="Toggle sidebar"
            title="Toggle sidebar"
            onClick={onToggleSidebar}
         >
           <span className="relative block h-4 w-4 rounded-[4px] border-2 border-current">
             <span className="absolute bottom-0 left-1 top-0 w-0 border-l-2 border-current" />
           </span>
         </button>

         <nav className="hidden min-w-0 max-w-full items-center gap-1 overflow-x-auto rounded-xl bg-panel-muted p-1 md:flex">
           {displayedTabs.map((item) => {
             const active = currentTab?.id === item.id;
             return (
                <div
                   key={item.id}
                   className={cn(
                      "flex h-9 max-w-56 shrink-0 items-center rounded-lg text-[13px] font-semibold text-muted transition",
                      "hover:bg-panel hover:text-foreground",
                      active && "bg-panel text-foreground shadow-sm",
                   )}
                >
                  <button
                     type="button"
                     className="min-w-0 truncate px-3 py-2"
                     onClick={() => router.push(item.href)}
                  >
                    {item.label}
                  </button>
                  <button
                     type="button"
                     className="mr-1 grid h-7 w-7 shrink-0 place-items-center rounded-md text-soft hover:bg-panel-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-35"
                     aria-label={`Close ${item.label}`}
                     disabled={displayedTabs.length <= 1}
                     onClick={() => closeTab(item)}
                  >
                    ×
                  </button>
                </div>
             );
           })}
         </nav>
       </div>

       <div className="relative ml-3 flex shrink-0 items-center gap-2">
         {showSearch ? (
           <input
              type="search"
              id="task-search-input"
              placeholder="Search"
              className="hidden h-9 w-40 rounded-xl border border-border bg-panel-muted px-3 text-sm outline-none ring-accent/20 transition placeholder:text-soft focus:border-accent/50 focus:bg-panel focus:ring-2 xl:block"
              onChange={(event) => onSearch(event.target.value)}
              aria-label="Search tasks"
           />
         ) : null}
         <button
            type="button"
            className="grid h-9 w-9 place-items-center rounded-xl border border-border bg-panel text-sm text-muted shadow-sm transition hover:bg-panel-muted hover:text-foreground"
            onClick={() => setPanelOpen(!isPanelOpen)}
            aria-label="Open notifications"
            title={unreadCount(notifications) ? `${unreadCount(notifications)} unread notifications` : "Notifications"}
         >
           <span className="relative block h-4 w-4 rounded-md border-2 border-current">
             <span className="absolute left-1/2 top-1/2 h-1.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-b-md border-b-2 border-current" />
             {unreadCount(notifications) ? (
               <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-accent ring-2 ring-panel" />
             ) : null}
           </span>
         </button>
         {isPanelOpen ? (
            <NotificationPanel
               notifications={notifications}
               onMarkAsRead={(notificationId) => {
                 markAsRead(notificationId);
               }}
               onMarkAllAsRead={() => {
                 if (currentUser) {
                   markAllAsRead(currentUser.id);
                 }
               }}
            />
         ) : null}
         <div className="hidden lg:block">{currentUser ? <RoleBadge role={currentUser.role} /> : null}</div>
         <Button
            variant="ghost"
            onClick={() => toggleTheme(currentUser?.settings.theme === "dark" ? "light" : "dark")}
            className="h-9 min-h-9 rounded-xl px-3 py-1 text-xs"
            disabled={!currentUser}
            title="Toggle theme"
         >
           {currentUser?.settings.theme === "dark" ? "☀" : "☾"}
         </Button>
         <Button variant="ghost" onClick={logout} className="h-9 min-h-9 rounded-xl px-3 py-1 text-xs" title="Logout">
           ⎋
         </Button>
         <Avatar name={currentUser?.name ?? "Guest"} src={currentUser?.avatarUrl} className="h-9 w-9 border-2 border-surface" />
       </div>
     </header>
  );
};
