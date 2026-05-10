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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 p-3 backdrop-blur-sm sm:items-center sm:p-4">
      <div
        className={cn(
          "flex max-h-[92dvh] w-full max-w-xl flex-col rounded-2xl border border-border/70 bg-surface p-4 shadow-2xl shadow-slate-950/15 sm:max-h-[88vh] sm:p-5",
          className,
        )}
      >
        <div className="mb-3 flex shrink-0 items-start justify-between gap-4 sm:mb-4">
          <h3 className="min-w-0 text-lg font-semibold leading-tight">{title}</h3>
          <button
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-xl leading-none text-muted transition hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            onClick={onClose}
            type="button"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="min-h-0 overflow-y-auto overscroll-contain pr-1">{children}</div>
      </div>
    </div>
  );
};
