interface MainProps {
  children: React.ReactNode;
  /** max-w-md(448px) | max-w-lg(512px) | max-w-5xl(1024px) */
  maxWidth?: "md" | "lg" | "5xl";
  className?: string;
  style?: React.CSSProperties;
}

const MAX_W = {
  md: "max-w-md",
  lg: "max-w-lg",
  "5xl": "max-w-5xl",
} as const;

export default function Main({
  children,
  maxWidth = "lg",
  className = "",
  style,
}: MainProps) {
  return (
    <main
      className={`mx-auto flex w-full ${MAX_W[maxWidth]} flex-1 flex-col gap-6 px-6 py-6 ${className}`.trim()}
      style={style}
    >
      {children}
    </main>
  );
}
