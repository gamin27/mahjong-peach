"use client";

import {
  useRef,
  useLayoutEffect,
  type ReactNode,
  type CSSProperties,
} from "react";

interface TooltipProps {
  open: boolean;
  content: ReactNode;
  children: ReactNode;
  style?: CSSProperties;
}

export default function Tooltip({
  open,
  content,
  children,
  style,
}: TooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = tooltipRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const margin = 12;
    let offsetX = 0;

    if (rect.left < margin) {
      offsetX = margin - rect.left;
    } else if (rect.right > window.innerWidth - margin) {
      offsetX = window.innerWidth - margin - rect.right;
    }

    el.style.transform = `translateX(calc(-50% + ${offsetX}px))`;
    el.style.visibility = "visible";
  }, [open]);

  return (
    <div style={{ position: "relative", ...style }}>
      {children}
      {open && (
        <div
          ref={tooltipRef}
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: "50%",
            transform: "translateX(-50%)",
            visibility: "hidden",
            background: "var(--color-bg-1)",
            border: "1px solid var(--color-border)",
            borderRadius: "8px",
            padding: "8px 12px",
            boxShadow: "var(--shadow-popup)",
            whiteSpace: "nowrap",
            zIndex: 10,
          }}
        >
          {content}
        </div>
      )}
    </div>
  );
}
