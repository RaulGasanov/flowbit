"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/shared/lib/cn";
import { Avatar } from "@/shared/ui/avatar";
import { useCurrentUser } from "@/entities/user/model/store";
import type { Project } from "@/shared/types/domain";

interface SidebarProps {
  projects: Project[];
  onCreateWorkspace: () => void;
}

const navLinkClass = (active: boolean) =>
  cn(
    "group flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-muted transition",
    "hover:bg-panel-muted hover:text-foreground",
    active && "bg-panel text-foreground shadow-sm ring-1 ring-border",
  );

export const Sidebar = ({ projects, onCreateWorkspace }: SidebarProps) => {
  const pathname = usePathname();
  const currentUser = useCurrentUser();
  const openTopbarTab = (tab: { id: string; label: string; href: string }) => {
    window.dispatchEvent(new CustomEvent("flowbit:open-tab", { detail: tab }));
  };

  return (
    <aside className="flex w-full flex-col border-b border-border bg-sidebar px-5 py-5 md:h-full md:w-[260px] md:shrink-0 md:overflow-hidden md:border-b-0 md:border-r">
      <Link href="/" className="mb-6 flex items-center gap-3 px-1">
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

      <nav className="flex-1 space-y-5">
        <section>
          <div className="space-y-1">
            <Link
              href="/"
              className={navLinkClass(pathname === "/")}
              onClick={() => openTopbarTab({ id: "dashboard", label: "Dashboard", href: "/" })}
            >
              <span className="flex items-center gap-3">
                <span className="grid h-5 w-5 place-items-center text-base text-muted">⌂</span>
                Dashboard
              </span>
            </Link>
            <Link
              href="/profile"
              className={navLinkClass(pathname === "/profile")}
              onClick={() => openTopbarTab({ id: "profile", label: "Profile", href: "/profile" })}
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
              onClick={onCreateWorkspace}
            >
              +
            </button>
          </div>
          <div className="space-y-1">
            <Link
              href="/"
              className={navLinkClass(pathname === "/")}
              onClick={() => openTopbarTab({ id: "dashboard", label: "All tasks", href: "/" })}
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
                className={navLinkClass(pathname === `/projects/${project.id}`)}
                onClick={() =>
                  openTopbarTab({
                    id: `project:${project.id}`,
                    label: project.name,
                    href: `/projects/${project.id}`,
                  })
                }
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
            className={navLinkClass(pathname === "/settings")}
            onClick={() => openTopbarTab({ id: "settings", label: "Preferences", href: "/settings" })}
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
