import { Badge } from "@/shared/ui/badge";
import type { ProjectVisibility } from "@/shared/types/domain";

interface VisibilityBadgeProps {
  visibility: ProjectVisibility;
}

const visibilityTone: Record<ProjectVisibility, "neutral" | "success" | "warning"> = {
  private: "warning",
  team: "success",
  public: "neutral",
};

export const VisibilityBadge = ({ visibility }: VisibilityBadgeProps) => (
  <Badge tone={visibilityTone[visibility]}>{visibility}</Badge>
);
