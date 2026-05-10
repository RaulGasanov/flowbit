"use client";

import { create } from "zustand";
import { projectApi } from "@/entities/project/api/project-api";
import type { CreateProjectInput } from "@/shared/api/model/contracts";
import type { Project } from "@/shared/types/domain";

interface ProjectsState {
  projects: Project[];
  activeProjectId?: string;
  isLoading: boolean;
  error?: string;
  loadProjects: () => Promise<void>;
  createProject: (input: CreateProjectInput) => Promise<Project>;
  setActiveProject: (projectId: string) => void;
}

export const useProjectsStore = create<ProjectsState>((set, get) => ({
  projects: [],
  activeProjectId: undefined,
  isLoading: false,
  error: undefined,

  loadProjects: async () => {
    set({ isLoading: true, error: undefined });
    try {
      const projects = await projectApi.list();
      const currentActive = get().activeProjectId;
      const nextActive = projects.some((project) => project.id === currentActive)
        ? currentActive
        : projects[0]?.id;
      set({ projects, activeProjectId: nextActive, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load projects";
      set({ isLoading: false, error: message });
    }
  },

  setActiveProject: (projectId) => {
    set({ activeProjectId: projectId });
  },

  createProject: async (input) => {
    set({ error: undefined });
    try {
      const project = await projectApi.create(input);
      set((state) => ({
        projects: [...state.projects, project],
        activeProjectId: project.id,
      }));
      return project;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create workspace";
      set({ error: message });
      throw error;
    }
  },

}));
