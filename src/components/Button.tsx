import { forwardRef } from "react";

type ButtonVariant = "primary" | "secondary" | "tertiary";
type ButtonColor = "blue" | "green" | "orange" | "red";
type ButtonSize = "md" | "sm";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  color?: ButtonColor;
  size?: ButtonSize;
  fullWidth?: boolean;
}

const COLOR_MAP = {
  blue: "var(--arcoblue-6)",
  green: "var(--green-6)",
  orange: "var(--orange-6)",
  red: "var(--red-6)",
} as const;

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      color = "blue",
      size = "md",
      fullWidth,
      disabled,
      style,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyle: React.CSSProperties = {
      fontSize: size === "sm" ? "12px" : "14px",
      fontWeight: 500,
      borderRadius: size === "sm" ? "4px" : "8px",
      padding: size === "sm" ? "6px 12px" : "10px 16px",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.4 : 1,
      width: fullWidth ? "100%" : undefined,
    };

    let variantStyle: React.CSSProperties;

    switch (variant) {
      case "primary":
        variantStyle = {
          background: COLOR_MAP[color] || COLOR_MAP.blue,
          color: "#fff",
          border: "none",
        };
        break;
      case "secondary":
        variantStyle = {
          background: "var(--color-bg-1)",
          color: COLOR_MAP[color] || COLOR_MAP.blue,
          border: `1px solid ${COLOR_MAP[color] || COLOR_MAP.blue}`,
        };
        break;
      case "tertiary":
        variantStyle = {
          background: "var(--color-bg-1)",
          color: "var(--color-text-2)",
          border: "1px solid var(--color-border)",
        };
        break;
    }

    return (
      <button
        ref={ref}
        disabled={disabled}
        style={{ ...baseStyle, ...variantStyle, ...style }}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
export default Button;
