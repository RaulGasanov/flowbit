import { useProjectsStore } from "@/entities/project/model/store";
import type { ProjectVisibility } from "@/shared/types/domain";

export const useChangeBoardVisibility = () => {
  const updateVisibility = useProjectsStore((state) => state.updateVisibility);
  return async (projectId: string, visibility: ProjectVisibility) =>
    updateVisibility(projectId, visibility);
};
