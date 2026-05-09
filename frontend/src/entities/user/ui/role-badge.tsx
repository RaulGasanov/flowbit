import { Badge } from "@/shared/ui/badge";
import type { UserRole } from "@/shared/types/domain";

interface RoleBadgeProps {
  role: UserRole;
}

const roleTone: Record<UserRole, "neutral" | "success" | "warning"> = {
  admin: "warning",
  editor: "success",
  viewer: "neutral",
  guest: "neutral",
};

export const RoleBadge = ({ role }: RoleBadgeProps) => <Badge tone={roleTone[role]}>{role}</Badge>;
