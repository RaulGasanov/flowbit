"use client";

import { createPortal } from "react-dom";

interface ToastProps {
  open: boolean;
  tone: "success" | "error";
  message: string;
  onClose: () => void;
}

const toneClassNames: Record<ToastProps["tone"], { icon: string; panel: string; text: string; symbol: string }> = {
  success: {
    icon: "bg-emerald-500 text-white",
    panel:
      "border-emerald-100 bg-emerald-50 shadow-emerald-950/10 dark:border-emerald-900/70 dark:bg-emerald-950/95",
    text: "text-emerald-800 dark:text-emerald-100",
    symbol: "✓",
  },
  error: {
    icon: "bg-rose-500 text-white",
    panel: "border-rose-100 bg-rose-50 shadow-rose-950/10 dark:border-rose-900/70 dark:bg-rose-950/95",
    text: "text-rose-800 dark:text-rose-100",
    symbol: "!",
  },
};

export const Toast = ({ open, tone, message, onClose }: ToastProps) => {
  if (!open || typeof document === "undefined") {
    return null;
  }

  const toneClasses = toneClassNames[tone];

  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 top-6 z-[80] flex justify-center px-4">
      <div
        role={tone === "error" ? "alert" : "status"}
        className={`toast-pop-in pointer-events-auto flex w-[min(calc(100vw-2rem),380px)] overflow-hidden rounded-xl border shadow-lg backdrop-blur ${toneClasses.panel}`}
      >
        <div className={`flex w-11 shrink-0 items-center justify-center text-lg font-semibold ${toneClasses.icon}`}>
          {toneClasses.symbol}
        </div>
        <div className="flex min-h-11 flex-1 items-center justify-between gap-3 px-3.5 py-2.5">
          <p className={`text-sm font-medium leading-snug ${toneClasses.text}`}>{message}</p>
          <button
            type="button"
            aria-label="Close notification"
            className={`shrink-0 rounded-md px-1 text-xl font-light leading-none opacity-55 transition hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current/30 ${toneClasses.text}`}
            onClick={onClose}
          >
            ×
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};
