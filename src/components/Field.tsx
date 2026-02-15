interface FieldBaseProps {
  label: string;
  className?: string;
}

interface FieldDefaultProps extends FieldBaseProps {
  variant?: "default";
  children: React.ReactNode;
  value?: never;
  valueColor?: never;
}

interface FieldSmallProps extends FieldBaseProps {
  variant: "small";
  value: React.ReactNode;
  valueColor?: string;
  children?: never;
}

type FieldProps = FieldDefaultProps | FieldSmallProps;

export default function Field(props: FieldProps) {
  const { label, className } = props;

  if (props.variant === "small") {
    return (
      <div className={className}>
        <p className="text-xs" style={{ color: "var(--color-text-3)" }}>
          {label}
        </p>
        <p
          className="text-sm font-semibold"
          style={{ color: props.valueColor ?? "var(--color-text-1)" }}
        >
          {props.value}
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      <p
        className="mb-2 text-left text-xs font-medium"
        style={{ color: "var(--color-text-3)" }}
      >
        {label}
      </p>
      {props.children}
    </div>
  );
}
