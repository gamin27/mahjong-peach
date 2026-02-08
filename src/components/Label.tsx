interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  children: React.ReactNode;
}

export default function Label({ children, style, ...props }: LabelProps) {
  return (
    <label
      style={{
        display: "block",
        fontSize: "14px",
        fontWeight: 500,
        color: "var(--color-text-1)",
        marginBottom: "6px",
        ...style,
      }}
      {...props}
    >
      {children}
    </label>
  );
}
