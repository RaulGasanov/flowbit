import { useTasksStore } from "@/entities/task/model/store";
import type { CreateTaskInput } from "@/shared/api/model/contracts";

export const useCreateTask = () => {
  const createTask = useTasksStore((state) => state.createTask);
  return async (input: CreateTaskInput) => createTask(input);
};
