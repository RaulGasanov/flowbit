import { getApiClient } from "@/shared/api/base";
import type { ID } from "@/shared/types/domain";
import type { CreateProjectInput, UpdateProjectInput } from "@/shared/api/model/contracts";

export const projectApi = {
  list: () => getApiClient().listProjects(),
  getById: (id: ID) => getApiClient().getProjectById(id),
  create: (input: CreateProjectInput) => getApiClient().createProject(input),
  update: (id: ID, input: UpdateProjectInput) => getApiClient().updateProject(id, input),
};
