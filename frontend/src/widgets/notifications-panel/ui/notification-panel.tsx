"use client";

import { Button } from "@/shared/ui/button";
import type { Notification } from "@/shared/types/domain";

interface NotificationPanelProps {
  notifications: Notification[];
  onMarkAsRead: (notificationId: string) => void;
  onMarkAllAsRead: () => void;
}

export const NotificationPanel = ({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
}: NotificationPanelProps) => (
  <div
    className="absolute right-0 top-12 z-50 w-80 rounded-xl border border-border bg-surface p-3 shadow-xl"
    role="dialog"
    aria-label="Notifications"
  >
    <div className="mb-3 flex items-center justify-between">
      <h3 className="text-sm font-semibold">Notifications</h3>
      <Button variant="ghost" className="h-7 px-2 text-xs" onClick={onMarkAllAsRead}>
        Mark all as read
      </Button>
    </div>
    <div className="max-h-80 space-y-2 overflow-auto">
      {notifications.length ? (
        notifications.map((notification) => (
          <button
            key={notification.id}
            type="button"
            className="w-full rounded-lg border border-border p-2 text-left hover:bg-surface-muted"
            onClick={() => onMarkAsRead(notification.id)}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium">{notification.title}</p>
              {!notification.readAt ? (
                <span className="mt-1 inline-block h-2 w-2 rounded-full bg-accent" />
              ) : null}
            </div>
            <p className="mt-1 text-xs text-foreground/70">{notification.message}</p>
            <p className="mt-1 text-[11px] text-foreground/50">
              {new Date(notification.createdAt).toLocaleString()}
            </p>
          </button>
        ))
      ) : (
        <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-foreground/70">
          No notifications yet.
        </p>
      )}
    </div>
  </div>
);
