"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { AppShell } from "@/widgets/app-shell/ui/app-shell";
import { Card } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { useCurrentUser } from "@/entities/user/model/store";
import { useTasksStore } from "@/entities/task/model/store";
import { useNotificationsStore } from "@/entities/notification/model/store";
import { ProfileCard } from "@/widgets/profile-card/ui/profile-card";

export default function ProfilePage() {
  const user = useCurrentUser();
  const { tasks, commentsByTaskId, loadTasks, loadComments } = useTasksStore();
  const notifications = useNotificationsStore((state) => state.notifications);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  const assignedTasks = useMemo(
    () => tasks.filter((task) => task.assigneeId === user?.id).slice(0, 8),
    [tasks, user],
  );
  const recentTasks = useMemo(
    () => [...tasks].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5),
    [tasks],
  );

  useEffect(() => {
    assignedTasks.forEach((task) => {
      void loadComments(task.id).catch(() => undefined);
    });
  }, [assignedTasks, loadComments]);

  const recentComments = useMemo(
    () =>
      Object.values(commentsByTaskId)
        .flat()
        .filter((comment) => comment.authorId === user?.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 5),
    [commentsByTaskId, user],
  );

  if (!user) {
    return (
      <AppShell>
        <Card>
          <p className="text-sm text-foreground/70">No active user profile.</p>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <ProfileCard user={user} />

        <div className="space-y-4">
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Assigned tasks</h2>
              <Link href="/">
                <Button variant="ghost">Open board</Button>
              </Link>
            </div>
            <div className="space-y-2">
              {assignedTasks.length ? (
                assignedTasks.map((task) => (
                  <Link
                    href={`/tasks/${task.id}`}
                    key={task.id}
                    className="block rounded-md border border-border bg-surface-muted p-3 hover:bg-surface"
                  >
                    <p className="text-sm font-medium">{task.title}</p>
                    <p className="text-xs text-foreground/70">{task.status.replace("_", " ")}</p>
                  </Link>
                ))
              ) : (
                <p className="rounded-md border border-dashed border-border p-3 text-sm text-foreground/70">
                  No tasks assigned yet.
                </p>
              )}
            </div>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <h3 className="mb-2 text-base font-semibold">Recent tasks</h3>
              <div className="space-y-2">
                {recentTasks.map((task) => (
                  <div key={task.id} className="rounded-md bg-surface-muted p-2">
                    <p className="text-sm font-medium">{task.title}</p>
                    <p className="text-xs text-foreground/70">
                      Updated {new Date(task.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
            <Card>
              <h3 className="mb-2 text-base font-semibold">Recent updates</h3>
              <div className="space-y-2">
                {notifications.slice(0, 5).map((notification) => (
                  <div key={notification.id} className="rounded-md bg-surface-muted p-2">
                    <p className="text-sm font-medium">{notification.title}</p>
                    <p className="text-xs text-foreground/70">{notification.message}</p>
                  </div>
                ))}
              </div>
            </Card>
            <Card>
              <h3 className="mb-2 text-base font-semibold">Recent comments</h3>
              <div className="space-y-2">
                {recentComments.length ? (
                  recentComments.map((comment) => (
                    <div key={comment.id} className="rounded-md bg-surface-muted p-2">
                      <p className="text-sm">{comment.body}</p>
                      <p className="text-xs text-foreground/70">
                        {new Date(comment.createdAt).toLocaleString()}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-foreground/70">No recent comments.</p>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
