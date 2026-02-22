import { type HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  shadow?: boolean;
}

export default function Card({
  className,
  style,
  shadow = true,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={`rounded-lg${className ? ` ${className}` : ""}`}
      style={{
        background: "var(--color-bg-1)",
        border: "1px solid var(--color-border)",
        ...(shadow && { boxShadow: "var(--shadow-card)" }),
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}
