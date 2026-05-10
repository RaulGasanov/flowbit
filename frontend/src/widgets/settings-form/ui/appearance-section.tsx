import { accentOptions } from "@/widgets/settings-form/model/settings-options";
import type { User } from "@/shared/types/domain";

interface AppearanceSectionProps {
  settings: User["settings"];
  onSaveTheme: (theme: User["settings"]["theme"]) => void;
  onSaveAccentColor: (accentColor: User["settings"]["accentColor"]) => void;
}

export const AppearanceSection = ({ settings, onSaveTheme, onSaveAccentColor }: AppearanceSectionProps) => (
  <section className="space-y-5">
    <div>
      <h2 className="text-lg font-semibold">Appearance settings</h2>
      <p className="mt-1 text-sm text-muted">Theme and accent preferences for your workspace.</p>
    </div>

    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">Theme</p>
      <div className="grid gap-2 rounded-2xl border border-border bg-surface-muted p-1.5 sm:grid-cols-2">
        {(["light", "dark"] as const).map((theme) => {
          const active = settings.theme === theme;
          return (
            <button
              key={theme}
              type="button"
              className={`min-h-12 rounded-xl px-4 text-sm font-semibold transition ${
                active ? "bg-accent text-white shadow-sm" : "text-muted hover:bg-panel hover:text-foreground"
              }`}
              onClick={() => {
                onSaveTheme(theme);
              }}
            >
              {theme === "light" ? "Light mode" : "Dark mode"}
            </button>
          );
        })}
      </div>
    </div>

    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">Accent color</p>
      <div className="flex flex-wrap gap-2">
        {accentOptions.map((option) => {
          const active = settings.accentColor === option.value;
          return (
            <button
              key={option.value}
              type="button"
              className={`flex min-h-10 items-center gap-2 rounded-xl border px-3 text-sm font-medium transition ${
                active
                  ? "border-accent bg-accent/10 text-foreground ring-2 ring-accent/15"
                  : "border-border bg-surface-muted text-muted hover:bg-panel hover:text-foreground"
              }`}
              onClick={() => {
                onSaveAccentColor(option.value);
              }}
            >
              <span className={`h-3 w-3 rounded-full ${option.swatchClassName}`} />
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  </section>
);
