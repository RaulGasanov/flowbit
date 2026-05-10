import { useEffect, useRef, useState } from "react";
import { Badge } from "@/shared/ui/badge";
import { Avatar } from "@/shared/ui/avatar";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Select } from "@/shared/ui/select";
import { cn } from "@/shared/lib/cn";
import { formFieldFocusClassName } from "@/shared/lib/form-field";
import { formatTaskDeadline, getDeadlineState } from "@/entities/task/lib/deadline";
import type { Task, TaskComment, TaskPriority, TaskStatus, User } from "@/shared/types/domain";

interface TaskDetailsProps {
  task: Task;
  assignee?: User;
  comments: TaskComment[];
  users: User[];
  canComment: boolean;
  canEdit: boolean;
  canDelete: boolean;
  showComments?: boolean;
  onUpdateTask?: (input: {
    title: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
    assigneeId?: string;
    deadline?: string;
  }) => Promise<void>;
  onAddComment: (body: string) => Promise<void>;
  onDeleteTask: () => Promise<void>;
}

const priorityToneMap = {
  low: "success",
  medium: "warning",
  high: "danger",
} as const;

export const TaskDetails = ({
  task,
  assignee,
  comments,
  users,
  canComment,
  canEdit,
  canDelete,
  showComments = true,
  onUpdateTask,
  onAddComment,
  onDeleteTask,
}: TaskDetailsProps) => {
  const [commentBody, setCommentBody] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDescription, setEditDescription] = useState(task.description);
  const [editStatus, setEditStatus] = useState<TaskStatus>(task.status);
  const [editPriority, setEditPriority] = useState<TaskPriority>(task.priority);
  const [editAssigneeId, setEditAssigneeId] = useState(task.assigneeId ?? "");
  const [editDeadline, setEditDeadline] = useState(task.deadline ? task.deadline.slice(0, 10) : "");
  const [isPosting, setIsPosting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState<string>();
  const commentsListRef = useRef<HTMLDivElement>(null);
  const createdAt = new Date(task.createdAt).toLocaleString();
  const updatedAt = new Date(task.updatedAt).toLocaleString();
  const deadline = task.deadline ? new Date(task.deadline) : undefined;
  const deadlineState = getDeadlineState(task);

  useEffect(() => {
    if (!showComments || isEditing || !commentsListRef.current) {
      return;
    }
    commentsListRef.current.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }, [comments.length, isEditing, showComments]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={priorityToneMap[task.priority]} className="px-3 py-1.5">
          {task.priority}
        </Badge>
        <Badge className="px-3 py-1.5">{task.status.replace("_", " ")}</Badge>
        {deadline ? (
          <Badge
            className="px-3 py-1.5"
            tone={deadlineState === "overdue" ? "danger" : deadlineState === "soon" ? "warning" : "neutral"}
          >
            {deadlineState === "soon" ? "🔥 " : ""}Due {formatTaskDeadline(task.deadline)}
          </Badge>
        ) : null}
      </div>

      {error ? (
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:bg-rose-950/60 dark:text-rose-200">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-200">
          {success}
        </p>
      ) : null}

      <div className="rounded-2xl border border-border/70 bg-surface-muted/70 p-4">
        <p className="text-sm leading-6 text-foreground/80">{task.description || "No description provided."}</p>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_220px]">
        <div className="rounded-2xl border border-border/70 bg-panel p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Assignee</p>
          {assignee ? (
            <div className="flex items-center gap-3">
              <Avatar name={assignee.name} src={assignee.avatarUrl} className="h-11 w-11" />
              <div className="min-w-0 text-sm">
                <p className="font-medium">{assignee.name}</p>
                <p className="truncate text-xs text-muted">{assignee.email}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted">No assignee</p>
          )}
          </div>

        <div className="rounded-2xl border border-border/70 bg-panel p-3 text-sm">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Activity</p>
          <div className="space-y-1.5 text-muted">
            <p>
              <span className="text-foreground">Created</span> {createdAt}
            </p>
            <p>
              <span className="text-foreground">Updated</span> {updatedAt}
            </p>
          </div>
        </div>
      </div>

      {canEdit && onUpdateTask ? (
        <section className="rounded-xl border border-border bg-panel">
          <div className="flex min-h-10 items-center justify-between gap-3 px-3">
            <h4 className="text-sm font-semibold">Edit</h4>
            <button
              type="button"
              className={
                isEditing
                  ? "inline-flex h-7 items-center gap-1.5 rounded-lg border border-border bg-panel-muted px-2.5 text-xs font-semibold text-muted transition hover:bg-surface hover:text-foreground"
                  : "inline-flex h-7 items-center gap-1.5 rounded-lg bg-accent px-2.5 text-xs font-semibold text-white shadow-sm shadow-accent/20 transition hover:bg-accent/90"
              }
              onClick={() => setIsEditing((value) => !value)}
            >
              <span aria-hidden="true" className="text-[11px] leading-none">
                {isEditing ? "×" : "✎"}
              </span>
              {isEditing ? "Close" : "Edit"}
            </button>
          </div>
          {isEditing ? (
            <form
              className="space-y-2.5 p-3"
              onSubmit={async (event) => {
                event.preventDefault();
                setError(undefined);
                setSuccess(undefined);
                if (!editTitle.trim()) {
                  setError("Task title is required");
                  return;
                }
                setIsSaving(true);
                try {
                  await onUpdateTask({
                    title: editTitle.trim(),
                    description: editDescription.trim(),
                    status: editStatus,
                    priority: editPriority,
                    assigneeId: editAssigneeId,
                    deadline: editDeadline ? new Date(editDeadline).toISOString() : "",
                  });
                  setSuccess("Task saved successfully");
                  setIsEditing(false);
                } catch (updateError) {
                  setError(updateError instanceof Error ? updateError.message : "Failed to update task");
                } finally {
                  setIsSaving(false);
                }
              }}
            >
              <Input
                value={editTitle}
                onChange={(event) => setEditTitle(event.target.value)}
                className="h-9 rounded-lg border-border bg-surface text-sm font-medium"
                placeholder="Task title"
              />

              <textarea
                value={editDescription}
                onChange={(event) => setEditDescription(event.target.value)}
                placeholder="Description"
                className={cn(
                  "min-h-14 w-full resize-none rounded-lg border px-3 py-2 text-sm text-foreground",
                  formFieldFocusClassName,
                )}
              />

              <div className="grid gap-2 sm:grid-cols-[1fr_1fr_1.2fr_1fr]">
                <label className="grid gap-1 text-[11px] font-medium uppercase tracking-wide text-muted">
                  Status
                  <Select
                    value={editStatus}
                    onChange={(event) => setEditStatus(event.target.value as TaskStatus)}
                    className="h-9 rounded-lg border-border bg-surface py-1 text-sm normal-case tracking-normal"
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="done">Done</option>
                  </Select>
                </label>
                <label className="grid gap-1 text-[11px] font-medium uppercase tracking-wide text-muted">
                  Priority
                  <Select
                    value={editPriority}
                    onChange={(event) => setEditPriority(event.target.value as TaskPriority)}
                    className="h-9 rounded-lg border-border bg-surface py-1 text-sm normal-case tracking-normal"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </Select>
                </label>
                <label className="grid gap-1 text-[11px] font-medium uppercase tracking-wide text-muted sm:col-span-1">
                  Assignee
                  <Select
                    value={editAssigneeId}
                    onChange={(event) => setEditAssigneeId(event.target.value)}
                    className="h-9 rounded-lg border-border bg-surface py-1 text-sm normal-case tracking-normal"
                  >
                    <option value="">Unassigned</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                  </Select>
                </label>
                <label className="grid gap-1 text-[11px] font-medium uppercase tracking-wide text-muted">
                  Due date
                  <Input
                    value={editDeadline}
                    onChange={(event) => setEditDeadline(event.target.value)}
                    type="date"
                    className="h-9 rounded-lg border-border bg-surface text-sm normal-case tracking-normal"
                  />
                </label>
              </div>

              <div className="flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  className="min-h-9 rounded-lg px-3 py-1 text-sm"
                  disabled={isSaving}
                  onClick={() => {
                    setEditTitle(task.title);
                    setEditDescription(task.description);
                    setEditStatus(task.status);
                    setEditPriority(task.priority);
                    setEditAssigneeId(task.assigneeId ?? "");
                    setEditDeadline(task.deadline ? task.deadline.slice(0, 10) : "");
                    setIsEditing(false);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" className="min-h-9 rounded-lg px-4 py-1 text-sm" disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save"}
                </Button>
              </div>
            </form>
          ) : null}
        </section>
      ) : null}

      {showComments && !isEditing ? (
        <section className="rounded-2xl border border-border/70 bg-panel p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h4 className="text-sm font-semibold">Comments</h4>
            <span className="rounded-full bg-surface-muted px-2.5 py-1 text-xs font-medium text-muted">
              {comments.length}
            </span>
          </div>
          <div ref={commentsListRef} className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {comments.length ? (
              comments.map((comment) => {
                const author = users.find((user) => user.id === comment.authorId);
                return (
                  <div key={comment.id} className="rounded-xl border border-border/70 bg-surface-muted/70 p-3">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-xs font-medium">{author?.name ?? "Unknown"}</span>
                      <span className="text-[11px] text-muted">
                        {new Date(comment.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-foreground/80">{comment.body}</p>
                  </div>
                );
              })
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-surface-muted/40 px-4 py-5 text-center text-sm text-muted">
                No comments yet.
              </div>
            )}
          </div>
          <div className="mt-3 flex gap-2">
            <input
              value={commentBody}
              onChange={(event) => setCommentBody(event.target.value)}
              placeholder={canComment ? "Add a comment..." : "Viewer role cannot comment"}
              disabled={!canComment}
              className={cn(
                "min-h-11 flex-1 rounded-xl border bg-surface-muted px-3 py-2 text-sm focus:bg-panel",
                formFieldFocusClassName,
              )}
            />
            <Button
              variant="secondary"
              className="min-h-11 rounded-xl px-4"
              disabled={!canComment || !commentBody.trim() || isPosting}
              onClick={async () => {
                setIsPosting(true);
                setError(undefined);
                try {
                  await onAddComment(commentBody);
                  setCommentBody("");
                } catch (commentError) {
                  setError(commentError instanceof Error ? commentError.message : "Failed to post comment");
                } finally {
                  setIsPosting(false);
                }
              }}
            >
              {isPosting ? "Posting..." : "Post"}
            </Button>
          </div>
        </section>
      ) : null}

      {canDelete ? (
        <Button
          variant="secondary"
          className="w-full border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900 dark:hover:bg-rose-950/50"
          disabled={isDeleting}
          onClick={async () => {
            setIsDeleting(true);
            setError(undefined);
            try {
              await onDeleteTask();
            } catch (deleteError) {
              setError(deleteError instanceof Error ? deleteError.message : "Failed to delete task");
            } finally {
              setIsDeleting(false);
            }
          }}
        >
          {isDeleting ? "Deleting..." : "Delete Task"}
        </Button>
      ) : null}
    </div>
  );
};
