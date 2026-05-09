"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AppShell } from "@/widgets/app-shell/ui/app-shell";
import { Card } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { useCurrentPermissions, useCurrentUser } from "@/entities/user/model/store";
import { taskApi } from "@/entities/task/api/task-api";
import { userApi } from "@/entities/user/api/user-api";
import { TaskDetails } from "@/entities/task/ui/task-details";
import type { Task, TaskComment, User } from "@/shared/types/domain";

export default function TaskPage() {
  const params = useParams<{ id: string }>();
  const taskId = params.id;

  const [task, setTask] = useState<Task | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  const currentUser = useCurrentUser();
  const permissions = useCurrentPermissions();

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(undefined);
      try {
        const [taskResponse, usersResponse] = await Promise.all([
          taskApi.getById(taskId),
          userApi.list(),
        ]);
        setTask(taskResponse);
        setUsers(usersResponse);
        if (taskResponse) {
          const commentsResponse = await taskApi.listComments(taskResponse.id);
          setComments(commentsResponse);
        }
      } catch (loadError) {
        const message = loadError instanceof Error ? loadError.message : "Failed to load task";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [taskId]);

  return (
    <AppShell>
      <Card className="mx-auto max-w-3xl">
        <Link href="/">
          <Button variant="ghost" className="mb-4">
            Back to dashboard
          </Button>
        </Link>
        {isLoading ? <p className="text-sm text-foreground/70">Loading task...</p> : null}
        {error ? <p className="text-sm text-rose-500">{error}</p> : null}
        {!isLoading && !task ? <p className="text-sm text-foreground/70">Task not found.</p> : null}
        {task ? (
          <TaskDetails
            task={task}
            assignee={users.find((user) => user.id === task.assigneeId)}
            comments={comments}
            users={users}
            canComment={permissions.canComment}
            canEdit={permissions.canEditTask}
            canDelete={permissions.canDeleteTask}
            onUpdateTask={async (input) => {
              const updated = await taskApi.update(task.id, input);
              setTask(updated);
            }}
            onAddComment={async (body) => {
              if (!currentUser) {
                return;
              }
              const comment = await taskApi.createComment({
                taskId: task.id,
                authorId: currentUser.id,
                body,
              });
              setComments((previous) => [comment, ...previous]);
            }}
            onDeleteTask={async () => {
              await taskApi.remove(task.id);
              setTask(null);
            }}
          />
        ) : null}
      </Card>
    </AppShell>
  );
}
