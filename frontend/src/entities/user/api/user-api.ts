import { getApiClient } from "@/shared/api/base";
import type {
  ChangePasswordInput,
  UpdateUserProfileInput,
  UpdateUserRoleInput,
  UpdateUserSettingsInput,
  UploadAvatarInput,
} from "@/shared/api/model/contracts";
import type { ThemePreference } from "@/shared/types/domain";

export const userApi = {
  list: () => getApiClient().listUsers(),
  updateProfile: (userId: string, input: UpdateUserProfileInput) =>
    getApiClient().updateUserProfile(userId, input),
  updateRole: (input: UpdateUserRoleInput) => getApiClient().updateUserRole(input),
  updateSettings: (userId: string, input: UpdateUserSettingsInput) =>
    getApiClient().updateUserSettings(userId, input),
  uploadAvatar: (userId: string, input: UploadAvatarInput) =>
    getApiClient().uploadAvatar(userId, input),
  changePassword: (userId: string, input: ChangePasswordInput) =>
    getApiClient().changePassword(userId, input),
  deleteUser: (userId: string) => getApiClient().deleteUser(userId),
  updateTheme: (userId: string, theme: ThemePreference) =>
    getApiClient().updateUserTheme(userId, theme),
};
