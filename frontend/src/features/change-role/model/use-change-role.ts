import { useUserStore } from "@/entities/user/model/store";

export const useChangeRole = () => {
  const setCurrentUser = useUserStore((state) => state.setCurrentUser);
  return (userId: string) => setCurrentUser(userId);
};
