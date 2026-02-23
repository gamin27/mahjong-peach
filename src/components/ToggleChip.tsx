interface ToggleChipProps {
  label: string;
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
}

export default function ToggleChip({
  label,
  selected,
  disabled,
  onClick,
}: ToggleChipProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className="rounded-full px-3 py-1.5 text-xs font-medium"
      style={{
        background: selected ? "var(--arcoblue-1)" : "var(--color-bg-1)",
        color: selected
          ? "var(--arcoblue-6)"
          : disabled
            ? "var(--color-text-4)"
            : "var(--color-text-3)",
        border: `1px solid ${selected ? "var(--arcoblue-6)" : "var(--color-border)"}`,
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {label}
    </button>
  );
}
