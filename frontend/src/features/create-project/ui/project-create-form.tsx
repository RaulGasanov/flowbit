"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import type { ProjectVisibility } from "@/shared/types/domain";

interface ProjectCreateFormProps {
  currentUserId?: string;
  onCreate: (input: {
    name: string;
    description: string;
    color: string;
    visibility: ProjectVisibility;
    memberIds?: string[];
  }) => Promise<void>;
}

const workspaceColors = ["#2563eb", "#10b981", "#f97316", "#e11d48", "#7c3aed"];

export const ProjectCreateForm = ({ currentUserId, onCreate }: ProjectCreateFormProps) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(workspaceColors[0]);
  const [visibility, setVisibility] = useState<ProjectVisibility>("team");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim()) {
      setError("Workspace name is required");
      return;
    }
    setIsSubmitting(true);
    setError(undefined);
    try {
      await onCreate({
        name: name.trim(),
        description: description.trim() || "Workspace for planning and tracking tasks.",
        color,
        visibility,
        memberIds: currentUserId ? [currentUserId] : undefined,
      });
      setName("");
      setDescription("");
      setColor(workspaceColors[0]);
      setVisibility("team");
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to create workspace");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div className="space-y-2">
        <label className="text-sm font-semibold text-foreground" htmlFor="workspace-name">
          Workspace name
        </label>
        <Input
          id="workspace-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Product roadmap"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold text-foreground" htmlFor="workspace-description">
          Description
        </label>
        <Input
          id="workspace-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="What this workspace is for"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-foreground">Color</p>
          <div className="flex flex-wrap gap-2">
            {workspaceColors.map((item) => (
              <button
                key={item}
                type="button"
                className="h-9 w-9 rounded-full border-2 transition"
                style={{ backgroundColor: item, borderColor: color === item ? "#0f172a" : "transparent" }}
                aria-label={`Use ${item} workspace color`}
                onClick={() => setColor(item)}
              />
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-foreground" htmlFor="workspace-visibility">
            Visibility
          </label>
          <select
            id="workspace-visibility"
            value={visibility}
            onChange={(event) => setVisibility(event.target.value as ProjectVisibility)}
            className="w-full rounded-xl border border-border/70 bg-surface px-3 py-2.5 text-sm outline-none ring-accent/40 transition focus:border-accent/50 focus:ring-2"
          >
            <option value="team">Team</option>
            <option value="private">Private</option>
            <option value="public">Public</option>
          </select>
        </div>
      </div>

      {error ? <p className="text-sm text-rose-500">{error}</p> : null}

      <Button type="submit" variant="primary" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Creating..." : "Create workspace"}
      </Button>
    </form>
  );
};
