export interface OpenTab {
  id: string;
  label: string;
  href: string;
}

export const TABS_STORAGE_PREFIX = "flowbit:open-tabs";
export const DASHBOARD_TAB: OpenTab = { id: "dashboard", label: "Dashboard", href: "/" };

const normalizeTab = (tab: OpenTab): OpenTab => {
  if (tab.id === DASHBOARD_TAB.id || tab.href === DASHBOARD_TAB.href) {
    return DASHBOARD_TAB;
  }
  return tab;
};

export const readStoredTabs = (storageKey: string): OpenTab[] => {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(storageKey) ?? "[]");
    return Array.isArray(parsed)
      ? parsed
          .filter(
            (tab): tab is OpenTab =>
              typeof tab?.id === "string" && typeof tab?.label === "string" && typeof tab?.href === "string",
          )
          .map(normalizeTab)
      : [];
  } catch {
    return [];
  }
};

export const writeStoredTabs = (storageKey: string, tabs: OpenTab[]) => {
  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(storageKey, JSON.stringify(tabs.map(normalizeTab)));
  }
};

export const mergeTab = (tabs: OpenTab[], tab: OpenTab) => {
  const normalizedTab = normalizeTab(tab);
  const normalizedTabs = tabs.map(normalizeTab);
  const existingIndex = normalizedTabs.findIndex((item) => item.id === normalizedTab.id);
  if (existingIndex >= 0) {
    return normalizedTabs.map((item) => (item.id === normalizedTab.id ? normalizedTab : item));
  }
  return [...normalizedTabs, normalizedTab];
};
