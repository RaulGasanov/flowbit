import { useTasksStore } from "@/entities/task/model/store";
import type { TaskStatus } from "@/shared/types/domain";

export const useMoveTask = () => {
  const moveTask = useTasksStore((state) => state.moveTask);
  return async (taskId: string, status: TaskStatus, index: number) =>
    moveTask(taskId, status, index);
};
