import { useUserStore } from "@/entities/user/model/store";
import type { ThemePreference } from "@/shared/types/domain";

export const useToggleTheme = () => {
  const updateTheme = useUserStore((state) => state.updateTheme);
  return async (theme: ThemePreference) => updateTheme(theme);
};
