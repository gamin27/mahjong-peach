import { type ButtonHTMLAttributes } from "react";

type BackButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export default function BackButton({
  children = "戻る",
  className,
  ...props
}: BackButtonProps) {
  return (
    <button
      className={`text-sm${className ? ` ${className}` : ""}`}
      style={{ color: "var(--color-text-3)" }}
      {...props}
    >
      ← {children}
    </button>
  );
}
