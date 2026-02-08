interface TabItem<T extends string | number = string | number> {
  key: T;
  label: string;
}

interface TabsProps<T extends string | number = string | number> {
  tabs: TabItem<T>[];
  activeKey: T;
  onChange: (key: T) => void;
  variant?: "underline" | "pill";
  /** underline のみ: 独立したカード風コンテナで囲む */
  contained?: boolean;
}

export default function Tabs<T extends string | number>({
  tabs,
  activeKey,
  onChange,
  variant = "underline",
  contained = false,
}: TabsProps<T>) {
  if (variant === "pill") {
    return (
      <div style={{ display: "flex", gap: "8px" }}>
        {tabs.map((tab) => {
          const active = tab.key === activeKey;
          return (
            <button
              key={String(tab.key)}
              onClick={() => onChange(tab.key)}
              className="rounded-full px-4 py-1.5 text-sm font-medium"
              style={{
                background: active ? "var(--arcoblue-6)" : "var(--color-bg-1)",
                color: active ? "#fff" : "var(--color-text-3)",
                border: `1px solid ${active ? "var(--arcoblue-6)" : "var(--color-border)"}`,
                cursor: "pointer",
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    );
  }

  const containerStyle: React.CSSProperties = contained
    ? {
        display: "flex",
        background: "var(--color-bg-1)",
        border: "1px solid var(--color-border)",
        overflow: "hidden",
      }
    : {
        display: "flex",
        borderBottom: "1px solid var(--color-border)",
      };

  return (
    <div className={contained ? "rounded-lg" : undefined} style={containerStyle}>
      {tabs.map((tab) => {
        const active = tab.key === activeKey;
        return (
          <button
            key={String(tab.key)}
            onClick={() => onChange(tab.key)}
            className="flex-1 py-2.5 text-sm font-medium"
            style={{
              color: active ? "var(--arcoblue-6)" : "var(--color-text-3)",
              borderBottom: active
                ? "2px solid var(--arcoblue-6)"
                : "2px solid transparent",
              background: "none",
              cursor: "pointer",
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
