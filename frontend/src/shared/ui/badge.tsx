import type { PropsWithChildren } from "react";
import { cn } from "@/shared/lib/cn";

interface BadgeProps {
  tone?: "neutral" | "success" | "warning" | "danger";
  className?: string;
}

const toneClassMap: Record<NonNullable<BadgeProps["tone"]>, string> = {
  neutral: "border-border bg-panel-muted text-muted",
  success:
    "border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200",
  warning:
    "border-amber-100 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-200",
  danger: "border-rose-100 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-200",
};

export const Badge = ({ tone = "neutral", className, children }: PropsWithChildren<BadgeProps>) => (
  <span
    className={cn(
      "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium leading-none capitalize",
      toneClassMap[tone],
      className,
    )}
  >
    {children}
  </span>
);
