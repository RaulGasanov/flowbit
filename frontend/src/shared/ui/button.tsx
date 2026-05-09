"use client";

import type { ButtonHTMLAttributes, PropsWithChildren } from "react";
import { cn } from "@/shared/lib/cn";

type ButtonVariant = "primary" | "secondary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variantClassMap: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-white hover:bg-accent/90 border-transparent shadow-sm shadow-accent/20",
  secondary:
    "bg-panel border-border/70 text-foreground hover:bg-panel-muted",
  ghost: "bg-transparent border-transparent text-muted hover:bg-panel-muted hover:text-foreground",
};

export const Button = ({
  variant = "primary",
  type = "button",
  className,
  children,
  ...props
}: PropsWithChildren<ButtonProps>) => (
  <button
    type={type}
    className={cn(
      "inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm font-medium transition-colors",
      "min-h-10 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-60",
      variantClassMap[variant],
      className,
    )}
    {...props}
  >
    {children}
  </button>
);
