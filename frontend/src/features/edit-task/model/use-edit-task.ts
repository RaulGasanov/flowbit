import { useTasksStore } from "@/entities/task/model/store";
import type { UpdateTaskInput } from "@/shared/api/model/contracts";

export const useEditTask = () => {
  const updateTask = useTasksStore((state) => state.updateTask);
  return async (taskId: string, input: UpdateTaskInput) => updateTask(taskId, input);
};
