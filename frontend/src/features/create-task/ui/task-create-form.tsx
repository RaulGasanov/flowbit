"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Select } from "@/shared/ui/select";
import type { TaskPriority, TaskStatus, User } from "@/shared/types/domain";

interface TaskCreateFormProps {
  projectId?: string;
  projects?: Array<{ id: string; name: string }>;
  users: User[];
  disabled: boolean;
  initialStatus?: TaskStatus;
  onCreate: (input: {
    projectId: string;
    title: string;
    description: string;
    status?: TaskStatus;
    priority: TaskPriority;
    assigneeId?: string;
    deadline?: string;
  }) => Promise<void>;
}

export const TaskCreateForm = ({
  projectId,
  projects = [],
  users,
  disabled,
  initialStatus = "todo",
  onCreate,
}: TaskCreateFormProps) => {
  const [selectedProjectId, setSelectedProjectId] = useState(projectId ?? projects[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>(initialStatus);
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [deadline, setDeadline] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>();
  const [workspaceError, setWorkspaceError] = useState<string>();

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim()) {
      return;
    }
    if (!selectedProjectId) {
      setWorkspaceError("Choose a workspace");
      return;
    }
    setIsSubmitting(true);
    setError(undefined);
    setWorkspaceError(undefined);
    try {
      await onCreate({
        projectId: selectedProjectId,
        title: title.trim(),
        description: description.trim(),
        status,
        priority,
        assigneeId: assigneeId || undefined,
        deadline: deadline ? new Date(deadline).toISOString() : undefined,
      });
      setTitle("");
      setDescription("");
      setStatus(initialStatus);
      setPriority("medium");
      setAssigneeId("");
      setDeadline("");
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to create task");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <label className="grid gap-1 text-sm font-medium text-muted">
        Task title
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Write a clear task title"
          disabled={disabled}
        />
      </label>

      <label className="grid gap-1 text-sm font-medium text-muted">
        Description
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Add context, acceptance criteria, links"
          className="min-h-28 w-full resize-none rounded-xl border border-border/70 bg-surface px-3 py-2.5 text-sm text-foreground outline-none ring-accent/40 transition placeholder:text-soft focus:border-accent/50 focus:ring-2 disabled:opacity-60"
          disabled={disabled}
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-medium text-muted">
          Status
          <Select
            value={status}
            onChange={(event) => setStatus(event.target.value as TaskStatus)}
            className="border-border/70 bg-surface"
            disabled={disabled}
          >
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="done">Done</option>
          </Select>
        </label>

        <label className="grid gap-1 text-sm font-medium text-muted">
          Priority
          <Select
            value={priority}
            onChange={(event) => setPriority(event.target.value as TaskPriority)}
            className="border-border/70 bg-surface"
            disabled={disabled}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </Select>
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-medium text-muted">
          Assignee
          <Select
            value={assigneeId}
            onChange={(event) => setAssigneeId(event.target.value)}
            className="border-border/70 bg-surface"
            disabled={disabled}
          >
            <option value="">Unassigned</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </Select>
        </label>

        <label className="grid gap-1 text-sm font-medium text-muted">
          Due date
          <Input
            value={deadline}
            onChange={(event) => setDeadline(event.target.value)}
            type="date"
            disabled={disabled}
          />
        </label>
      </div>

      {error ? <p className="text-sm text-rose-500">{error}</p> : null}
      {!projectId ? (
        <label className="grid gap-1 text-sm font-medium text-muted">
          Workspace
          <Select
            value={selectedProjectId}
            onChange={(event) => {
              setSelectedProjectId(event.target.value);
              setWorkspaceError(undefined);
            }}
            className="border-border/70 bg-surface"
            disabled={disabled}
          >
            <option value="">Choose workspace</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </Select>
          {workspaceError ? <span className="text-sm font-normal text-rose-500">{workspaceError}</span> : null}
        </label>
      ) : null}
      <Button type="submit" variant="primary" disabled={disabled || isSubmitting} className="w-full">
        {isSubmitting ? "Adding..." : "Add Task"}
      </Button>
    </form>
  );
};
