interface ToggleProps {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}

export default function Toggle({ checked, onChange, label }: ToggleProps) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-[var(--color-textSecondary)]">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-1 ${
          checked ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-cardBorder)]'
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200 ${
            checked ? 'translate-x-[1.125rem]' : 'translate-x-0.5'
          }`}
        />
      </button>
      {label}
    </label>
  );
}
