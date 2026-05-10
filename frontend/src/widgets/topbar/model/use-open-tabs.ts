"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Project } from "@/shared/types/domain";
import { routePathMatches } from "@/shared/lib/navigation-path";
import { useNavigationLoadingStore } from "@/shared/model/navigation-loading";
import { DASHBOARD_TAB, mergeTab, readStoredTabs, TABS_STORAGE_PREFIX, writeStoredTabs } from "@/widgets/topbar/model/tabs";
import type { OpenTab } from "@/widgets/topbar/model/tabs";

interface UseOpenTabsInput {
  currentUserId?: string;
  projects: Project[];
  projectsLoading: boolean;
}

export const useOpenTabs = ({ currentUserId, projects, projectsLoading }: UseOpenTabsInput) => {
  const router = useRouter();
  const pathname = usePathname();
  const beginNavigation = useNavigationLoadingStore((state) => state.beginNavigation);
  const storageKey = `${TABS_STORAGE_PREFIX}:${currentUserId ?? "guest"}`;

  const currentTab = useMemo<OpenTab | null>(() => {
    if (pathname === "/") {
      return DASHBOARD_TAB;
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

  const displayedTabs = useMemo(
    () =>
      openTabs.flatMap((tab) => {
        const projectId = tab.id.startsWith("project:") ? tab.id.replace("project:", "") : undefined;
        if (!projectId) {
          return [tab];
        }
        const project = projects.find((item) => item.id === projectId);
        if (project) {
          return [{ ...tab, label: project.name }];
        }
        return projectsLoading ? [tab] : [];
      }),
    [openTabs, projects, projectsLoading],
  );

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
      if (!routePathMatches(fallback.href, pathname)) {
        beginNavigation(fallback.href);
      }
      router.push(fallback.href);
    }
  };

  const openTab = (tab: OpenTab) => {
    if (!routePathMatches(tab.href, pathname)) {
      beginNavigation(tab.href);
    }
    router.push(tab.href);
  };

  return { currentTab, displayedTabs, closeTab, openTab };
};
