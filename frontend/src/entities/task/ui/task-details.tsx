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
  low: "neutral",
  medium: "success",
  high: "warning",
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

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Badge tone={priorityToneMap[task.priority]}>{task.priority}</Badge>
        <Badge>{task.status.replace("_", " ")}</Badge>
        {task.deadline ? (
          <Badge
            tone={new Date(task.deadline) < new Date() && task.status !== "done" ? "danger" : "neutral"}
          >
            Due {new Date(task.deadline).toLocaleDateString()}
          </Badge>
        ) : null}
      </div>
      <p className="text-sm text-foreground/80">{task.description}</p>
      {assignee ? (
        <div className="flex items-center gap-2 rounded-md border border-border bg-surface-muted p-2">
          <Avatar name={assignee.name} src={assignee.avatarUrl} />
          <div className="text-sm">
            <p className="font-medium">{assignee.name}</p>
            <p className="text-xs text-foreground/70">{assignee.email}</p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-foreground/70">No assignee</p>
      )}

      <section>
        <h4 className="mb-2 text-sm font-semibold">Comments</h4>
        {error ? <p className="mb-2 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p> : null}
        <div className="space-y-2">
          {comments.length ? (
            comments.map((comment) => {
              const author = users.find((user) => user.id === comment.authorId);
              return (
                <div key={comment.id} className="rounded-md border border-border bg-surface-muted p-2">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-xs font-medium">{author?.name ?? "Unknown"}</span>
                    <span className="text-[11px] text-foreground/60">
                      {new Date(comment.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-foreground/80">{comment.body}</p>
                </div>
              );
            })
          ) : (
            <p className="rounded-md border border-dashed border-border p-3 text-sm text-foreground/70">
              No comments yet.
            </p>
          )}
        </div>
        <div className="mt-2 flex gap-2">
          <input
            value={commentBody}
            onChange={(event) => setCommentBody(event.target.value)}
            placeholder={canComment ? "Add a comment..." : "Viewer role cannot comment"}
            disabled={!canComment}
            className="flex-1 rounded-md border border-border bg-surface-muted px-3 py-2 text-sm"
          />
          <Button
            variant="secondary"
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

      <div className="text-xs text-foreground/70">
        <p>Created: {new Date(task.createdAt).toLocaleString()}</p>
        <p>Updated: {new Date(task.updatedAt).toLocaleString()}</p>
      </div>

      {canDelete ? (
        <Button
          variant="secondary"
          className="w-full text-rose-600"
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
