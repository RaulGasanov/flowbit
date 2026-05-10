"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Modal } from "@/shared/ui/modal";
import { Switch } from "@/shared/ui/switch";
import { Avatar } from "@/shared/ui/avatar";
import { Toast } from "@/shared/ui/toast";
import type { User } from "@/shared/types/domain";
import { useUpdateProfile } from "@/features/update-profile/model/use-update-profile";
import { useUploadAvatar } from "@/features/upload-avatar/model/use-upload-avatar";
import { useChangePassword } from "@/features/change-password/model/use-change-password";
import { useUpdateNotifications } from "@/features/update-notifications/model/use-update-notifications";
import { useToggleTheme } from "@/features/toggle-theme/model/use-toggle-theme";
import { useUserStore } from "@/entities/user/model/store";
import { useAuthStore } from "@/entities/auth/model/store";
import { SettingsNav } from "@/widgets/settings-form/ui/settings-nav";
import { AppearanceSection } from "@/widgets/settings-form/ui/appearance-section";
import type { SettingsTab } from "@/widgets/settings-form/model/settings-options";

interface SettingsFormProps {
  user: User;
}

export const SettingsForm = ({ user }: SettingsFormProps) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [bio, setBio] = useState(user.bio);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [loading, setLoading] = useState<string>();
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState<string>();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const updateProfile = useUpdateProfile();
  const uploadAvatar = useUploadAvatar();
  const changePassword = useChangePassword();
  const updateNotifications = useUpdateNotifications();
  const toggleTheme = useToggleTheme();
  const updateSettings = useUserStore((state) => state.updateSettings);
  const deleteCurrentAccount = useUserStore((state) => state.deleteCurrentAccount);
  const logout = useAuthStore((state) => state.logout);

  const emailValid = useMemo(() => /\S+@\S+\.\S+/.test(email), [email]);
  const toast = useMemo<{ tone: "success" | "error"; message: string } | null>(
    () => (error ? { tone: "error", message: error } : success ? { tone: "success", message: success } : null),
    [error, success],
  );

  useEffect(() => {
    if (!toast) {
      return;
    }
    const timeout = window.setTimeout(() => {
      setError(undefined);
      setSuccess(undefined);
    }, 3200);
    return () => {
      window.clearTimeout(timeout);
    };
  }, [toast]);

  const closeToast = () => {
    setError(undefined);
    setSuccess(undefined);
  };

  const onAvatarFileChange = async (file?: File) => {
    if (!file) {
      return;
    }
    setError(undefined);
    setSuccess(undefined);
    setLoading("avatar");
    try {
      await uploadAvatar(file);
      setSuccess("Saved successfully");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Unable to upload avatar");
    } finally {
      setLoading(undefined);
      if (avatarInputRef.current) {
        avatarInputRef.current.value = "";
      }
    }
  };

  const saveNotification = async (patch: Partial<User["settings"]["notifications"]>) => {
    setError(undefined);
    setSuccess(undefined);
    try {
      await updateNotifications(user.settings, patch);
      setSuccess("Saved successfully");
    } catch {
      setError("Unable to update notifications");
    }
  };

  const onSaveProfile = async () => {
    setError(undefined);
    setSuccess(undefined);
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    if (!emailValid) {
      setError("Enter a valid email");
      return;
    }
    setLoading("profile");
    try {
      await updateProfile({ name: name.trim(), email: email.trim(), bio: bio.trim() });
      setSuccess("Saved successfully");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save profile");
    } finally {
      setLoading(undefined);
    }
  };

  const onSavePassword = async () => {
    setError(undefined);
    setSuccess(undefined);
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading("password");
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccess("Saved successfully");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to change password");
    } finally {
      setLoading(undefined);
    }
  };

  const saveTheme = async (theme: User["settings"]["theme"]) => {
    setError(undefined);
    setSuccess(undefined);
    try {
      await toggleTheme(theme);
      setSuccess("Saved successfully");
    } catch (themeError) {
      setError(themeError instanceof Error ? themeError.message : "Unable to update theme");
    }
  };

  const saveAccentColor = async (accentColor: User["settings"]["accentColor"]) => {
    setError(undefined);
    setSuccess(undefined);
    try {
      await updateSettings({ ...user.settings, accentColor });
      setSuccess("Saved successfully");
    } catch (appearanceError) {
      setError(appearanceError instanceof Error ? appearanceError.message : "Unable to update appearance");
    }
  };

  return (
    <>
      <Toast open={Boolean(toast)} tone={toast?.tone ?? "success"} message={toast?.message ?? ""} onClose={closeToast} />

      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        <SettingsNav activeTab={activeTab} onChange={setActiveTab} />

        <Card className="space-y-4">
          {activeTab === "profile" ? (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Profile settings</h2>
            <div className="flex items-center gap-3">
              <Avatar name={user.name} src={user.avatarUrl} className="h-14 w-14 text-base" />
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  void onAvatarFileChange(event.target.files?.[0]);
                }}
              />
              <Button
                variant="secondary"
                disabled={loading === "avatar"}
                onClick={() => avatarInputRef.current?.click()}
              >
                {loading === "avatar" ? "Uploading..." : "Change avatar"}
              </Button>
            </div>
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Full name" />
            <Input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" />
            <Input value={bio} onChange={(event) => setBio(event.target.value)} placeholder="Short bio" />
            <Button onClick={onSaveProfile} disabled={loading === "profile"}>
              {loading === "profile" ? "Saving..." : "Save profile"}
            </Button>
          </section>
        ) : null}

        {activeTab === "account" ? (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Account settings</h2>
            <Input
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              type="password"
              placeholder="Current password"
            />
            <Input
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              type="password"
              placeholder="New password"
            />
            <Input
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              type="password"
              placeholder="Confirm new password"
            />
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={onSavePassword} disabled={loading === "password"}>
                {loading === "password" ? "Saving..." : "Change password"}
              </Button>
              <Button variant="secondary" className="text-rose-600" onClick={() => setDeleteModalOpen(true)}>
                Delete account
              </Button>
            </div>
          </section>
        ) : null}

        {activeTab === "notifications" ? (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Notifications settings</h2>
            <Switch
              checked={user.settings.notifications.comments}
              onChange={(checked) => saveNotification({ comments: checked })}
              label="Comments notifications"
            />
            <Switch
              checked={user.settings.notifications.taskUpdates}
              onChange={(checked) => saveNotification({ taskUpdates: checked })}
              label="Task updates"
            />
            <Switch
              checked={user.settings.notifications.deadlineReminders}
              onChange={(checked) => saveNotification({ deadlineReminders: checked })}
              label="Deadline reminders"
            />
            <Switch
              checked={user.settings.notifications.emailChannel}
              onChange={(checked) => saveNotification({ emailChannel: checked })}
              label="Email notifications"
            />
            <Switch
              checked={user.settings.notifications.inAppChannel}
              onChange={(checked) => saveNotification({ inAppChannel: checked })}
              label="In-app notifications"
            />
          </section>
        ) : null}

          {activeTab === "appearance" ? (
            <AppearanceSection
              settings={user.settings}
              onSaveTheme={(theme) => {
                void saveTheme(theme);
              }}
              onSaveAccentColor={(accentColor) => {
                void saveAccentColor(accentColor);
              }}
            />
          ) : null}
        </Card>
      </div>

      <Modal open={deleteModalOpen} title="Delete account" onClose={() => setDeleteModalOpen(false)}>
        <div className="space-y-3">
          <p className="text-sm text-foreground/80">
            This action is destructive. Type <code>DELETE</code> to confirm.
          </p>
          <Input value={deleteConfirm} onChange={(event) => setDeleteConfirm(event.target.value)} />
          <Button
            variant="secondary"
            className="w-full text-rose-600"
            disabled={deleteConfirm !== "DELETE"}
            onClick={async () => {
              setError(undefined);
              try {
                await deleteCurrentAccount();
                setDeleteModalOpen(false);
                logout();
              } catch (deleteError) {
                setError(deleteError instanceof Error ? deleteError.message : "Unable to delete account");
              }
            }}
          >
            Confirm delete
          </Button>
        </div>
      </Modal>
    </>
  );
};
