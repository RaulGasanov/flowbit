"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/shared/lib/cn";
import { routePathMatches, toRoutePath } from "@/shared/lib/navigation-path";
import { useNavigationLoadingStore } from "@/shared/model/navigation-loading";
import { Avatar } from "@/shared/ui/avatar";
import { useCurrentUser } from "@/entities/user/model/store";
import { DASHBOARD_TAB } from "@/widgets/topbar/model/tabs";
import type { Project } from "@/shared/types/domain";

interface SidebarProps {
  projects: Project[];
  onCreateWorkspace: () => void;
  onNavigate?: () => void;
}

const navLinkClass = (active: boolean, pending = false) =>
  cn(
    "group relative flex items-center justify-between gap-3 overflow-hidden rounded-xl border border-transparent px-3 py-2.5 text-[13px] font-semibold text-muted transition",
    "hover:border-border hover:bg-panel-muted hover:text-foreground",
    active && "border-border bg-panel text-foreground shadow-sm",
    pending && "border-border bg-panel-muted text-foreground",
  );

export const Sidebar = ({ projects, onCreateWorkspace, onNavigate }: SidebarProps) => {
  const pathname = usePathname();
  const currentUser = useCurrentUser();
  const pendingHref = useNavigationLoadingStore((state) => state.pendingHref);
  const beginNavigation = useNavigationLoadingStore((state) => state.beginNavigation);
  const openTopbarTab = (tab: { id: string; label: string; href: string }) => {
    window.dispatchEvent(new CustomEvent("flowbit:open-tab", { detail: tab }));
  };
  const isPendingHref = (href: string) =>
    Boolean(pendingHref && toRoutePath(pendingHref) === toRoutePath(href) && !routePathMatches(href, pathname));
  const handleNavigation = (href: string, tab: { id: string; label: string; href: string }) => {
    if (!routePathMatches(href, pathname)) {
      beginNavigation(href);
    }
    openTopbarTab(tab);
    onNavigate?.();
  };

  return (
    <aside className="flex h-full w-full flex-col overflow-hidden border-r border-border bg-sidebar px-5 py-5">
      <Link href="/" className="mb-6 flex items-center gap-3 px-1" onClick={() => handleNavigation("/", DASHBOARD_TAB)}>
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-foreground text-sm font-bold text-surface">
          F
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-foreground">Flowbit</p>
          <p className="text-xs font-medium text-muted">Task workspace</p>
        </div>
      </Link>
      <div className="mb-4 flex items-center gap-3 border-b border-border pb-4">
        <Avatar
          name={currentUser?.name ?? "User"}
          src={currentUser?.avatarUrl}
          className="h-9 w-9 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white ring-violet-200"
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{currentUser?.name ?? "Flowbit User"}</p>
          <p className="truncate text-xs text-muted">{currentUser?.email ?? "workspace"}</p>
        </div>
      </div>

      <nav className="min-h-0 flex-1 space-y-5 overflow-y-auto pr-1">
        <section>
          <div className="space-y-1">
            <Link
              href="/"
              className={navLinkClass(pathname === "/", isPendingHref("/"))}
              onClick={() => handleNavigation("/", DASHBOARD_TAB)}
            >
              <span className="flex items-center gap-3">
                <span className="grid h-5 w-5 place-items-center text-base text-muted">⌂</span>
                Dashboard
              </span>
            </Link>
            <Link
              href="/profile"
              className={navLinkClass(pathname === "/profile", isPendingHref("/profile"))}
              onClick={() => handleNavigation("/profile", { id: "profile", label: "Profile", href: "/profile" })}
            >
              <span className="flex items-center gap-3">
                <span className="grid h-5 w-5 place-items-center text-base text-muted">▱</span>
                Profile
              </span>
            </Link>
          </div>
        </section>

        <section className="border-t border-border pt-4">
          <div className="mb-2 flex items-center justify-between px-2">
            <p className="text-xs font-medium text-muted">Workspaces</p>
            <button
              type="button"
              className="grid h-6 w-6 place-items-center rounded-md text-base text-soft hover:bg-panel hover:text-foreground"
              aria-label="Create workspace"
              onClick={() => {
                onCreateWorkspace();
                onNavigate?.();
              }}
            >
              +
            </button>
          </div>
          <div className="space-y-1">
            <Link
              href="/"
              className={navLinkClass(pathname === "/", isPendingHref("/"))}
              onClick={() => handleNavigation("/", DASHBOARD_TAB)}
            >
              <span className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full border-2 border-blue-500" />
                All tasks
              </span>
            </Link>
            {projects.map((project) => (
              <Link
                key={`workspace-${project.id}`}
                href={`/projects/${project.id}`}
                className={navLinkClass(
                  pathname === `/projects/${project.id}`,
                  isPendingHref(`/projects/${project.id}`),
                )}
                onClick={() => {
                  handleNavigation(`/projects/${project.id}`, {
                    id: `project:${project.id}`,
                    label: project.name,
                    href: `/projects/${project.id}`,
                  });
                }}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="h-3 w-3 shrink-0 rounded-full border-2" style={{ borderColor: project.color }} />
                  <span className="truncate">{project.name}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      </nav>

      <section className="mt-6 border-t border-border pt-4">
        <p className="mb-2 px-2 text-xs font-medium text-muted">Settings</p>
        <div className="space-y-1">
          <Link
            href="/settings"
            className={navLinkClass(pathname === "/settings", isPendingHref("/settings"))}
            onClick={() => handleNavigation("/settings", { id: "settings", label: "Preferences", href: "/settings" })}
          >
            <span className="flex items-center gap-3">
              <span className="grid h-5 w-5 place-items-center text-base text-muted">⚙</span>
              Preferences
            </span>
          </Link>
        </div>
      </section>
    </aside>
  );
};
