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

type SettingsTab = "profile" | "account" | "notifications" | "appearance";

const tabs: Array<{ id: SettingsTab; label: string }> = [
  { id: "profile", label: "Profile settings" },
  { id: "account", label: "Account settings" },
  { id: "notifications", label: "Notifications settings" },
  { id: "appearance", label: "Appearance settings" },
];

interface SettingsFormProps {
  user: User;
}

export const SettingsForm = ({ user }: SettingsFormProps) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [bio, setBio] = useState(user.bio);
  const [role, setRole] = useState(user.role);
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
      await updateProfile({ name: name.trim(), email: email.trim(), bio: bio.trim(), role });
      setSuccess("Saved successfully");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save profile");
    } finally {
      setLoading(undefined);
    }
  };

  const onSaveRole = async () => {
    setError(undefined);
    setSuccess(undefined);
    setLoading("role");
    try {
      await updateProfile({ name: name.trim(), email: email.trim(), bio: bio.trim(), role });
      setSuccess("Role saved successfully");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save role");
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

  return (
    <>
      <Toast open={Boolean(toast)} tone={toast?.tone ?? "success"} message={toast?.message ?? ""} onClose={closeToast} />

      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        <Card className="h-fit p-2">
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`w-full rounded-md px-3 py-2 text-left text-sm ${
                  activeTab === tab.id ? "bg-surface-muted font-medium" : "text-foreground/70 hover:bg-surface-muted"
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </Card>

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
            <div className="rounded-md bg-surface-muted p-3 text-sm">
              <p className="font-medium">Role</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <select
                  value={role}
                  onChange={(event) => setRole(event.target.value as User["role"])}
                  className="rounded-md border border-border bg-surface px-2 py-1"
                >
                  <option value="admin">admin</option>
                  <option value="editor">editor</option>
                  <option value="viewer">viewer</option>
                </select>
                <Button
                  variant="secondary"
                  className="min-h-8 px-3 py-1 text-xs"
                  onClick={onSaveRole}
                  disabled={loading === "role" || role === user.role}
                >
                  {loading === "role" ? "Saving..." : "Save role"}
                </Button>
              </div>
            </div>
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
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Appearance settings</h2>
            <div className="grid gap-2 md:grid-cols-2">
              <Button
                variant={user.settings.theme === "light" ? "primary" : "secondary"}
                onClick={async () => {
                  setError(undefined);
                  setSuccess(undefined);
                  try {
                    await toggleTheme("light");
                    setSuccess("Saved successfully");
                  } catch (themeError) {
                    setError(themeError instanceof Error ? themeError.message : "Unable to update theme");
                  }
                }}
              >
                Light mode
              </Button>
              <Button
                variant={user.settings.theme === "dark" ? "primary" : "secondary"}
                onClick={async () => {
                  setError(undefined);
                  setSuccess(undefined);
                  try {
                    await toggleTheme("dark");
                    setSuccess("Saved successfully");
                  } catch (themeError) {
                    setError(themeError instanceof Error ? themeError.message : "Unable to update theme");
                  }
                }}
              >
                Dark mode
              </Button>
            </div>
            <label className="text-sm text-foreground/70">Theme color</label>
            <select
              value={user.settings.accentColor}
              onChange={async (event) => {
                setError(undefined);
                setSuccess(undefined);
                try {
                  await updateSettings({
                    ...user.settings,
                    accentColor: event.target.value as User["settings"]["accentColor"],
                  });
                  setSuccess("Saved successfully");
                } catch (appearanceError) {
                  setError(appearanceError instanceof Error ? appearanceError.message : "Unable to update appearance");
                }
              }}
              className="rounded-md border border-border bg-surface-muted px-2 py-2 text-sm"
            >
              <option value="sky">Sky</option>
              <option value="emerald">Emerald</option>
              <option value="rose">Rose</option>
            </select>
          </section>
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
