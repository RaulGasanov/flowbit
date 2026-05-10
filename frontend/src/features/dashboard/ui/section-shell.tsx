import type { ReactNode } from "react";

interface SectionShellProps {
  title: string;
  children: ReactNode;
  collapsed: boolean;
  onToggle: () => void;
}

export const SectionShell = ({ title, children, collapsed, onToggle }: SectionShellProps) => (
  <section className="overflow-hidden rounded-xl border border-border bg-panel">
    <header className="flex min-h-12 items-center justify-between rounded-lg bg-panel-muted px-4">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <button
        type="button"
        className="grid h-8 w-8 place-items-center rounded-md text-muted hover:bg-panel hover:text-foreground"
        aria-label={`${collapsed ? "Expand" : "Collapse"} ${title}`}
        onClick={onToggle}
      >
        <span
          aria-hidden="true"
          className={`h-2 w-2 border-b-2 border-r-2 border-current transition-transform ${
            collapsed ? "-rotate-45" : "rotate-45"
          }`}
        />
      </button>
    </header>
    {collapsed ? null : children}
  </section>
);
