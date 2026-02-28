"use client";

import { useEffect, useRef, useState } from "react";

interface DropdownMenuItem {
  label: string;
  onClick: () => void;
  color?: string;
  separator?: boolean;
}

interface DropdownMenuProps {
  trigger: React.ReactNode;
  items: DropdownMenuItem[];
  /**
   * メニューの表示位置
   * "top-right"    = トリガーの上・右寄せ（フッターナビ向け）
   * "top-left"     = トリガーの上・左寄せ
   * "bottom-right" = トリガーの下・右寄せ
   * "bottom-left"  = トリガーの下・左寄せ
   */
  placement?: "top-right" | "top-left" | "bottom-right" | "bottom-left";
  minWidth?: string;
}

export default function DropdownMenu({
  trigger,
  items,
  placement = "bottom-right",
  minWidth = "160px",
}: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClick);
    }
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const isAbove = placement.startsWith("top");
  const isRight = placement.endsWith("right");

  const menuPositionStyle: React.CSSProperties = {
    position: "absolute",
    ...(isAbove ? { bottom: "calc(100% + 8px)" } : { top: "calc(100% + 8px)" }),
    ...(isRight ? { right: 0 } : { left: 0 }),
  };

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          lineHeight: 1,
          padding: 0,
          background: "none",
          border: "none",
          cursor: "pointer",
        }}
      >
        {trigger}
      </button>
      {open && (
        <div
          style={{
            ...menuPositionStyle,
            background: "var(--color-bg-1)",
            border: "1px solid var(--color-border)",
            borderRadius: "8px",
            boxShadow: "var(--shadow-popup)",
            minWidth,
            overflow: "hidden",
            zIndex: 100,
          }}
        >
          {items.map((item, index) => (
            <button
              key={index}
              onClick={() => {
                setOpen(false);
                item.onClick();
              }}
              style={{
                display: "block",
                width: "100%",
                padding: "12px 16px",
                fontSize: "14px",
                color: item.color ?? "var(--color-text-1)",
                background: "none",
                border: "none",
                borderBottom: item.separator
                  ? "1px solid var(--color-border)"
                  : "none",
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
