import type { PropsWithChildren } from "react";
import { cn } from "@/shared/lib/cn";

interface BadgeProps {
  tone?: "neutral" | "success" | "warning" | "danger";
  className?: string;
}

const toneClassMap: Record<NonNullable<BadgeProps["tone"]>, string> = {
  neutral: "bg-panel-muted text-muted ring-border",
  success: "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-200 dark:ring-emerald-900",
  warning: "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-950/60 dark:text-amber-200 dark:ring-amber-900",
  danger: "bg-rose-50 text-rose-700 ring-rose-100 dark:bg-rose-950/60 dark:text-rose-200 dark:ring-rose-900",
};

export const Badge = ({ tone = "neutral", className, children }: PropsWithChildren<BadgeProps>) => (
  <span
    className={cn(
      "inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ring-1",
      toneClassMap[tone],
      className,
    )}
  >
    {children}
  </span>
);
