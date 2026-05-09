import { useUserStore } from "@/entities/user/model/store";

export const useUpdateProfile = () => {
  const updateProfile = useUserStore((state) => state.updateProfile);
  return updateProfile;
};
