import { useTasksStore } from "@/entities/task/model/store";
import type { TaskStatus } from "@/shared/types/domain";

export const useUpdateTaskStatus = () => {
  const updateTaskStatus = useTasksStore((state) => state.updateTaskStatus);
  return async (taskId: string, status: TaskStatus) => updateTaskStatus(taskId, status);
};
