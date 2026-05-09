"use client";

import { useEffect } from "react";
import type { PropsWithChildren } from "react";
import { cn } from "@/shared/lib/cn";

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  className?: string;
}

export const Modal = ({
  open,
  title,
  onClose,
  className,
  children,
}: PropsWithChildren<ModalProps>) => {
  useEffect(() => {
    if (!open) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className={cn("w-full max-w-xl rounded-3xl border border-border/70 bg-surface p-5 shadow-2xl shadow-slate-950/15", className)}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button
            className="rounded-full px-3 py-1.5 text-sm text-foreground/70 hover:bg-surface-muted"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};
