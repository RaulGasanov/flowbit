"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card } from "@/shared/ui/card";
import { Modal } from "@/shared/ui/modal";
import { projectApi } from "@/entities/project/api/project-api";
import { TaskDetails } from "@/entities/task/ui/task-details";
import { KanbanBoard } from "@/widgets/board/ui/kanban-board";
import type { SharedWorkspace, Task } from "@/shared/types/domain";

export default function GuestWorkspacePage() {
  const params = useParams<{ token: string }>();
  const [workspace, setWorkspace] = useState<SharedWorkspace>();
  const [selectedTask, setSelectedTask] = useState<Task>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    const loadWorkspace = async () => {
      setIsLoading(true);
      setError(undefined);
      try {
        const response = await projectApi.getShared(params.token);
        setWorkspace(response);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Shared workspace not found");
      } finally {
        setIsLoading(false);
      }
    };

    void loadWorkspace();
  }, [params.token]);

  return (
    <main className="min-h-screen bg-surface px-4 py-6 text-foreground md:px-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <Card>
          {isLoading ? <p className="text-sm text-muted">Loading workspace...</p> : null}
          {error ? <p className="text-sm text-rose-500">{error}</p> : null}
          {workspace ? (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">Guest view</p>
                  <h1 className="mt-1 text-2xl font-semibold tracking-tight">{workspace.project.name}</h1>
                </div>
                <span className="rounded-full border border-border bg-panel-muted px-3 py-1 text-xs font-semibold text-muted">
                  read-only
                </span>
              </div>
              <p className="mt-2 text-sm text-muted">{workspace.project.description}</p>
            </div>
          ) : null}
        </Card>

        {workspace ? (
          <KanbanBoard
            tasks={workspace.tasks}
            users={workspace.users}
            canEdit={false}
            onOpenTask={(taskId) => setSelectedTask(workspace.tasks.find((task) => task.id === taskId))}
            onMoveTask={() => undefined}
          />
        ) : null}
      </div>

      <Modal open={Boolean(selectedTask)} title={selectedTask?.title ?? ""} onClose={() => setSelectedTask(undefined)}>
        {selectedTask && workspace ? (
          <TaskDetails
            task={selectedTask}
            assignee={workspace.users.find((user) => user.id === selectedTask.assigneeId)}
            comments={[]}
            users={workspace.users}
            canComment={false}
            canEdit={false}
            canDelete={false}
            onAddComment={async () => undefined}
            onDeleteTask={async () => undefined}
          />
        ) : null}
      </Modal>
    </main>
  );
}
