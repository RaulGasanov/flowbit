"use client";

import { Avatar } from "@/shared/ui/avatar";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/cn";
import { formFieldFocusClassName } from "@/shared/lib/form-field";
import { toRoutePath } from "@/shared/lib/navigation-path";
import { useNavigationLoadingStore } from "@/shared/model/navigation-loading";
import { useCurrentUser } from "@/entities/user/model/store";
import { useAuthStore } from "@/entities/auth/model/store";
import { useProjectsStore } from "@/entities/project/model/store";
import { NotificationPanel } from "@/widgets/notifications-panel/ui/notification-panel";
import { unreadCount, useNotificationsStore } from "@/entities/notification/model/store";
import { useNotificationActions } from "@/features/notifications/model/use-notification-actions";
import { useToggleTheme } from "@/features/toggle-theme/model/use-toggle-theme";
import { useOpenTabs } from "@/widgets/topbar/model/use-open-tabs";

interface TopbarProps {
  onSearch: (query: string) => void;
  onToggleSidebar: () => void;
  showSearch?: boolean;
}

export const Topbar = ({ onSearch, onToggleSidebar, showSearch = false }: TopbarProps) => {
  const projects = useProjectsStore((state) => state.projects);
  const projectsLoading = useProjectsStore((state) => state.isLoading);
  const currentUser = useCurrentUser();
  const logout = useAuthStore((state) => state.logout);
  const toggleTheme = useToggleTheme();
  const {
    notifications,
    isPanelOpen,
  } = useNotificationsStore();
  const { setPanelOpen, markAsRead, markAllAsRead } = useNotificationActions();
  const pendingHref = useNavigationLoadingStore((state) => state.pendingHref);
  const { currentTab, displayedTabs, closeTab, openTab } = useOpenTabs({
    currentUserId: currentUser?.id,
    projects,
    projectsLoading,
  });

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
           <span className="flex h-4 w-4 flex-col justify-center gap-1 md:hidden">
             <span className="h-0.5 rounded-full bg-current" />
             <span className="h-0.5 rounded-full bg-current" />
             <span className="h-0.5 rounded-full bg-current" />
           </span>
           <span className="relative hidden h-4 w-4 rounded-[4px] border-2 border-current md:block">
             <span className="absolute bottom-0 left-1 top-0 w-0 border-l-2 border-current" />
           </span>
         </button>

         <nav className="hidden min-w-0 max-w-full items-center gap-1 overflow-x-auto rounded-xl bg-panel-muted p-1 md:flex">
           {displayedTabs.map((item) => {
             const active = currentTab?.id === item.id;
             const pending = toRoutePath(pendingHref) === toRoutePath(item.href);
             return (
                <div
                   key={item.id}
                   className={cn(
                      "relative flex h-9 max-w-56 shrink-0 items-center overflow-hidden rounded-lg text-[13px] font-semibold text-muted transition",
                      "hover:bg-panel hover:text-foreground",
                      active && "bg-panel text-foreground shadow-sm",
                      pending && "bg-panel text-foreground",
                   )}
                >
                  <button
                     type="button"
                     className="min-w-0 truncate px-3 py-2"
                     onClick={() => openTab(item)}
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
              className={cn(
                "hidden h-9 w-40 rounded-xl border bg-panel-muted px-3 text-sm focus:bg-panel xl:block",
                formFieldFocusClassName,
              )}
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
