interface SectionTabsProps {
  active: string;
  items: string[];
  onChange: (item: string) => void;
  onNew?: () => void;
  onFilter?: () => void;
  filterActive?: boolean;
  onSort?: () => void;
  sortLabel?: string;
}

export const SectionTabs = ({
  active,
  items,
  onChange,
  onNew,
  onFilter,
  filterActive,
  onSort,
  sortLabel,
}: SectionTabsProps) => (
  <div className="flex min-h-12 flex-wrap items-center justify-between gap-3 border-b border-border px-4">
    <nav className="flex items-center gap-6 text-[13px] font-medium text-soft">
      {items.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onChange(item)}
          className={item === active ? "border-b-2 border-accent py-4 text-accent" : "py-4 hover:text-foreground"}
        >
          {item}
        </button>
      ))}
      {onNew ? (
        <button
          type="button"
          className="py-4 text-lg leading-none text-muted hover:text-foreground"
          aria-label="Add view"
          onClick={onNew}
        >
          +
        </button>
      ) : null}
    </nav>
    {onFilter || onSort ? (
      <div className="flex items-center gap-4 text-[13px] font-medium text-muted">
        {onFilter ? (
          <button
            type="button"
            className={filterActive ? "text-accent" : "hover:text-foreground"}
            onClick={onFilter}
          >
            Filter
          </button>
        ) : null}
        {onSort ? (
          <button type="button" className="hover:text-foreground" onClick={onSort}>
            {sortLabel ?? "Sort"}
          </button>
        ) : null}
      </div>
    ) : null}
  </div>
);
