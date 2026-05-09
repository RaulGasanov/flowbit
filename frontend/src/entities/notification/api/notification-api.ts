import { getApiClient } from "@/shared/api/base";
import type { ID } from "@/shared/types/domain";

export const notificationApi = {
  list: (userId: ID) => getApiClient().listNotifications(userId),
  markRead: (notificationId: ID) => getApiClient().markNotificationRead(notificationId),
  markAllRead: (userId: ID) => getApiClient().markAllNotificationsRead(userId),
  generate: (userId: ID) => getApiClient().generateNotification(userId),
};
