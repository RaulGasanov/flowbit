import { useState } from "react";
import { Badge } from "@/shared/ui/badge";
import { Avatar } from "@/shared/ui/avatar";
import { Button } from "@/shared/ui/button";
import type { Task, TaskComment, User } from "@/shared/types/domain";

interface TaskDetailsProps {
  task: Task;
  assignee?: User;
  comments: TaskComment[];
  users: User[];
  canComment: boolean;
  canDelete: boolean;
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
  canDelete,
  onAddComment,
  onDeleteTask,
}: TaskDetailsProps) => {
  const [commentBody, setCommentBody] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string>();
  const createdAt = new Date(task.createdAt).toLocaleString();
  const updatedAt = new Date(task.updatedAt).toLocaleString();
  const deadline = task.deadline ? new Date(task.deadline) : undefined;

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
            tone={deadline < new Date() && task.status !== "done" ? "danger" : "neutral"}
          >
            Due {deadline.toLocaleDateString()}
          </Badge>
        ) : null}
      </div>

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

      <section className="rounded-2xl border border-border/70 bg-panel p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h4 className="text-sm font-semibold">Comments</h4>
          <span className="rounded-full bg-surface-muted px-2.5 py-1 text-xs font-medium text-muted">
            {comments.length}
          </span>
        </div>
        {error ? (
          <p className="mb-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:bg-rose-950/60 dark:text-rose-200">
            {error}
          </p>
        ) : null}
        <div className="space-y-2">
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
            className="min-h-11 flex-1 rounded-xl border border-border bg-surface-muted px-3 py-2 text-sm outline-none transition placeholder:text-soft focus:border-accent/50 focus:bg-panel focus:ring-2 focus:ring-accent/15 disabled:cursor-not-allowed disabled:opacity-60"
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
