export const BoardSkeleton = () => (
  <div className="grid gap-4 md:grid-cols-3" aria-hidden>
    {[0, 1, 2].map((column) => (
      <div key={column} className="rounded-3xl border border-border/70 bg-panel p-3">
        <div className="mb-3 h-5 w-24 animate-pulse rounded-full bg-panel-muted" />
        <div className="space-y-3">
          {[0, 1, 2].map((card) => (
            <div
              key={card}
              className="h-24 animate-pulse rounded-2xl border border-border/70 bg-surface-muted"
            />
          ))}
        </div>
      </div>
    ))}
  </div>
);
