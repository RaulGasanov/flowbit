"use client";

import type { SelectHTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  wrapperClassName?: string;
}

export const Select = ({ className, wrapperClassName, children, ...props }: SelectProps) => (
  <span className={cn("relative block", wrapperClassName)}>
    <select
      className={cn(
        "h-10 w-full appearance-none rounded-xl border border-border bg-panel px-3 pr-9 text-sm text-foreground outline-none transition",
        "focus:border-accent/50 focus:ring-2 focus:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...props}
    >
      {children}
    </select>
    <span
      aria-hidden="true"
      className="pointer-events-none absolute right-3 top-1/2 h-2 w-2 -translate-y-[60%] rotate-45 border-b-2 border-r-2 border-muted"
    />
  </span>
);
