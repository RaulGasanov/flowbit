import type { User } from "@/shared/types/domain";

export type SettingsTab = "profile" | "account" | "notifications" | "appearance";

export const settingsTabs: Array<{ id: SettingsTab; label: string }> = [
  { id: "profile", label: "Profile settings" },
  { id: "account", label: "Account settings" },
  { id: "notifications", label: "Notifications settings" },
  { id: "appearance", label: "Appearance settings" },
];

export const accentOptions: Array<{
  value: User["settings"]["accentColor"];
  label: string;
  swatchClassName: string;
}> = [
  { value: "sky", label: "Sky", swatchClassName: "bg-sky-500" },
  { value: "emerald", label: "Emerald", swatchClassName: "bg-emerald-500" },
  { value: "rose", label: "Rose", swatchClassName: "bg-rose-500" },
];
