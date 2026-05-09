import type { HTMLAttributes, PropsWithChildren } from "react";
import { cn } from "@/shared/lib/cn";

type CardProps = PropsWithChildren<HTMLAttributes<HTMLDivElement>>;

export const Card = ({ className, children, ...props }: CardProps) => (
  <div
    className={cn(
      "rounded-2xl border border-border/70 bg-panel p-4 shadow-[0_18px_50px_rgb(15_23_42/0.06)] backdrop-blur dark:shadow-none",
      className,
    )}
    {...props}
  >
    {children}
  </div>
);
