import { cn } from "@/shared/lib/cn";

interface LoadingSpinnerProps {
  className?: string;
}

export const LoadingSpinner = ({ className }: LoadingSpinnerProps) => (
  <span
    aria-hidden="true"
    className={cn(
      "inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent",
      className,
    )}
  />
);
