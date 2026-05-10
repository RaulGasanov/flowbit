import { cn } from "@/shared/lib/cn";

interface RouteLoadingIndicatorProps {
  active: boolean;
}

export const RouteLoadingIndicator = ({ active }: RouteLoadingIndicatorProps) => (
  <div
    aria-hidden={!active}
    className={cn(
      "pointer-events-none fixed inset-x-0 top-0 z-[100] h-1 overflow-hidden bg-accent/10 transition-opacity duration-150",
      active ? "opacity-100" : "opacity-0",
    )}
  >
    <span className="route-progress-bar block h-full w-1/2 rounded-r-full bg-accent shadow-[0_0_16px_rgb(var(--accent)/0.45)]" />
  </div>
);
