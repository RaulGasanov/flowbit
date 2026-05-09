import { useTasksStore } from "@/entities/task/model/store";

export const useAddComment = () => {
  const addComment = useTasksStore((state) => state.addComment);
  return async (taskId: string, authorId: string, body: string) =>
    addComment(taskId, authorId, body);
};
