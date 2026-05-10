import { Card } from "@/shared/ui/card";
import { settingsTabs } from "@/widgets/settings-form/model/settings-options";
import type { SettingsTab } from "@/widgets/settings-form/model/settings-options";

interface SettingsNavProps {
  activeTab: SettingsTab;
  onChange: (tab: SettingsTab) => void;
}

export const SettingsNav = ({ activeTab, onChange }: SettingsNavProps) => (
  <Card className="h-fit p-2">
    <nav className="space-y-1">
      {settingsTabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`w-full rounded-md px-3 py-2 text-left text-sm ${
            activeTab === tab.id ? "bg-surface-muted font-medium" : "text-foreground/70 hover:bg-surface-muted"
          }`}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  </Card>
);
