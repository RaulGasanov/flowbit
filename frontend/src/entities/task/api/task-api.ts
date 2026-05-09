import { getApiClient } from "@/shared/api/base";
import type {
  CreateCommentInput,
  CreateTaskInput,
  ReorderTaskInput,
  TaskQuery,
  UpdateTaskInput,
} from "@/shared/api/model/contracts";
import type { ID } from "@/shared/types/domain";

export const taskApi = {
  list: (query?: TaskQuery) => getApiClient().listTasks(query),
  getById: (id: ID) => getApiClient().getTaskById(id),
  create: (input: CreateTaskInput) => getApiClient().createTask(input),
  update: (id: ID, input: UpdateTaskInput) => getApiClient().updateTask(id, input),
  reorder: (id: ID, input: ReorderTaskInput) => getApiClient().reorderTask(id, input),
  remove: (id: ID) => getApiClient().deleteTask(id),
  listComments: (taskId: ID) => getApiClient().listTaskComments(taskId),
  createComment: (input: CreateCommentInput) => getApiClient().createTaskComment(input),
};
