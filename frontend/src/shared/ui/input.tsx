import type { InputHTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = ({ className, ...props }: InputProps) => (
  <input
    className={cn(
      "w-full rounded-xl border border-border/70 bg-surface px-3 py-2.5 text-sm outline-none ring-accent/40 transition focus:border-accent/50 focus:ring-2 disabled:opacity-60",
      className,
    )}
    {...props}
  />
);
