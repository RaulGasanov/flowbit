import { useNotificationsStore } from "@/entities/notification/model/store";

export const useNotificationActions = () => {
  const markAsRead = useNotificationsStore((state) => state.markAsRead);
  const markAllAsRead = useNotificationsStore((state) => state.markAllAsRead);
  const setPanelOpen = useNotificationsStore((state) => state.setPanelOpen);
  return { markAsRead, markAllAsRead, setPanelOpen };
};
