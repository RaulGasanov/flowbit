import type { InputHTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";
import { formFieldFocusClassName } from "@/shared/lib/form-field";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = ({ className, ...props }: InputProps) => (
  <input
    className={cn(
      "w-full rounded-xl border bg-surface px-3 py-2.5 text-sm text-foreground",
      formFieldFocusClassName,
      className,
    )}
    {...props}
  />
);
