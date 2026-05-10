"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import {
  closestCorners,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/shared/lib/cn";
import { TaskCard } from "@/entities/task/ui/task-card";
import type { Task, TaskStatus, User } from "@/shared/types/domain";

interface KanbanBoardProps {
  tasks: Task[];
  users: User[];
  canEdit: boolean;
  isLoading?: boolean;
  onOpenTask: (taskId: string) => void;
  onMoveTask: (taskId: string, status: TaskStatus, index: number) => void | Promise<void>;
}

const columns: Array<{ key: TaskStatus; label: string }> = [
  { key: "todo", label: "To Do" },
  { key: "in_progress", label: "In Progress" },
  { key: "done", label: "Done" },
];

const asColumnId = (status: TaskStatus): string => `column:${status}`;

const DroppableColumn = ({
  status,
  className,
  children,
}: {
  status: TaskStatus;
  className?: string;
  children: ReactNode;
}) => {
  const { setNodeRef, isOver } = useDroppable({ id: asColumnId(status) });
  return (
    <div
      ref={setNodeRef}
      className={cn("min-h-[220px] transition-colors", isOver && "rounded-lg bg-accent/10 ring-2 ring-accent/30", className)}
    >
      {children}
    </div>
  );
};

const SortableTaskCard = ({
  task,
  assignee,
  canEdit,
  onOpenTask,
}: {
  task: Task;
  assignee?: User;
  canEdit: boolean;
  onOpenTask: (taskId: string) => void;
}) => {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled: !canEdit,
    data: { status: task.status },
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(isDragging && "opacity-70")}
      {...attributes}
      {...listeners}
    >
      <TaskCard task={task} assignee={assignee} onOpen={onOpenTask} />
    </div>
  );
};

const ColumnSkeleton = () => (
  <div className="space-y-3">
    {[0, 1, 2].map((item) => (
      <div
        key={item}
        className="h-28 animate-pulse rounded-lg border border-border bg-surface-muted"
      />
    ))}
  </div>
);

export const KanbanBoard = ({
  tasks,
  users,
  canEdit,
  isLoading = false,
  onOpenTask,
  onMoveTask,
}: KanbanBoardProps) => {
  const [activeMobileColumn, setActiveMobileColumn] = useState<TaskStatus>("todo");
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const tasksByStatus = columns.reduce<Record<TaskStatus, Task[]>>(
    (acc, column) => {
      acc[column.key] = (isLoading ? [] : tasks)
        .filter((task) => task.status === column.key)
        .sort((a, b) => a.position - b.position);
      return acc;
    },
    { todo: [], in_progress: [], done: [] },
  );

  const handleDragEnd = (event: DragEndEvent) => {
    if (!canEdit || isLoading) {
      return;
    }

    const activeId = String(event.active.id);
    const overId = event.over?.id ? String(event.over.id) : undefined;
    if (!overId || activeId === overId) {
      return;
    }

    const activeTask = tasks.find((task) => task.id === activeId);
    if (!activeTask) {
      return;
    }

    const overTask = tasks.find((task) => task.id === overId);
    if (!overTask && !overId.startsWith("column:")) {
      return;
    }
    const destinationStatus = overTask
      ? overTask.status
      : (overId.replace("column:", "") as TaskStatus);
    const destinationTasks = tasksByStatus[destinationStatus];
    const destinationIndex = overTask
      ? destinationTasks.findIndex((task) => task.id === overTask.id)
      : destinationTasks.length;

    void Promise.resolve(onMoveTask(activeTask.id, destinationStatus, destinationIndex)).catch(() => {
      // Store-level rollback handles the visible state; avoid unhandled promise rejections from DnD.
    });
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
      <div className="sticky top-16 z-10 mb-3 grid grid-cols-3 gap-1 rounded-xl border border-border bg-surface/95 p-1 shadow-sm backdrop-blur lg:hidden">
        {columns.map((column) => {
          const active = activeMobileColumn === column.key;
          return (
            <button
              key={`mobile-${column.key}`}
              type="button"
              className={cn(
                "flex h-10 min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-muted transition",
                active && "bg-panel text-foreground shadow-sm",
              )}
              onClick={() => setActiveMobileColumn(column.key)}
            >
              <span className="truncate">{column.label}</span>
              <span
                className={cn(
                  "grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[10px] font-semibold text-white",
                  column.key === "todo" && "bg-violet-500",
                  column.key === "in_progress" && "bg-blue-500",
                  column.key === "done" && "bg-emerald-500",
                )}
              >
                {isLoading ? "…" : tasksByStatus[column.key].length}
              </span>
            </button>
          );
        })}
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        {columns.map((column) => (
          <section
            key={column.key}
            className={cn(
              "min-w-0 rounded-lg border border-border bg-panel",
              activeMobileColumn === column.key ? "block" : "hidden lg:block",
            )}
            aria-label={column.label}
            aria-busy={isLoading}
          >
            <header className="flex h-12 items-center justify-between rounded-t-lg bg-panel-muted px-4">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-semibold text-foreground">{column.label}</h3>
                <span
                  className={cn(
                    "grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-semibold text-white",
                    column.key === "todo" && "bg-violet-500",
                    column.key === "in_progress" && "bg-blue-500",
                    column.key === "done" && "bg-emerald-500",
                  )}
                >
                  {isLoading ? "…" : tasksByStatus[column.key].length}
                </span>
              </div>
            </header>
            <SortableContext
              items={tasksByStatus[column.key].map((task) => task.id)}
              strategy={verticalListSortingStrategy}
            >
              <DroppableColumn status={column.key} className="space-y-3 p-3">
                {isLoading ? (
                  <ColumnSkeleton />
                ) : tasksByStatus[column.key].length ? (
                  tasksByStatus[column.key].map((task) => (
                    <div key={task.id}>
                      <SortableTaskCard
                        task={task}
                        assignee={users.find((user) => user.id === task.assigneeId)}
                        canEdit={canEdit}
                        onOpenTask={onOpenTask}
                      />
                    </div>
                  ))
                ) : (
                  <div className="rounded-lg border border-dashed border-border px-4 py-5 text-sm text-muted">
                    No tasks in this column.
                  </div>
                )}
              </DroppableColumn>
            </SortableContext>
          </section>
        ))}
      </div>
    </DndContext>
  );
};
