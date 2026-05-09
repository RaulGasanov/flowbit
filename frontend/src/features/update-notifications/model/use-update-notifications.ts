import { useUserStore } from "@/entities/user/model/store";
import type { UserSettings } from "@/shared/types/domain";

export const useUpdateNotifications = () => {
  const updateSettings = useUserStore((state) => state.updateSettings);
  return async (
    current: UserSettings,
    patch: Partial<UserSettings["notifications"]>,
  ) => {
    await updateSettings({
      ...current,
      notifications: { ...current.notifications, ...patch },
    });
  };
};
