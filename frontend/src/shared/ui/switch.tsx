interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label: string;
}

export const Switch = ({ checked, onChange, disabled, label }: SwitchProps) => (
  <label className="flex min-h-14 cursor-pointer items-center justify-between gap-4 rounded-md border border-border bg-panel px-4 py-3">
    <span className="text-sm font-medium text-foreground">{label}</span>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 disabled:cursor-not-allowed disabled:opacity-60 ${
        checked ? "bg-accent" : "bg-panel-muted ring-1 ring-border"
      }`}
    >
      <span
        className={`absolute left-[3px] top-[3px] h-[22px] w-[22px] rounded-full bg-surface shadow-sm ring-1 ring-black/5 transition-transform duration-200 ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  </label>
);
