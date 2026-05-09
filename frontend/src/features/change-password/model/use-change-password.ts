import { useUserStore } from "@/entities/user/model/store";

export const useChangePassword = () => {
  const changePassword = useUserStore((state) => state.changePassword);
  return async (currentPassword: string, newPassword: string) =>
    changePassword(currentPassword, newPassword);
};
