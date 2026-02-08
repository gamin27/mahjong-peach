import { forwardRef } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** コンパクト表示（ScoreEntry, GameResult用） */
  compact?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ compact, style, ...props }, ref) => {
    return (
      <input
        ref={ref}
        style={{
          width: compact ? undefined : "100%",
          padding: compact ? "4px 6px" : "10px 16px",
          fontSize: "16px",
          borderRadius: compact ? "4px" : "8px",
          border: "1px solid var(--color-border)",
          background: "var(--color-bg-2)",
          color: "var(--color-text-1)",
          outline: "none",
          boxSizing: "border-box",
          ...style,
        }}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";

export default Input;
