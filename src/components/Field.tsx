interface FieldProps {
  label: string;
  children: React.ReactNode;
  className?: string;
}

export default function Field({ label, children, className }: FieldProps) {
  return (
    <div className={className}>
      <p
        className="mb-2 text-xs font-medium"
        style={{ color: "var(--color-text-3)" }}
      >
        {label}
      </p>
      {children}
    </div>
  );
}
